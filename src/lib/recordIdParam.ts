/**
 * Dataverse primary keys are GUIDs; local fixtures may use short alphanumeric ids.
 * Reject empty or path-breaking values; do not treat display names as ids.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SAFE_TOKEN_RE = /^[a-zA-Z0-9_-]+$/;

export function isPlausibleRecordIdParam(id: string | undefined): id is string {
  if (id == null || id === '') return false;
  const t = id.trim();
  if (t.length > 128) return false;
  if (/[/\\?#]/.test(t)) return false;
  if (UUID_RE.test(t)) return true;
  return SAFE_TOKEN_RE.test(t) && t.length >= 2;
}
