import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are a professional career counsellor working within the Enhanced My Career Insights (EMCI) program in Victoria, Australia.

Your task is to analyse the student's voice and sentiment from their survey responses, session feedback, and recorded notes. You are looking for the student's own perspective — what they find helpful, what they struggle with, how they feel about school or their situation, and how their outlook has changed across the programme.

Focus on:
- Direct student feedback (session satisfaction, "found useful" responses, survey answers in their own words)
- Signs of enthusiasm, confidence, or positive engagement
- Signs of struggle, disengagement, school difficulty, or personal challenges
- Shifts in attitude or confidence across start/mid/end programme stages

You must return a JSON object with these fields:

"sentiment" — one of: "positive", "negative", "mixed", "insufficient_data".
  Use "insufficient_data" only if there is genuinely no student voice data (no survey responses, no session feedback at all).
  Use "mixed" when there is a combination of positive and negative signals.

"summary" — 2–3 professional sentences summarising the student's overall sentiment and engagement. Write in third person ("the student"). Be honest about challenges while remaining constructive. Highlight what the student finds valuable and what barriers they face.

"quotes" — an array of up to 4 items drawn from real student-voice fields in the data:
  - "text": the student's actual words or a very close paraphrase (1–2 sentences max).
  - "context": a PRECISE citation formatted as: "<Source> — <Field name> · <Date>".
      Source examples: "Start-of-programme survey", "Mid-programme survey", "End-of-programme survey", "Session 2 feedback", "Session note".
      Field name: the exact label from the data (e.g. "Found Useful", "Session Satisfaction", "What do you enjoy at school?", "Career interests").
      Date: the date shown in the data formatted as D Mon YYYY (e.g. "5 Mar 2025"). Omit date only if genuinely not available.
      Full example: "Session 3 feedback — Found Useful · 15 Mar 2025"
      Full example: "Start-of-programme survey — What do you enjoy at school? · 10 Feb 2025"
  - "sentiment": "positive", "negative", or "neutral"

Rules:
- Only include quotes that come from actual student response fields in the provided data. Do not fabricate or invent anything.
- If the only notes are counsellor observations (not student voice), do not include them as quotes.
- Refer to "the student" — never use names or identifying details.
- Keep "text" values brief — practitioner-readable at a glance.
- The citation in "context" must precisely identify the field the quote came from so the practitioner can verify it in the original record.`;

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
}

interface InsightsInput {
  sessionCount:    number;
  absenceCount:    number;
  absencesFlagged: boolean;
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

const STAGE_NAME: Record<SurveyShiftInput["stage"], string> = {
  start: "Start of programme (initial survey)",
  mid:   "Mid-programme survey",
  end:   "End-of-programme survey",
};

// Heuristic labels that suggest student voice rather than counsellor observations.
const STUDENT_VOICE_LABELS = /satisfaction|useful|helpful|interest|feel|found|like|enjoy|want|goal|strength|challenge|difficult|hope|career|school/i;

function formatSurveyVoice(shifts: SurveyShiftInput[]): string {
  if (!shifts.length) return "No pilot survey responses recorded.";

  const blocks: string[] = [];
  for (const stage of ["start", "mid", "end"] as const) {
    const items = shifts.filter(s => s.stage === stage);
    if (!items.length) continue;
    const fieldLines: string[] = [];
    for (const it of items) {
      for (const [label, value] of Object.entries(it.fields)) {
        if (value.trim()) fieldLines.push(`    • ${label}: ${value}`);
      }
    }
    if (fieldLines.length) {
      blocks.push(`  ${STAGE_NAME[stage]}:\n${fieldLines.join("\n")}`);
    }
  }

  return blocks.length
    ? `Pilot survey responses (student's own answers):\n${blocks.join("\n")}`
    : "No pilot survey responses recorded.";
}

