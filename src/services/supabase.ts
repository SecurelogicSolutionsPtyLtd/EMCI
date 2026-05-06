import { createClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole } from '../types/roles';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
  role:        AppRole;
  school_id:   string | null;
  display_name: string | null;
  email:       string;
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
  id:           string;
  user_id:      string | null;
  email:        string;
  display_name: string | null;
  role:         AppRole;
  school_id:    string | null;
  is_active:    boolean;
  created_at:   string;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('emci_user_roles')
    .select('id, user_id, email, display_name, role, school_id, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function addTeamMember(
  email: string,
  role: AppRole,
  displayName?: string,
  schoolId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .insert({ email, role, display_name: displayName ?? null, school_id: schoolId ?? null });
  if (error) throw error;
}

export async function updateTeamMemberRole(id: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .update({ role })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('emci_user_roles')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}
