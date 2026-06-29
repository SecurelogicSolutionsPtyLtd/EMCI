import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const MAX_TEXTS = 100;
const MAX_TEXT_CHARS = 4000;

const SYSTEM_PROMPT = `You are a privacy redaction engine for a student career-guidance platform (EMCI, Victoria, Australia). The readers are external staff who must NOT see sensitive personal information about a minor. Err on the side of redacting.

You will receive a JSON array of numbered texts (counsellor notes, survey answers, session records). For EACH text, identify the exact verbatim substrings that disclose sensitive personal information about a student or their family, including but not limited to:

- Health: medical conditions, diagnoses, medications, treatments, mental health, self-harm
- Disabilities: any disability, impairment, learning difficulty, support plan, NDIS
- Family & living situation: parents'/guardians'/relatives' names, occupations, contact details, relationships, custody, separation; who the student lives with or their care arrangement (e.g. living with grandparents, a "Nan", aunts/uncles, cousins, kinship or out-of-home care); any description of the family as complex, unstable, or difficult, even when no name is given
- Trauma & wellbeing: trauma history or a trauma-informed need; emotional or behavioural difficulties; emotional/self-regulation struggles; disengagement, absconding, leaving class, or attendance problems that are attributed to personal, emotional, or family circumstances; attachment or relationship-building difficulties; psychological profiling of the student
- Welfare: family violence, child-protection/DFFH involvement, court orders, young carer status, homelessness, financial hardship, refugee/immigration status, legal/police involvement
- Personal identifiers: phone numbers, email addresses, home addresses, ID numbers, dates of birth
- Other sensitive matters: religion, sexuality, or anything a reasonable person would consider sensitive personal information about a minor

Rules:
- Spans MUST be copied verbatim (exact characters) from the text so they can be string-replaced.
- Prefer the smallest span that fully removes the disclosure, but redact the WHOLE sentence when the sensitive content cannot be cleanly separated from its surrounding context.
- When most of a note is a personal, behavioural, or family profile of the student, return spans covering every sensitive sentence — do not leave adjacent sensitive clauses intact.
- Do NOT flag routine programme content: career interests, school subjects, session/satisfaction ratings, stage/consent status (e.g. "parental consent obtained" is routine), or neutral, generic practitioner guidance that contains no personal detail (e.g. "responds well to praise and clear expectations").
- If a text contains nothing sensitive, return an empty spans array for it.
- Return a result entry for every input index.`;

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

  let body: { texts?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.texts) || body.texts.some(t => typeof t !== "string")) {
    return jsonResponse({ error: "Body must be { texts: string[] }" }, 400);
  }

  const texts = (body.texts as string[])
    .slice(0, MAX_TEXTS)
    .map(t => t.slice(0, MAX_TEXT_CHARS));

  if (texts.length === 0) {
    return jsonResponse({ results: [] }, 200);
  }

  try {
    const userPrompt = JSON.stringify(
      texts.map((text, index) => ({ index, text })),
    );

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        max_tokens:  2000,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name:   "emci_sensitive_spans",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      index: { type: "integer" },
                      spans: { type: "array", items: { type: "string" } },
                    },
                    required: ["index", "spans"],
                  },
                },
              },
              required: ["results"],
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

    let results: { index: number; spans: string[] }[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.results)) {
        results = parsed.results.filter((r: unknown) =>
          r !== null &&
          typeof r === "object" &&
          typeof (r as Record<string, unknown>).index === "number" &&
          Array.isArray((r as Record<string, unknown>).spans),
        );
      }
    } catch {
      // Fall through with empty results — clients fail open to pattern tier.
    }

    return jsonResponse({ results }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: `redact-sensitive failed: ${message}` }, 500);
  }
});
