/** Invite links are valid for one hour from the time the invite email is sent. */
export const INVITE_LINK_TTL_MS = 60 * 60 * 1000;

const STORAGE_KEY = 'emci_invite_setup';

export interface PendingInviteSetup {
  deadlineMs: number;
}

export function parseInviteIssuedAt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  // Unix seconds from the edge function; fall back to ms if already in ms.
  return parsed < 1e12 ? parsed * 1000 : parsed;
}

export function inviteDeadlineFromIssuedAt(issuedAtMs: number): number {
  return issuedAtMs + INVITE_LINK_TTL_MS;
}

export function isInviteExpired(deadlineMs: number, now = Date.now()): boolean {
  return now >= deadlineMs;
}

export function readPendingInviteSetup(): PendingInviteSetup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInviteSetup;
    if (typeof parsed.deadlineMs !== 'number' || !Number.isFinite(parsed.deadlineMs)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingInviteSetup(deadlineMs: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deadlineMs }));
  } catch {
    /* private browsing — resume-after-close may not work */
  }
}

export function clearPendingInviteSetup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
