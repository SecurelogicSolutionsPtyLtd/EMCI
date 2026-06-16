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

  let body: { id?: unknown; userId?: unknown; isActive?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id, userId, isActive } = body;

  if (typeof id !== "string" || !id.trim()) {
    return jsonResponse({ error: "id is required" }, 400);
  }
  if (typeof isActive !== "boolean") {
    return jsonResponse({ error: "isActive (boolean) is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Update is_active in emci_user_roles
  const { error: dbError } = await admin
    .from("emci_user_roles")
    .update({ is_active: isActive })
    .eq("id", id.trim());

  if (dbError) {
    return jsonResponse({ error: dbError.message }, 400);
  }

  // 2. Sync the Supabase Auth user ban state (only when a user_id exists)
  if (typeof userId === "string" && userId.trim()) {
    const banDuration = isActive ? "none" : "876600h"; // "none" = unban; 876600h ≈ 100 years
    const { error: authError } = await admin.auth.admin.updateUserById(userId.trim(), {
      ban_duration: banDuration,
    });

    if (authError) {
      // DB already updated — report partial success rather than hiding the error
      return jsonResponse(
        { error: `Status updated but auth ban failed: ${authError.message}` },
        207,
      );
    }
  }

  return jsonResponse({ ok: true }, 200);
});
