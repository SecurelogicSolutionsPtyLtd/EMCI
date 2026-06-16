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

  let body: { id?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id, userId } = body;

  if (typeof id !== "string" || !id.trim()) {
    return jsonResponse({ error: "id is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Delete the Supabase Auth user (only when a user_id exists). This frees the
  //    email so a future invite is a clean, fresh sign-up rather than a reactivation.
  if (typeof userId === "string" && userId.trim()) {
    const { error: authError } = await admin.auth.admin.deleteUser(userId.trim());
    // Ignore "user not found" so the role row can still be removed.
    if (authError && !authError.message.toLowerCase().includes("not found")) {
      return jsonResponse({ error: `Failed to delete auth user: ${authError.message}` }, 400);
    }
  }

  // 2. Permanently delete the role row.
  const { error: dbError } = await admin
    .from("emci_user_roles")
    .delete()
    .eq("id", id.trim());

  if (dbError) {
    return jsonResponse({ error: dbError.message }, 400);
  }

  return jsonResponse({ ok: true }, 200);
});
