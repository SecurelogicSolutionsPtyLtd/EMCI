import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Fixed, ordered category keys. The AI must return exactly these, in this order.
const CATEGORY_KEYS = [
  "engagement",
  "career_outcomes",
  "work_readiness",
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

The packet's "sessionDetails" array is the per-session record of what actually happened: session length, intervention type, the intervention areas covered (Morrisby, Career Action Plan, industry engagement, work-experience preparation, work readiness, other), and — where the student gave feedback — their satisfaction with the session ("Session Satisfaction") and what they found useful ("Found Useful"). The packet's "timelineNotes" array and "notesRedacted" string contain redacted notes from timeline activity records. Read these to corroborate ENGAGEMENT breadth and, especially, to inform the GROWTH_WELLBEING helpfulness/sentiment/wellbeing read. They never override the deterministic flags (interventionAreas, careerSignals, hasProfile) — those remain authoritative for their point awards.

Score five categories, each 0–100, by summing the listed points (cap each at 100). Work-readiness signals are scored ONLY in WORK_READINESS so nothing is double-counted:

ENGAGEMENT (sessions):
- Session volume: min(sessionCount, 4) / 4 × 60
- Intervention breadth: (distinct intervention areas among CAP, WEX prep, Morrisby, industry, work readiness) / 5 × 20
- Interview conducted: 20 if interviewed else 0

CAREER_OUTCOMES (planning & exploration):
- Career Action Plan (CAP) present: 40 (use interventionAreas.cap)
- Morrisby profile available: 25 (use hasProfile)
- Researching careers independently: 20 — award ONLY if the notes or surveys show the student actively researching or exploring careers on their own.
- Career conversation / interview conducted: 15 (use interviewed)
The "reason" must only state facts supported by the packet evidence; never claim a CAP, Morrisby profile or career research that the evidence does not support.

WORK_READINESS (work experience & employability):
- Work experience completed (WEX): 40 (use careerSignals.workExperienceCompleted)
- Part-time/casual job: 25 — award ONLY if the notes or surveys clearly state the student holds a PAID part-time, casual or weekend job. Do NOT infer this from a work-experience placement, volunteering, or an industry/library visit.
- Work experience preparation in sessions: 20 (use interventionAreas.wexPrep)
- Work-readiness intervention in sessions: 15 (use interventionAreas.workReadiness)
The "reason" must only state facts supported by the packet evidence; never claim a part-time job or work experience that the evidence does not support. Fairness: if the student has had no work-experience opportunity yet (e.g. early Year 10) and no signal applies, return null for this category rather than a low score.

ATTENDANCE_MOMENTUM:
- Attendance only (score 0–100 from absence count in the packet): 0 absences=100, 1–2=75, 3–5=40, >5=15 (treat unexplained absences as the harsher end)

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
  sessionDetails: {
    date: string;
    title: string;
    interventionType?: string;
    sessionLength?: string;
    fields: Record<string, string>;
  }[];
  timelineNotes: {
    date: string;
    type: string;
    title: string;
    note: string;
  }[];
  careerSignals: { workExperienceCompleted: boolean };
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
