# EMCI Portal – Action Checklist

> **AI delivery:** Use the personal **`phase-delivery`** skill with [docs/emci-portal-phase-map.md](docs/emci-portal-phase-map.md) as the working tracker. AI marks tasks `[~]`; you verify in the app before `[x]`.

---

## Awaiting Approval

### Job Ready terminology

- [ ] Review **"Job Ready"** wording with ACCE/DE stakeholders.

  Potential alternatives:

  - Job Skilled
  - Career Ready
  - Work Experience Ready

- [ ] Await final approval from Bronwyn.

### Department of Education wording

- [ ] Review all terminology against Department of Education feedback.
- [ ] Final DE wording review before rollout.

---

## Dashboard

- [~] Update dashboard summary cards to show:
  - Total Schools (Pilot Lifetime)
  - Active Schools
  - Inactive Schools
- [~] Exclude test schools/accounts (e.g. Secure Logic, test entries) from primary statistics.
- [~] Update counsellor counts:
  - Active Counsellors
  - Total Counsellors *(optional)*
- [~] Exclude inactive counsellors and test accounts from active metrics.

---

## Student Tab – Terminology Changes

- [ ] Change **"At Risk"** → **"Follow Up"** *(P2-T1 — AI complete; pending human verification)*

---

## Student Progress Rating Updates

- [x] Update rating area name: **Growth & Wellbeing** → **Student Sentiment**
- [ ] Update rating weightings to:

| Rating Area | Weight |
|-------------|--------|
| Engagement | 20% |
| Career Planning & Exploration | 25% |
| Work Readiness | 25% |
| Attendance & Momentum | 15% |
| Student Sentiment | 15% |

> **Reference:** Career Planning and Work Readiness are now the highest weighted categories.

---

## Student Summary Logic

- [ ] Review inactive school/student summary generation.
- [ ] Ensure inactive students do not appear as actively engaged.
- [ ] Add alternate wording for inactive students, for example:
  - *"This student is no longer active in the EMCI program."*
  - *"Participation ceased before program completion."*
- [ ] Investigate incorrect completion summaries.

  **Example:** Charlie McDonald showing successful completion after only one session.

- [ ] Review AI summary generation logic and completion thresholds.

---

## Scoring & Eligibility Rules

- [x] Rename program references: **EMCI** = Enhanced My Career Insights (Pilot Program)
- [ ] Only calculate scores when:
  - At least 1 EMCI session exists
  - Initial Student Survey completed
  - At least 1 Satisfaction Survey completed
- [ ] Do not score students within first 30 days of CRM creation.
- [ ] Ensure unavailable activities do not negatively impact scores.

---

## Alerts & Flags

### Remove

- [x] Wellbeing Concern *(retired name only — alert kept as **Sentiment concern**)*

### Rename

| Current | New |
|---------|-----|
| Wellbeing Concern | Sentiment concern |
| Attendance Risk | Attendance Issues |
| Thriving | Engaged |

### Keep

- Attendance Issues
- Disengaged
- Stalled
- No Career Plan
- Engaged

### Priority alerts requiring attention

- No Career Plan
- Disengaged
- Stalled

---

## Follow-Up Logic

- [ ] Remove Support Levels (Standard / Elevated / High)
- [ ] Remove Priority Cohort influence from scoring.
- [ ] No automatic notifications or tasks required.
- [ ] **"Needs Attention"** should be the primary trigger for staff review.

---

## Security & Permissions

- [ ] Remove visibility of wellbeing-related information.
- [ ] Ensure only ACCE Admin users can manage ratings.
- [ ] No manual rating override functionality required.
- [ ] Maintain audit logging for rating changes.

---

## Reporting Views

### Ensure reporting supports

- Individual Student
- School
- Cohort
- Year Level
- Program

### Not required

- Regional Summary

---

## Validation & Testing

- [ ] Test active/inactive school calculations.
- [ ] Test active/inactive counsellor calculations.
- [ ] Test summary generation for inactive students.
- [ ] Test scoring eligibility rules.
- [ ] Validate updated weighting calculations.
- [ ] Validate alert generation rules.

---

## Priority Order

1. Dashboard active/inactive counts
2. At Risk → Follow Up
3. Weighting changes
4. Inactive student summary fixes
5. Incorrect completion summary investigation
6. Alerts/flags cleanup
7. Awaiting Approval items (see above)
