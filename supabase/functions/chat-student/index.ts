import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are the EMCI Assistant — a professional career-counselling co-pilot embedded in the Enhanced My Career Insights (EMCI) program in Victoria, Australia.

EMCI supports Year 9 and 10 students from priority cohorts — Koorie students, students in out-of-home care, students engaged with Youth Justice, and students with disabilities who experience significant disadvantage. The program connects these students with additional career guidance supports and work-based learning opportunities through ACCE (Australian Centre for Career Education).

The program stages are:
1. Consent — parental/guardian consent obtained (initial intake)
2. Career Guidance — student is actively engaged in career consultations, Morrisby profiling, and work readiness activities
3. Complete — student has finished the EMCI programme

You are answering questions for a school-based career practitioner or ACCE consultant about the ONE student described in the context block below.

Rules:
- Ground every answer in the provided student context. Do not invent sessions, surveys, or facts that are not present.
- If the context does not contain the answer, say so plainly and suggest what record would be needed.
- Never use or guess the student's name — refer to "the student" or "they". The context intentionally omits identifying details.
- Be concise and practical: prefer short paragraphs and tight bullet points. Lead with the direct answer.
- Where helpful, reference the Quick Insight categories (Career Action Plan, Morrisby Unpack, Morrisby Profile, Work Experience, Absences) and any pilot-survey shifts across start / mid / end stages.
- Use timeline notes when they answer the practitioner’s question or clarify engagement, barriers, goals, sentiment, or next steps. Do not invent details beyond those notes.
- Offer concrete, actionable next steps when asked for recommendations.
- Do not include sensitive personal information beyond what is provided. This guidance supports — never replaces — professional judgement.

Respond with a JSON object containing two fields:
- "reply": your answer, written in concise GitHub-flavoured markdown (headings, bold, and bullet lists are encouraged where they aid scanning).
- "followUps": an array of 0–3 SHORT follow-up questions the practitioner is most likely to ask next, written from their perspective (e.g. "What work experience would suit them?", "How do I support their attendance?"). Each must be a single question under ~10 words, answerable from this student's context. Omit anything you already covered, and return an empty array when no useful follow-up remains.`;

interface StudentInput {
  stage:           string | null;
  stageProgress:   number;
  status:          string;
  absenceCount:    number;
  interviewed:     boolean;
  hasProfile:      boolean;
  studentType:     string;
  yearLevel:       number;
  yearLevelLabel?: string;
  schoolName?:     string;
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
  date:              string;
  title:             string;
  interventionType?: string;
  sessionLength?:    string;
  fields:            Record<string, string>;
}

interface TimelineNoteInput {
  date:  string;
  type:  string;
  title: string;
  note:  string;
}

interface ChatMessageInput {
  role:    "user" | "assistant";
  content: string;
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
  return [
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
  ].join("\n");
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
  return `Pilot survey snapshots:\n${blocks.join("\n")}`;
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

  return `Counselling session intervention detail (${sessions.length} session(s)):\n${blocks.join("\n")}`;
}

function formatTimelineNotes(notes: TimelineNoteInput[]): string {
  if (!notes.length) return "No timeline notes recorded.";

  const lines = notes.map((n, i) => {
    const date = n.date ? n.date.slice(0, 10) : "unknown date";
    return `  Note ${i + 1} — ${n.title} (${n.type}, ${date})\n    • ${n.note}`;
  });
  return `Timeline notes from activity records (${notes.length} note(s)):\n${lines.join("\n")}`;
}

function buildContextBlock(
  s:        StudentInput,
  insights: InsightsInput | undefined,
  shifts:   SurveyShiftInput[] | undefined,
  sessions: SessionDetailInput[] | undefined,
  notes:    TimelineNoteInput[] | undefined,
): string {
  const stageStr = formatProgrammeStageLabel(s.stage);
  const yearStr  = s.yearLevelLabel?.trim() || `Year ${s.yearLevel}`;

  const sections: string[] = [
    `STUDENT CONTEXT (the only student this conversation is about):`,
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
  return sections.join("\n");
}

// CORS headers must be present on EVERY response (including errors) — without
// them the browser surfaces any non-2xx as an opaque "CORS policy" failure.
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

const MAX_HISTORY = 12;

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
    messages?:       ChatMessageInput[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const history = Array.isArray(body.messages)
    ? body.messages
        .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-MAX_HISTORY)
    : [];

  if (!history.length || history[history.length - 1].role !== "user") {
    return jsonResponse({ error: "A trailing user message is required" }, 400);
  }

  try {
    const input: StudentInput = {
      ...body.student,
      schoolName: body.schoolName ?? body.student?.schoolName,
    };
    const contextBlock = buildContextBlock(input, body.insights, body.surveyShifts, body.sessionDetails, body.timelineNotes);

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        max_tokens:  700,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: contextBlock },
          ...history.map(m => ({ role: m.role, content: m.content })),
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name:   "emci_assistant_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reply:     { type: "string" },
                followUps: { type: "array", items: { type: "string" } },
              },
              required: ["reply", "followUps"],
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

    let reply = "";
    let followUps: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      reply     = typeof parsed.reply === "string" ? parsed.reply : "";
      followUps = Array.isArray(parsed.followUps)
        ? parsed.followUps.filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 3)
        : [];
    } catch {
      // Fall back to treating the whole response as the reply prose.
      reply = raw;
    }

    if (!reply.trim()) {
      return jsonResponse({ error: "No reply returned from service." }, 502);
    }

    return jsonResponse({ reply, followUps }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: `chat-student failed: ${message}` }, 500);
  }
});
