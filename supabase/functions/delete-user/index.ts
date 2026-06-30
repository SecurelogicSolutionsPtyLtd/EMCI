import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")              ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  let body: { id?: unknown; userId?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id, userId, email } = body;

  if (typeof id !== "string" || !id.trim()) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Resolve the Auth user id to delete. Prefer the supplied user_id, but fall
  //    back to an email lookup: a role row can sit in the "pending" state with a
  //    null user_id while an Auth account already exists for that email. Without
  //    this fallback the Auth user is orphaned (still able to log in, email stays
  //    taken) even though the role row is removed.
  let targetUserId = typeof userId === "string" && userId.trim() ? userId.trim() : null;

  if (!targetUserId && typeof email === "string" && email.trim()) {
    const found = await findAuthUserIdByEmail(admin, email.trim());
    if (found.error) {
      return jsonResponse({ error: `Failed to look up auth user: ${found.error}` }, 400);
    }
    targetUserId = found.userId;
  }

  // 2. Delete the Supabase Auth user when one was resolved. This frees the email
  //    so a future invite is a clean, fresh sign-up rather than a reactivation.
  if (targetUserId) {
    const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
    // Ignore "user not found" so the role row can still be removed.
    if (authError && !authError.message.toLowerCase().includes("not found")) {
      return jsonResponse({ error: `Failed to delete auth user: ${authError.message}` }, 400);
    }
  }

  // 3. Permanently delete the role row. When an Auth user was deleted above this
  //    is a harmless no-op (the ON DELETE CASCADE already removed the row); it is
  //    still required for pending rows that never had an Auth account.
  const { error: dbError } = await admin
    .from("emci_user_roles")
    .delete()
    .eq("id", id.trim());

  if (dbError) {
    return jsonResponse({ error: dbError.message }, 400);
  }

  return jsonResponse({ ok: true }, 200);
});

/**
 * Finds an Auth user id by email. The admin API has no direct email filter, so
 * we page through the user list (the portal user base is small). Returns a null
 * userId when no account exists for the email.
 */
async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ userId: string | null; error: string | null }> {
  const target = email.toLowerCase();
  const perPage = 1000;

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { userId: null, error: error.message };
    }

    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) {
      return { userId: match.id, error: null };
    }

    if (data.users.length < perPage) {
      return { userId: null, error: null };
    }
  }
}
