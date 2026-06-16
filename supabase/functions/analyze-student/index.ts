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
1. Consent — parental/guardian consent obtained (initial intake)
2. Career Guidance — student is actively engaged in career consultations, Morrisby profiling, and work readiness activities
3. Complete — student has finished the EMCI programme

You must return a JSON object with two fields: "analysis" and "highlights".

"analysis" — a concise, professional analysis (4–6 sentences) of the student's current EMCI engagement for school-based career practitioners and ACCE consultants. Requirements:
- Refer to "the student" or "they" — never use the student's name.
- Reference the Quick Insight categories (Career Action Plan, Morrisby Unpack, Morrisby Profile, Work Experience, Absences) where they meaningfully inform the picture. Explicitly flag absences when the absences entry is flagged.
- When pilot survey data is provided for more than one stage (start / mid / end), describe how the student's responses shifted across those stages — focus on perceptions like preparedness, understanding of interests and strengths, programme helpfulness, work-experience exposure, and any change in focus.
- Use the timeline notes when they clarify engagement, barriers, goals, sentiment, or recommended next steps. Do not invent detail beyond those notes.
- Be direct, positive where appropriate, and clearly flag any areas needing attention.
- Do not include sensitive personal information beyond what is provided.

"highlights" — an array of AT MOST 3 at-a-glance highlight chips that let a practitioner instantly recognise the student. Only include a highlight when it is clearly supported by the provided data (especially the pilot survey fields). Prefer these three categories, in priority order, and omit any that are unknown (return an empty array if none apply):
1. Career Interest — the job, industry, or aspiration the student is drawn to (e.g. "Firefighter", "Nursing", "Trades").
2. Strength — a talent, subject, or interest the student identifies with (e.g. "Music", "Sport", "Art").
3. Current Work — a part-time job the student CURRENTLY holds or work experience they have ALREADY completed (e.g. "KFC", "Retail", "Hospitality").
Rules for highlights:
- Never infer "Current Work" from a stated desire, plan, or intention to find work (e.g. "I would like a part-time job", "interested in part-time work in supermarkets"). If the data only shows the student wants work, omit the Current Work chip entirely.
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
  unpack:             { yes: boolean };
  cap:                { yes: boolean };
  workReadiness:      { yes: boolean };
  industryEngagement: { yes: boolean };
  externalSupport:    { yes: boolean };
  wexPreparation:     { yes: boolean };
  introduction:       { yes: boolean };
  other:              { yes: boolean };
  sessionCount:       number;
  absenceCount:       number;
  absencesFlagged:    boolean;
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

interface TimelineNoteInput {
  date:  string;
  type:  string;
  title: string;
  note:  string;
}

const PROGRAMME_STAGE_TOTAL = 3;

function programmeProgressStep(stageProgress: number): number {
  return Math.max(0, Math.min(PROGRAMME_STAGE_TOTAL, stageProgress - 1));
}

function formatProgrammeProgressScore(stageProgress: number): string {
  return `${programmeProgressStep(stageProgress)}/${PROGRAMME_STAGE_TOTAL}`;
}

function formatProgrammeStageLabel(stage: string | null): string {
  switch (stage) {
    case "career_guidance":
      return "Career Guidance (Stage 2 of 3)";
    case "complete":
      return "Complete (Stage 3 of 3)";
    case "consent":
    case "referral":
      return "Consent (Stage 1 of 3)";
    default:
      return "Not yet started";
  }
}

const STAGE_LABEL: Record<string, string> = {
  referral:        "Consent (Stage 1 of 3)",
  consent:         "Consent (Stage 1 of 3)",
  career_guidance: "Career Guidance (Stage 2 of 3)",
  complete:        "Complete (Stage 3 of 3)",
};

const STAGE_NAME: Record<SurveyShiftInput["stage"], string> = {
  start: "Start of programme (initial survey)",
  mid:   "Mid-programme survey",
  end:   "End-of-programme survey",
};

function formatInsights(i: InsightsInput): string {
  const lines = [
    `- Counselling sessions: ${i.sessionCount}`,
    `- Absences: ${i.absenceCount}${i.absencesFlagged ? " (FLAGGED — exceeds attendance threshold)" : ""}`,
    `- Morrisby Unpack: ${i.unpack.yes ? "Yes" : "No"}`,
    `- CAP: ${i.cap.yes ? "Yes" : "No"}`,
    `- Work Readiness: ${i.workReadiness.yes ? "Yes" : "No"}`,
    `- Industry Engagement: ${i.industryEngagement.yes ? "Yes" : "No"}`,
    `- External Support: ${i.externalSupport.yes ? "Yes" : "No"}`,
    `- WEX Preparation: ${i.wexPreparation.yes ? "Yes" : "No"}`,
    `- Introduction: ${i.introduction.yes ? "Yes" : "No"}`,
    `- Other: ${i.other.yes ? "Yes" : "No"}`,
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

function formatTimelineNotes(notes: TimelineNoteInput[]): string {
  if (!notes.length) return "No timeline notes recorded.";

  const lines = notes.map((n, i) => {
    const date = n.date ? n.date.slice(0, 10) : "unknown date";
    return `  Note ${i + 1} — ${n.title} (${n.type}, ${date})\n    • ${n.note}`;
  });
  return `Timeline notes from activity records (${notes.length} note(s)):\n${lines.join("\n")}`;
}

function buildUserPrompt(
  s:        StudentInput,
  insights: InsightsInput | undefined,
  shifts:   SurveyShiftInput[] | undefined,
  sessions: SessionDetailInput[] | undefined,
  notes:    TimelineNoteInput[] | undefined,
): string {
  const stageStr = formatProgrammeStageLabel(s.stage);
  const yearStr  = s.yearLevelLabel?.trim() || `Year ${s.yearLevel}`;

  const sections: string[] = [
    `Student programme data:`,
    `- Programme stage: ${stageStr}`,
    `- Stage progress score: ${formatProgrammeProgressScore(s.stageProgress)}`,
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

  if (notes && notes.length) {
    sections.push("", formatTimelineNotes(notes));
  }

  sections.push(
    "",
    `Please write a brief professional counsellor note about this student's EMCI programme engagement, progress, recommended next steps, and any pilot-survey shifts observed. Draw on the counselling session intervention detail and timeline notes where they inform the picture.`,
  );

  return sections.join("\n");
}

// CORS headers must be present on EVERY response (including errors) — without
// them the browser surfaces any non-2xx as an opaque "CORS policy" failure
// that hides the real error.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: "OpenAI API key not configured" }, 500);
  }

  let body: {
    student:         StudentInput;
    schoolName?:     string;
    insights?:       InsightsInput;
    surveyShifts?:   SurveyShiftInput[];
    sessionDetails?: SessionDetailInput[];
    timelineNotes?:  TimelineNoteInput[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  try {
    const input: StudentInput = {
      ...body.student,
      schoolName: body.schoolName ?? body.student?.schoolName,
    };

    const userPrompt = buildUserPrompt(input, body.insights, body.surveyShifts, body.sessionDetails, body.timelineNotes);

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
      return jsonResponse({ error: `OpenAI error: ${err}` }, 502);
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

    return jsonResponse({ analysis, highlights }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: `analyze-student failed: ${message}` }, 500);
  }
});
