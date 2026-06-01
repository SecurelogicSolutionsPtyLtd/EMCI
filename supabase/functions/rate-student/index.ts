import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Fixed, ordered category keys. The AI must return exactly these, in this order.
const CATEGORY_KEYS = [
  "engagement",
  "career_outcomes",
  "attendance_momentum",
  "growth_wellbeing",
] as const;

const FLAGS = [
  "wellbeing_concern",
  "attendance_risk",
  "disengaged",
  "stalled",
  "no_career_plan",
  "thriving",
] as const;

const SYSTEM_PROMPT = `You are a strict scoring engine for the EMCI (Enhanced My Career Insights) programme in Victoria, Australia. You GRADE a student against a fixed rubric — you do not give opinions, advice, or prose.

You are given a compact data packet about ONE student. Apply the rubric below EXACTLY and return JSON only. Use ONLY the provided data — never assume or invent. If a category has no supporting data in the packet, return null for that category's score.

Score four categories, each 0–100, by summing the listed points (cap each at 100):

ENGAGEMENT (sessions):
- Session volume: min(sessionCount, 4) / 4 × 60
- Intervention breadth: (distinct intervention areas among CAP, WEX prep, Morrisby, industry, work readiness) / 5 × 20
- Interview conducted: 20 if interviewed else 0

CAREER_OUTCOMES (CAP/WEX):
- Career Action Plan (CAP) present: 30 (use interventionAreas.cap)
- Work experience completed: 25 (use careerSignals.workExperienceCompleted)
- Work experience preparation in sessions: 10 (use interventionAreas.wexPrep)
- Morrisby profile available: 15 (use hasProfile)
- Part-time/casual job: 10 — award ONLY if the notes or surveys clearly state the student holds a PAID part-time, casual or weekend job. Do NOT infer this from a work-experience placement, volunteering, or an industry/library visit.
- Researching careers independently: 10 — award ONLY if the notes or surveys show the student actively researching or exploring careers on their own.
The "reason" must only state facts supported by the packet evidence; never claim a part-time job, work experience or CAP that the evidence does not support.

ATTENDANCE_MOMENTUM:
- Attendance: 0 absences=60, 1–2=45, 3–5=25, >5=10 (treat unexplained absences as the harsher end)
- Recency: daysSinceLastActivity ≤30=40, ≤60=30, ≤120=20, >120=10, unknown=0
- COMPLETION OVERRIDE: this applies ONLY when the packet field "programmeComplete" is exactly true. When programmeComplete is true, award full Recency (40) regardless of daysSinceLastActivity — inactivity after completing the programme is expected — and you may frame the reason as "completed". When programmeComplete is false, the student has NOT finished: score Recency normally from daysSinceLastActivity and NEVER describe the student as completed or finished. Do not infer completion from stageProgress, inactivity, or any other field.

GROWTH_WELLBEING (read the free-text notes & survey comments):
- Preparedness + interests/strengths shift start→end: up to 40 (improvement high, no change ~20, decline low)
- Helpfulness / positive programme sentiment: up to 30
- Wellbeing read of notes/comments: up to 30 (clear positive signals high; concern signals low)

Rules:
- "reason" is a terse ≤12-word justification, no student names, no PII.
- "flags" only from the allowed list, max 3, only when clearly evidenced.
- "confidence" reflects how much of the packet had real data (low/medium/high).
- Output must match the schema exactly. No extra text.`;

interface RatingPacket {
  stageProgress: number;
  programmeComplete: boolean;
  status: string;
  interviewed: boolean;
  hasProfile: boolean;
  yearLevel: number;
  sessionCount: number;
  interventionAreas: {
    cap: boolean; wexPrep: boolean; morrisby: boolean; industry: boolean; workReadiness: boolean;
  };
  insights: unknown;
  surveys: unknown;
  careerSignals: { workExperienceCompleted: boolean };
  daysSinceLastActivity: number | null;
  notesRedacted: string;
}

function buildUserPrompt(packet: RatingPacket): string {
  return [
    "Student data packet (apply the rubric to this and nothing else):",
    JSON.stringify(packet, null, 2),
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { packet?: RatingPacket };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.packet) {
    return new Response(JSON.stringify({ error: "Missing packet" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body.packet) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "emci_student_rating",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              categories: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string", enum: [...CATEGORY_KEYS] },
                    score: { type: ["integer", "null"] },
                    reason: { type: "string" },
                  },
                  required: ["key", "score", "reason"],
                },
              },
              flags: {
                type: "array",
                items: { type: "string", enum: [...FLAGS] },
              },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["categories", "flags", "confidence"],
          },
        },
      },
    }),
  });

  if (!openAiRes.ok) {
    const err = await openAiRes.text();
    return new Response(JSON.stringify({ error: `OpenAI error: ${err}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const json = await openAiRes.json();
  const raw: string = json.choices?.[0]?.message?.content ?? "";

  let rating: unknown = null;
  try {
    rating = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "Model returned invalid JSON" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ rating }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
