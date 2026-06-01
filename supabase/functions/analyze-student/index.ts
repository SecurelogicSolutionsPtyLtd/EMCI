import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Fixed allowlist of highlight icons. Must stay in sync with the frontend map
// in src/lib/analysisHighlights.ts.
const HIGHLIGHT_ICONS = [
  "briefcase", "graduation-cap", "target", "compass", "sparkles", "star",
  "music", "palette", "camera", "pen-tool", "mic", "gamepad",
  "dumbbell", "trophy", "utensils", "chef-hat", "coffee", "shopping-bag",
  "flame", "stethoscope", "heart-pulse", "laptop", "code", "cpu",
  "hammer", "wrench", "hard-hat", "paw-print", "flask", "microscope",
  "leaf", "sprout", "car", "truck", "plane", "banknote", "calculator",
  "scale", "scissors", "book-open", "baby", "newspaper",
] as const;

const SYSTEM_PROMPT = `You are a professional career counsellor working within the Enhanced My Career Insights (EMCI) program in Victoria, Australia.

EMCI supports Year 9 and 10 students from priority cohorts — Koorie students, students in out-of-home care, students engaged with Youth Justice, and students with disabilities who experience significant disadvantage. The program connects these students with additional career guidance supports and work-based learning opportunities through ACCE (Australian Centre for Career Education).

The program stages are:
1. Referral — student is referred into EMCI and initial engagement begins
2. Consent — parental/guardian consent obtained
3. Career Guidance — student is actively engaged in career consultations, Morrisby profiling, and work readiness activities
4. Complete — student has finished the EMCI programme

You must return a JSON object with two fields: "analysis" and "highlights".

"analysis" — a concise, professional analysis (4–6 sentences) of the student's current EMCI engagement for school-based career practitioners and ACCE consultants. Requirements:
- Refer to "the student" or "they" — never use the student's name.
- Reference the Quick Insight categories (Career Action Plan, Morrisby Unpack, Morrisby Profile, Work Experience, Absences) where they meaningfully inform the picture. Explicitly flag absences when the absences entry is flagged.
- When pilot survey data is provided for more than one stage (start / mid / end), describe how the student's responses shifted across those stages — focus on perceptions like preparedness, understanding of interests and strengths, programme helpfulness, work-experience exposure, and any change in focus.
- Be direct, positive where appropriate, and clearly flag any areas needing attention.
- Do not include sensitive personal information beyond what is provided.

"highlights" — an array of AT MOST 3 at-a-glance highlight chips that let a practitioner instantly recognise the student. Only include a highlight when it is clearly supported by the provided data (especially the pilot survey fields). Prefer these three categories, in priority order, and omit any that are unknown (return an empty array if none apply):
1. Career Interest — the job, industry, or aspiration the student is drawn to (e.g. "Firefighter", "Nursing", "Trades").
2. Strength — a talent, subject, or interest the student identifies with (e.g. "Music", "Sport", "Art").
3. Current Work — a part-time job or completed work experience (e.g. "KFC", "Retail", "Hospitality").
Rules for highlights:
- "label" is the short category name (e.g. "Career Interest", "Strength", "Current Work").
- "value" is a SHORT 1–3 word value. Never include names, addresses, or other sensitive identifiers.
- "icon" MUST be exactly one key from this allowlist, choosing the best visual fit: ${HIGHLIGHT_ICONS.join(", ")}.`;

interface StudentInput {
  stage:          string | null;
  stageProgress:  number;
  status:         string;
  absenceCount:   number;
  interviewed:    boolean;
  hasProfile:     boolean;
  studentType:    string;
  yearLevel:      number;
  yearLevelLabel?: string;
  counsellor?:    string;
  schoolName?:    string;
}

interface InsightsInput {
  careerActionPlan: { count: number; complete: boolean };
  morrisbyUnpack:   { count: number; complete: boolean };
  morrisbyProfile:  { yes: boolean };
  workExperience:   { yes: boolean };
  absences:         { count: number; flagged: boolean };
}

interface SurveyShiftInput {
  stage:  "start" | "mid" | "end";
  date:   string;
  title:  string;
  fields: Record<string, string>;
}

interface SessionDetailInput {
  date:             string;
  title:            string;
  interventionType?: string;
  sessionLength?:   string;
  fields:           Record<string, string>;
}

const STAGE_LABEL: Record<string, string> = {
  referral:        "Referral (Stage 1 of 4)",
  consent:         "Consent (Stage 2 of 4)",
  career_guidance: "Career Guidance (Stage 3 of 4)",
  complete:        "Complete (Stage 4 of 4)",
};

const STAGE_NAME: Record<SurveyShiftInput["stage"], string> = {
  start: "Start of programme (initial survey)",
  mid:   "Mid-programme survey",
  end:   "End-of-programme survey",
};

