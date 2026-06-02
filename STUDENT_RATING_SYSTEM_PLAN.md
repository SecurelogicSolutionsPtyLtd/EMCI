# EMCI — Student Tracking Score — Research & Plan (AI-core, strict)

> **Status:** Research / design only. No code changes here.
> **Goal:** One AI call scores a student under a **fixed rubric** and returns **bounded
> JSON**; code does the final arithmetic. AI at the core, strictly constrained, minimal moving parts.

---

## 1. Principle

The AI is the scorer, but it is **boxed in** so it cannot drift or hallucinate:

1. It receives a **pre-computed data packet** (we already build it) — it never fetches or invents data.
2. It must follow an **explicit point rubric** baked into the prompt — it grades, it does not opine.
3. It returns **strict, schema-validated JSON** (bounded integers, fixed keys, enums).
4. **Code finalises** the overall score, band and triage from the AI's category scores — so the headline number is reproducible and the AI can't override it.
5. `temperature: 0`. On return we **clamp** every value and recompute the overall.

Net: AI does the one thing it's uniquely good at — reading session notes / survey free-text for engagement & wellbeing — while everything else is pinned down.

---

## 2. Architecture — one call, no new infrastructure

Reuse the existing `analyze-student` Supabase function and its data builders
(`computeQuickInsights`, `buildSessionDetails`, `buildSurveyShifts`). Add a `rating`
block to its existing response, so a single call returns analysis + highlights + rating,
persisted in the one encrypted record. Scores are generated on demand (when the analysis
is generated) and **cached**; list views read the cached score. No batch jobs, no second
service, no separate deterministic library.

```
Student + events ──build packet──▶ analyze-student (AI + rubric, temp 0)
                                        │
                                        ▼
            { analysis, highlights, rating } ──clamp & finalise (code)──▶ store + render
```

---

## 3. The data packet the AI receives (already assembled)

A compact JSON object — no raw entities, no PII names:

- `stageProgress` (0–4), `interviewed`, `hasProfile`, `status`
- `sessionCount`, `interventionAreas` (CAP / WEX prep / Morrisby / industry / work-readiness booleans)
- `absenceCount`, `absencesExplained`
- `surveys`: start / mid / end Likert values + deltas (preparedness, interests & strengths, helpfulness)
- `careerSignals`: workExperienceCompleted, partTimeJob, researchingCareers
- `yearLevel`
- `notes`: concatenated, HTML-stripped, **name-redacted** counsellor internal notes + absence reasons + survey comments

---

## 4. The fixed rubric (what the AI must apply)

Five categories, each scored **0–100** strictly by these point allocations. Each
category's signals sum to 100; the category weights (below, totalling 100) decide how
much each contributes to the overall. Work-readiness signals are scored **only** in the
Work Readiness category so nothing is double-counted.

**Engagement (weight 25)**
| Signal | Pts |
|--------|:--:|
| Sessions: `min(count,4)/4 × 60` | 0–60 |
| Intervention breadth: areas touched /5 × 20 | 0–20 |
| Interview conducted | 20 |

**Career Outcomes — planning & exploration (weight 20)**
| Signal | Pts |
|--------|:--:|
| Career Action Plan (CAP) present | 40 |
| Morrisby profile | 25 |
| Researching careers | 20 |
| Career conversation / interview conducted | 15 |

**Work Readiness (weight 20)**
| Signal | Pts |
|--------|:--:|
| Work experience completed (WEX) | 40 |
| Part-time job | 25 |
| WEX preparation in sessions | 20 |
| Work-readiness intervention in sessions | 15 |

**Attendance & Momentum (weight 15)**
| Signal | Pts |
|--------|:--:|
| Attendance: 0 abs=100, 1–2=75, 3–5=40, >5=15 (unexplained harsher) | 0–100 |

**Growth & Wellbeing (weight 20)** — *the AI-judgement category*
| Signal | Pts |
|--------|:--:|
| Preparedness + interests/strengths shift start→end | 0–40 |
| Helpfulness / positive sentiment | 0–30 |
| Wellbeing read of notes & comments (concern lowers, positive raises) | 0–30 |

If a category has no supporting data, the AI returns `null` for that category (omitted from the weighted average — see §6 confidence). **Fairness note:** a student with no work-experience opportunity yet (e.g. early Year 10) should return `null` for Work Readiness rather than a low score, so the missing opportunity does not penalise them — the weight is renormalised across the remaining categories.

---

## 5. Strict AI output contract (JSON schema, `strict: true`)

```jsonc
{
  "rating": {
    "categories": [
      { "key": "engagement",        "score": 0-100|null, "reason": "≤12 words" },
      { "key": "career_outcomes",   "score": 0-100|null, "reason": "≤12 words" },
      { "key": "work_readiness",    "score": 0-100|null, "reason": "≤12 words" },
      { "key": "attendance_momentum","score": 0-100|null, "reason": "≤12 words" },
      { "key": "growth_wellbeing",  "score": 0-100|null, "reason": "≤12 words" }
    ],
    "flags": ["enum: wellbeing_concern | attendance_risk | disengaged | stalled | no_career_plan | thriving"], // max 3
    "confidence": "low | medium | high"
  }
}
```

Constraints: fixed 5 keys in fixed order; integer scores 0–100 or null; reasons capped;
flags from the enum, max 3; **no names/PII** in any string; nothing outside the schema.

---

## 6. Code finalisation (deterministic, no AI)

1. **Clamp** every score to 0–100; drop invalid flags.
2. **Overall** = weighted average over non-null categories with weights {engagement 25, career_outcomes 20, work_readiness 20, attendance_momentum 15, growth_wellbeing 20}, renormalised over whichever categories are non-null.
3. **Band** from overall: ≥80 On Track · 65–79 Progressing · 45–64 Monitoring · <45 Needs Attention.
4. **Support Need** (pure code, from context — never lowers the score): priority-cohort tags (Disability/Koorie/OOHC/Youth Justice) + Year 10 runway → Standard / Elevated / High.
5. **Triage** = matrix of Band × Support Need → OK / Watch / Follow up / Priority / Urgent.
6. **Confidence** = share of category weight that was non-null (cross-checked against the AI's own `confidence`).

The headline number, band and triage are therefore reproducible from the AI's category scores — the AI cannot move them directly.

---

## 7. Ethics (unchanged, brief)
Disadvantage indicators are **context only** — they raise Support Need and triage urgency,
never reduce the score. Notes are name-redacted before reaching the AI and respect
`hidePii` (show a "review notes" flag, not the text). Breakdown + flags are always visible so practitioners can override.

---

## 8. Implementation (minimal)
- **Phase 0:** enumerate survey Likert option-sets (metadata or sampling); agree flag enum + the rubric point values above.
- **Phase 1:** extend `analyze-student` — add the rubric to the system prompt and the `rating` object to the strict JSON schema (`temperature: 0`).
- **Phase 2:** add `finaliseRating()` in `src/lib/studentRating.ts` (clamp, weighted overall, band, support need, triage) + types; persist `rating` in the existing encrypted analysis record.
- **Phase 3:** `StudentRatingBadge.tsx` on `ProfileSnapshot` + Journey header; band dot + sortable "Triage" column + "Needs Attention" filter in lists (cached scores).

---

## 9. Open decisions
1. Rubric point values (§4) and category weights {25/20/20/15/20}.
2. Band thresholds (80/65/45) and Triage matrix (§6).
3. Flag enum (§5) and the wellbeing concern/positive cues the AI keys on.
4. Session target (4) for full engagement volume.
5. Confirm: one combined call (analysis + rating) vs a dedicated rating call.
