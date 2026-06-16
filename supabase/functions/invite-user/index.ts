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

  // JWT is already verified by the Supabase gateway (verify_jwt: true on this function).
  // No need for a secondary auth.getUser() call.

  // Parse the request body
  let body: { email?: unknown; role?: unknown; displayName?: unknown; schoolId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { email, role, displayName, schoolId } = body;
  if (typeof email !== "string" || !email.trim()) {
    return jsonResponse({ error: "email is required" }, 400);
  }
  if (typeof role !== "string" || !role.trim()) {
    return jsonResponse({ error: "role is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const cleanEmail       = email.trim();
  const cleanRole        = role.trim();
  const cleanDisplayName = typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
  const cleanSchoolId    = typeof schoolId    === "string" && schoolId.trim()    ? schoolId.trim()    : null;

  // 1a. Attempt to insert a fresh row (is_active: true for visibility in the UI).
  const { error: insertError } = await admin
    .from("emci_user_roles")
    .insert({ email: cleanEmail, role: cleanRole, display_name: cleanDisplayName, school_id: cleanSchoolId, is_active: true });

  if (insertError) {
    const isDuplicate = insertError.code === "23505" || insertError.message.includes("unique constraint");
    if (!isDuplicate) {
      return jsonResponse({ error: insertError.message }, 400);
    }

    // 1b. Row already exists — update role/name/school and ensure is_active is true
    //     so the user appears in the team list. Admin can deactivate afterward if needed.
    const { error: updateError } = await admin
      .from("emci_user_roles")
      .update({ role: cleanRole, display_name: cleanDisplayName, school_id: cleanSchoolId, is_active: true })
      .eq("email", cleanEmail);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }
  }

  // 2. Send a Supabase invite email — creates the auth user (if new) and emails a sign-in link.
  //    Safe to call for existing users; Supabase will resend the invite.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim());

  if (inviteError && !inviteError.message.toLowerCase().includes("already")) {
    return jsonResponse({ error: `User saved but invite email failed: ${inviteError.message}` }, 207);
  }

  return jsonResponse({ ok: true }, 200);
});
