import { createClient } from '@supabase/supabase-js';
import type { User, Session, EmailOtpType } from '@supabase/supabase-js';
import type { AppRole } from '../types/roles';

function requireViteEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]?.trim();
  if (!value || value === 'your-supabase-anon-key') {
    throw new Error(
      `${name} is missing or still a placeholder. Copy .env.example to .env, set Supabase credentials (Dashboard → Project Settings → API), then restart the dev server.`,
    );
  }
  return value;
}

const supabaseUrl     = requireViteEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requireViteEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth helpers ───────────────────────────────────────────────────────────────

/** ACCE users — Microsoft SSO via Azure AD */
export async function signInWithMicrosoft(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'openid profile email',
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

/** External users (School, DE) — email + password */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Verifies an email-link token (invite / recovery / magiclink) using its
 * `token_hash`. Used by the custom `/auth/confirm` page so invite links can be
 * served from the EMCI domain instead of the raw Supabase verify URL — this
 * avoids the link being flagged/quarantined by mail security and avoids GET
 * prefetchers consuming the one-time token (verifyOtp is a POST).
 */
export async function verifyEmailToken(tokenHash: string, type: EmailOtpType): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
}

/** Sets the password for the currently authenticated user (e.g. when accepting an invite). */
export async function setUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── MFA helpers ────────────────────────────────────────────────────────────────

export interface MfaFactor {
  id:     string;
  type:   string;
  status: string;
}

/** Returns verified TOTP factors for the current user. */
export async function getMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []) as MfaFactor[];
}

/** Checks whether the session is fully MFA-verified (AAL2). */
export async function isMfaVerified(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.currentLevel === 'aal2';
}

/** Starts TOTP enrolment. Returns the QR code URI and secret for display. */
export async function enrollMfa(): Promise<{ id: string; qrCode: string; secret: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'EMCI Platform' });
  if (error) throw error;
  return {
    id:      data.id,
    qrCode:  data.totp.qr_code,
    secret:  data.totp.secret,
  };
}

/** Creates an MFA challenge for the given factorId. */
export async function challengeMfa(factorId: string): Promise<string> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data.id;
}

/** Verifies the TOTP code against an active challenge. */
export async function verifyMfa(factorId: string, challengeId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw error;
}

