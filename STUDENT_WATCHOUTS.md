# EMCI — Proactive Student Watch-outs

A lightweight monitoring layer that surfaces "things worth a look" on each student, so the system flags issues *for* the user instead of waiting to be asked. Most checks are deterministic (factual, no AI); a few use the AI rating flags for softer signals.

---

## Data-integrity watch-outs (deterministic)

Factual contradictions — high trust, no AI needed.

| Watch-out | Trigger / threshold | Severity |
|-----------|--------------------|----------|
| Active but dormant | `status = Active` and no activity for **> 90 days** (excludes completed students) | Action |
| In guidance, nothing logged | `stageProgress ≥ 3` and **0** sessions recorded | Action |
| Completed without outcomes | `currentStage = Complete` and missing CAP, Morrisby profile, or interview | Watch |
| Interview / profile mismatch | `interviewed` but no profile, or profile but never interviewed | Watch |
| Consent stall | Referred **> 90 days** ago, still `stageProgress < 3` | Watch |
| Deactivated but active | Deactivation recorded yet `status = Active` | Action |

---

## Risk & momentum watch-outs

| Watch-out | Trigger / threshold | Severity |
|-----------|--------------------|----------|
| Stalled journey | In progress and idle **> 60 days** (AI `stalled`) | Watch |
| Attendance risk | `absenceCount > 5` (AI `attendance_risk`) | Watch |
| Disengaging | AI `disengaged` + low Engagement score | Watch |
| No career plan late | AI `no_career_plan` and `stageProgress ≥ 3` | Action |
| Equity escalation | `supportNeed = high` and band `needs_attention` | Action |
| Runway risk | Year 10, late in year, low stage progress | Watch |

---

## Positive signals

| Signal | Trigger | Severity |
|--------|---------|----------|
| Thriving | AI `thriving`, or band `on_track` with `supportNeed = high` | Positive |

---

## Guardrail

| Rule | Behaviour |
|------|-----------|
| Low-confidence rating | When AI `confidence = low`, label watch-outs "limited data — verify first" |

---

## Where it shows

| Surface | What it shows |
|---------|---------------|
| Student Journey | Compact "Watch-outs" strip under the score (top 1–3, click to jump) |
| Counsellor view | "Needs attention" queue ranked by severity across the caseload |
| DE dashboard | Aggregate follow-up reason counts only (PII-safe) |

> Severity key: **Action** = follow up soon · **Watch** = keep an eye on · **Positive** = recognise / replicate.