function formatSessionFeedback(sessions: SessionDetailInput[]): string {
  const feedbackItems: string[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const date = s.date ? s.date.slice(0, 10) : "unknown date";
    const satisfaction = s.fields["Session Satisfaction"];
    const useful       = s.fields["Found Useful"];

    if (satisfaction?.trim()) {
      feedbackItems.push(`  Session ${i + 1} (${date}) — Satisfaction: ${satisfaction}`);
    }
    if (useful?.trim()) {
      feedbackItems.push(`  Session ${i + 1} (${date}) — Found Useful: ${useful}`);
    }

    // Any field label that sounds like student voice
    for (const [label, value] of Object.entries(s.fields)) {
      if (label === "Session Satisfaction" || label === "Found Useful") continue;
      if (STUDENT_VOICE_LABELS.test(label) && value.trim()) {
        feedbackItems.push(`  Session ${i + 1} (${date}) — ${label}: ${value}`);
      }
    }
  }

  return feedbackItems.length
    ? `Student session feedback (${feedbackItems.length} item(s)):\n${feedbackItems.join("\n")}`
    : "No direct session feedback recorded from the student.";
}

function formatRelevantNotes(notes: TimelineNoteInput[]): string {
  const voiceNotes = notes.filter(n =>
    STUDENT_VOICE_LABELS.test(n.note) || STUDENT_VOICE_LABELS.test(n.title),
  );
  if (!voiceNotes.length) return "";

  const lines = voiceNotes.map((n, i) => {
    const date = n.date ? n.date.slice(0, 10) : "unknown date";
    return `  Note ${i + 1} — ${n.title} (${n.type}, ${date}): ${n.note}`;
  });
  return `Relevant timeline notes (${voiceNotes.length} note(s) — may contain student voice):\n${lines.join("\n")}`;
}

function buildUserPrompt(
  s:        StudentInput,
  insights: InsightsInput | undefined,
  shifts:   SurveyShiftInput[] | undefined,
  sessions: SessionDetailInput[] | undefined,
  notes:    TimelineNoteInput[] | undefined,
): string {
  const yearStr = s.yearLevelLabel?.trim() || `Year ${s.yearLevel}`;

  const sections: string[] = [
    `Student context:`,
    `- Year level: ${yearStr}`,
    `- Student type: ${s.studentType}`,
    `- Programme stage progress: ${s.stageProgress}/4`,
    `- Absences: ${insights?.absenceCount ?? s.absenceCount}${insights?.absencesFlagged ? " (FLAGGED)" : ""}`,
    `- Sessions attended: ${insights?.sessionCount ?? "unknown"}`,
    "",
    formatSurveyVoice(shifts ?? []),
    "",
    formatSessionFeedback(sessions ?? []),
  ];

  const notesBlock = formatRelevantNotes(notes ?? []);
  if (notesBlock) {
    sections.push("", notesBlock);
  }

  sections.push(
    "",
    "Based on the student voice data above, identify the overall sentiment, write a brief summary, and extract up to 4 direct quotes or close paraphrases from the student's own words.",
  );

  return sections.filter(s => s !== null).join("\n");
}

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
    const userPrompt = buildUserPrompt(
      body.student,
      body.insights,
      body.surveyShifts,
      body.sessionDetails,
      body.timelineNotes,
    );

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        max_tokens:  600,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name:   "emci_student_sentiment",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                sentiment: {
                  type: "string",
                  enum: ["positive", "negative", "mixed", "insufficient_data"],
                },
                summary: { type: "string" },
                quotes: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text:      { type: "string" },
                      context:   { type: "string" },
                      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                    },
                    required: ["text", "context", "sentiment"],
                  },
                },
              },
              required: ["sentiment", "summary", "quotes"],
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

    let sentiment = "insufficient_data";
    let summary   = "";
    let quotes: { text: string; context: string; sentiment: string }[] = [];

    try {
      const parsed = JSON.parse(raw);
      sentiment = typeof parsed.sentiment === "string" ? parsed.sentiment : "insufficient_data";
      summary   = typeof parsed.summary   === "string" ? parsed.summary   : "";
      quotes    = Array.isArray(parsed.quotes) ? parsed.quotes.slice(0, 4) : [];
    } catch {
      summary = raw;
    }

    return jsonResponse({ sentiment, summary, quotes }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: `sentiment-student failed: ${message}` }, 500);
  }
});