function formatInsights(i: InsightsInput): string {
  const lines = [
    `- Career Action Plan: ${i.careerActionPlan.count} session(s) — ${i.careerActionPlan.complete ? "Complete" : "Not yet complete"}`,
    `- Morrisby Unpack: ${i.morrisbyUnpack.count} session(s) — ${i.morrisbyUnpack.complete ? "Complete" : "Not yet complete"}`,
    `- Morrisby Profile available: ${i.morrisbyProfile.yes ? "Yes" : "No"}`,
    `- Work Experience completed: ${i.workExperience.yes ? "Yes" : "No"}`,
    `- Absences: ${i.absences.count}${i.absences.flagged ? " (FLAGGED — exceeds attendance threshold)" : ""}`,
  ];
  return lines.join("\n");
}

function formatSurveyShifts(shifts: SurveyShiftInput[]): string {
  if (!shifts.length) return "No pilot survey responses recorded.";

  const byStage = new Map<SurveyShiftInput["stage"], SurveyShiftInput[]>();
  for (const s of shifts) {
    if (!byStage.has(s.stage)) byStage.set(s.stage, []);
    byStage.get(s.stage)!.push(s);
  }

  const blocks: string[] = [];
  for (const stage of ["start", "mid", "end"] as const) {
    const items = byStage.get(stage);
    if (!items?.length) continue;
    const fieldLines: string[] = [];
    for (const it of items) {
      for (const [label, value] of Object.entries(it.fields)) {
        fieldLines.push(`    • ${label}: ${value}`);
      }
    }
    blocks.push(`  ${STAGE_NAME[stage]}:\n${fieldLines.join("\n") || "    • (no fields recorded)"}`);
  }

  const distinctStages = blocks.length;
  const header = distinctStages > 1
    ? `Pilot survey snapshots across ${distinctStages} stage(s) — describe how the student's responses shifted:`
    : `Pilot survey snapshot (single stage available — no shift to compare):`;
  return `${header}\n${blocks.join("\n")}`;
}

function formatSessionDetails(sessions: SessionDetailInput[]): string {
  if (!sessions.length) return "No counselling session records available.";

  const blocks = sessions.map((s, i) => {
    const header = [
      `  Session ${i + 1}${s.title ? ` — ${s.title}` : ""}`,
      s.date ? `(${s.date.slice(0, 10)})` : "",
    ].filter(Boolean).join(" ");
    const fieldLines = Object.entries(s.fields)
      .map(([label, value]) => `    • ${label}: ${value}`)
      .join("\n");
    return `${header}\n${fieldLines || "    • (no detail recorded)"}`;
  });

  return `Counselling session intervention detail (${sessions.length} session(s) — what actually happened in sessions):\n${blocks.join("\n")}`;
}

function buildUserPrompt(
  s:        StudentInput,
  insights: InsightsInput | undefined,
  shifts:   SurveyShiftInput[] | undefined,
  sessions: SessionDetailInput[] | undefined,
): string {
  const stageStr = s.stage ? (STAGE_LABEL[s.stage] ?? s.stage) : "Not yet started";
  const yearStr  = s.yearLevelLabel?.trim() || `Year ${s.yearLevel}`;

  const sections: string[] = [
    `Student programme data:`,
    `- Programme stage: ${stageStr}`,
    `- Stage progress score: ${s.stageProgress}/4`,
    `- Enrolment status: ${s.status}`,
    `- Year level: ${yearStr}`,
    `- Student type: ${s.studentType}`,
    `- Interview conducted: ${s.interviewed ? "Yes" : "No"}`,
    s.schoolName ? `- School: ${s.schoolName}` : "",
  ].filter(Boolean);

  if (insights) {
    sections.push("", "Quick Insight categories (deterministic):", formatInsights(insights));
  }

  if (sessions && sessions.length) {
    sections.push("", formatSessionDetails(sessions));
  }

  if (shifts && shifts.length) {
    sections.push("", formatSurveyShifts(shifts));
  }

  sections.push(
    "",
    `Please write a brief professional counsellor note about this student's EMCI programme engagement, progress, recommended next steps, and any pilot-survey shifts observed. Draw on the counselling session intervention detail (Morrisby, Career Action Plan, industry engagement, work-experience preparation, work readiness) where it informs the picture.`,
  );

  return sections.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
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

  let body: {
    student:         StudentInput;
    schoolName?:     string;
    insights?:       InsightsInput;
    surveyShifts?:   SurveyShiftInput[];
    sessionDetails?: SessionDetailInput[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const input: StudentInput = {
    ...body.student,
    schoolName: body.schoolName ?? body.student.schoolName,
  };

  const userPrompt = buildUserPrompt(input, body.insights, body.surveyShifts, body.sessionDetails);

  const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:       "gpt-4o-mini",
      max_tokens:  500,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name:   "emci_student_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              analysis: { type: "string" },
              highlights: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    icon:  { type: "string", enum: [...HIGHLIGHT_ICONS] },
                  },
                  required: ["label", "value", "icon"],
                },
              },
            },
            required: ["analysis", "highlights"],
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

  let analysis = "";
  let highlights: { label: string; value: string; icon: string }[] = [];
  try {
    const parsed = JSON.parse(raw);
    analysis   = typeof parsed.analysis === "string" ? parsed.analysis : "";
    highlights = Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [];
  } catch {
    // Fall back to treating the whole response as prose if parsing fails.
    analysis = raw;
  }

  return new Response(JSON.stringify({ analysis, highlights }), {
    status: 200,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
