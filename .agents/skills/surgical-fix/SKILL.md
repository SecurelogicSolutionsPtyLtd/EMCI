---
name: surgical-fix
description: Performs minimal, blast-radius-aware bug fixes. Maps dependencies before editing, inspects affected files first, and avoids breaking unrelated functionality. Use when fixing runtime errors, config issues, or localized bugs where a small precise change is required.
---

# Surgical Fix

Apply the smallest change that resolves the reported issue. Do not refactor, rename, or "improve" adjacent code.

## Workflow

Copy this checklist and track progress:

```
Surgical fix progress:
- [ ] 1. Reproduce / read the exact error
- [ ] 2. Map blast radius
- [ ] 3. Inspect before editing
- [ ] 4. Apply minimal fix
- [ ] 5. Verify fix + no regressions
```

### 1. Reproduce / read the exact error

- Capture the full stack trace, file, and line number.
- Identify whether the failure is config, runtime, build, or data — not all fixes belong in application code.

### 2. Map blast radius

Before changing anything, find:

- **Entry point** — where the error originates (e.g. `src/services/supabase.ts:8`).
- **Direct consumers** — files that import or call the entry point (`grep` / semantic search).
- **Indirect consumers** — hooks, contexts, routes, or tests that depend on those consumers.
- **Config / env** — `.env*`, `vite.config`, build scripts, edge functions, CI env vars.

Document blast radius in one short list. If the fix touches a shared module (auth client, API wrapper, context), list every importer.

### 3. Inspect before editing

Read the full target file and its immediate callers. Confirm:

- Existing conventions (naming, error handling, env var prefixes).
- Whether the root cause is missing config vs bad code logic.
- Whether a fix in code would mask a setup problem (prefer fixing setup when that is the root cause).

**Do not edit until inspection is complete.**

### 4. Apply minimal fix

Rules:

- Change only files in the blast radius needed to fix the issue.
- Prefer fixing root cause (e.g. create `.env` from `.env.example`) over defensive wrappers when setup is wrong.
- When adding guards (env validation, null checks), keep them at the failure boundary with actionable error messages.
- Do not add new abstractions, helpers, or files unless the same pattern already exists or duplication would be worse.
- Do not change unrelated imports, formatting, or comments.
- Update CHANGELOG for user-facing or functional changes.

### 5. Verify fix + no regressions

- Restart dev servers if env vars changed (Vite reads `.env` at startup).
- Run targeted checks: `npm run lint`, relevant tests, or a smoke path through affected UI.
- Confirm importers still type-check and behave the same except for the fixed failure mode.

## Decision guide

| Situation | Surgical action |
|-----------|-----------------|
| Missing `.env` / env var | Create from `.env.example`; fetch secrets via MCP or dashboard — do not hardcode in source |
| Cryptic third-party error | Add validation at the call site with a clear message; fix underlying config |
| Bug in one component | Fix that component only; do not refactor siblings |
| Shared utility broken | Fix utility + run grep on all importers; change callers only if API must change |

## Anti-patterns

- Refactoring while fixing a one-line config error
- Adding lazy initialization everywhere "just in case"
- Changing multiple unrelated files in the same commit
- Committing `.env` or secrets to git
- Fixing symptoms in app code when the dev environment is misconfigured

## Output format

When reporting back:

1. **Root cause** — one sentence
2. **Blast radius** — files inspected / changed
3. **Fix** — what changed and why
4. **Verification** — what was run or manually confirmed