/** Un-enrols an MFA factor (used during re-enrolment). */
export async function unenrollMfa(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// ── User display helpers ───────────────────────────────────────────────────────

export interface AppUser {
  id:          string;
  email:       string;
  displayName: string;
  firstName:   string;
  avatarUrl:   string | null;
}

export function mapUser(user: User): AppUser {
  const meta  = user.user_metadata ?? {};
  const full  = (meta.full_name ?? meta.name ?? user.email ?? 'User') as string;
  const first = full.split(' ')[0] ?? full;
  return {
    id:          user.id,
    email:       user.email ?? '',
    displayName: full,
    firstName:   first,
    avatarUrl:   (meta.avatar_url ?? meta.picture ?? null) as string | null,
  };
}

// ── Role helpers ───────────────────────────────────────────────────────────────

export interface UserRoleRecord {
  role:               AppRole;
  school_id:            string | null;
  display_name:         string | null;
  email:                string;
  counsellor_email:     string | null;
  dataverse_owner_id:   string | null;
}

/**
 * Resolves the role for the current user via a SECURITY DEFINER RPC that
 * bypasses RLS. Handles both the normal lookup (by user_id) and the
 * first-login invite claim (by email when user_id is still null).
 */
export async function getUserRole(userId: string, email: string): Promise<UserRoleRecord | null> {
  const { data, error } = await supabase.rpc('emci_resolve_user_role', {
    p_user_id: userId,
    p_email:   email,
  });
  if (error || !data) return null;
  return data as UserRoleRecord;
}

// ── Team management helpers ────────────────────────────────────────────────────

export interface TeamMember {
  id:                 string;
  user_id:            string | null;
  email:              string;
  display_name:       string | null;
  role:               AppRole;
  school_id:          string | null;
  counsellor_email:   string | null;
  dataverse_owner_id: string | null;
  is_active:          boolean;
  created_at:         string;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('emci_user_roles')
    .select('id, user_id, email, display_name, role, school_id, counsellor_email, dataverse_owner_id, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export interface InactiveCounsellorOverride {
  id:                 string;
  dataverse_owner_id: string;
  display_name:       string | null;
  notes:              string | null;
  created_at:         string;
}

/** Portal-managed inactive counsellor overrides (Dataverse owner GUID). */
export async function listInactiveCounsellorOverrides(): Promise<InactiveCounsellorOverride[]> {
  const { data, error } = await supabase
    .from('emci_inactive_counsellors')
    .select('id, dataverse_owner_id, display_name, notes, created_at')
    .order('display_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InactiveCounsellorOverride[];
}

export async function addTeamMember(
  email: string,
  role: AppRole,
  displayName?: string,
  schoolId?: string,
  counsellorEmail?: string,
  dataverseOwnerId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .insert({
      email,
      role,
      display_name: displayName ?? null,
      school_id: schoolId ?? null,
      counsellor_email: counsellorEmail?.trim() || null,
      dataverse_owner_id: dataverseOwnerId?.trim() || null,
    });
  if (error) throw error;
}

/**
 * Adds a new team member AND sends them a Supabase invite email via the
 * `invite-user` edge function (which holds the service-role key).
 */
export async function inviteTeamMember(
  email: string,
  role: AppRole,
  displayName?: string,
  schoolId?: string,
  counsellorEmail?: string,
  dataverseOwnerId?: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: {
      email,
      role,
      displayName: displayName ?? null,
      schoolId:    schoolId    ?? null,
      counsellorEmail:   counsellorEmail?.trim() || null,
      dataverseOwnerId:  dataverseOwnerId?.trim() || null,
    },
  });
  if (error) {
    // Extract the real error message from the edge function response body
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error as string);
}

export async function updateTeamMemberRole(id: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .update({ role })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTeamMemberCounsellorScope(
  id: string,
  counsellorEmail: string | null,
  dataverseOwnerId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .update({
      counsellor_email: counsellorEmail?.trim() || null,
      dataverse_owner_id: dataverseOwnerId?.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Deactivates or reactivates a team member.
 * Calls the `toggle-user-active` edge function which updates `emci_user_roles`
 * AND bans/unbans the Supabase Auth user so they cannot log in while inactive.
 */
export async function toggleTeamMemberActive(
  id: string,
  userId: string | null,
  isActive: boolean,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('toggle-user-active', {
    body: { id, userId, isActive },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error as string);
}

/**
 * Permanently removes a team member.
 * Calls the `delete-user` edge function which deletes the Supabase Auth user
 * AND the `emci_user_roles` row, so a future invite is a clean fresh invite.
 */
export async function deleteTeamMember(
  id: string,
  userId: string | null,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { id, userId },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error as string);
}

// ── Platform settings ─────────────────────────────────────────────────────────

export interface PlatformSettings {
  id:                 number;
  maintenance_mode:   boolean;
  maintenance_message: string | null;
  updated_at:         string;
  updated_by:         string | null;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const { data, error } = await supabase
    .from('emci_platform_settings')
    .select('id, maintenance_mode, maintenance_message, updated_at, updated_by')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data as PlatformSettings | null;
}

export async function updateMaintenanceMode(
  enabled: boolean,
  message?: string | null,
): Promise<PlatformSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('emci_platform_settings')
    .update({
      maintenance_mode: enabled,
      maintenance_message: message?.trim() || null,
      updated_by: user?.id ?? null,
    })
    .eq('id', 1)
    .select('id, maintenance_mode, maintenance_message, updated_at, updated_by')
    .single();
  if (error) throw error;
  return data as PlatformSettings;
}
