import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, mapUser, getUserRole, isMfaVerified, signOut, type AppUser } from '../services/supabase';
import type { AppRole } from '../types/roles';
import { getRoleGroup } from '../types/roles';

// ── Types ──────────────────────────────────────────────────────────────────────

type AuthStage =
  | 'loading'        // Resolving session on mount
  | 'unauthenticated' // No session
  | 'mfa_required'   // Email/password login done but AAL1 only; need MFA verify
  | 'mfa_enroll'     // No MFA factor set up yet; must enrol before proceeding
  | 'no_role'        // Authenticated + MFA ok but no emci_user_roles row
  | 'ready';         // Fully authenticated and authorised

export interface AuthContextValue {
  authUser:   AppUser | null;
  /** Effective role — preview role when impersonating, otherwise actual Supabase role. */
  userRole:   AppRole | null;
  /** Always the real Supabase role, unaffected by impersonation. */
  actualRole: AppRole | null;
  /** Effective school ID — preview school when impersonating, otherwise actual. */
  schoolId:   string | null;
  stage:      AuthStage;
  isImpersonating: boolean;
  setImpersonation: (role: AppRole, schoolId: string | null) => void;
  clearImpersonation: () => void;
  /** Re-checks role and MFA after external changes (e.g. admin grants a role). */
  refresh:    () => Promise<void>;
  /** Ends the Supabase session and clears preview state. */
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

const SESSION_KEY_ROLE     = 'emci_preview_role';
const SESSION_KEY_SCHOOL   = 'emci_preview_school_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser,       setAuthUser]       = useState<AppUser | null>(null);
  const [actualRole,     setActualRole]     = useState<AppRole | null>(null);
  const [actualSchoolId, setActualSchoolId] = useState<string | null>(null);
  const [stage,          setStage]          = useState<AuthStage>('loading');

  // Preview / impersonation — UI-only, never touches the database
  const [previewRole,     setPreviewRole]     = useState<AppRole | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY_ROLE) as AppRole | null; }
    catch { return null; }
  });
  const [previewSchoolId, setPreviewSchoolId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY_SCHOOL); }
    catch { return null; }
  });

  // Derived effective values consumed by the rest of the app
  const userRole = previewRole     ?? actualRole;
  const schoolId = previewSchoolId ?? actualSchoolId;
  const isImpersonating = previewRole !== null;

  function setImpersonation(role: AppRole, sid: string | null) {
    setPreviewRole(role);
    setPreviewSchoolId(sid);
    try {
      sessionStorage.setItem(SESSION_KEY_ROLE, role);
      if (sid) sessionStorage.setItem(SESSION_KEY_SCHOOL, sid);
      else sessionStorage.removeItem(SESSION_KEY_SCHOOL);
    } catch { /* private/incognito — ignore */ }
  }

  function clearImpersonation() {
    setPreviewRole(null);
    setPreviewSchoolId(null);
    try {
      sessionStorage.removeItem(SESSION_KEY_ROLE);
      sessionStorage.removeItem(SESSION_KEY_SCHOOL);
    } catch { /* ignore */ }
  }

  const signOutUser = useCallback(async () => {
    clearImpersonation();
    await signOut();
  }, []);

  const resolve = useCallback(async () => {
    setStage('loading');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthUser(null);
      setActualRole(null);
      setActualSchoolId(null);
      clearImpersonation();
      setStage('unauthenticated');
      return;
    }

    const user = mapUser(session.user);
    setAuthUser(user);

    // Fetch the user's role record
    const roleRecord = await getUserRole(user.id, user.email);
    if (!roleRecord) {
      setActualRole(null);
      setActualSchoolId(null);
      setStage('no_role');
      return;
    }

    setActualRole(roleRecord.role);
    setActualSchoolId(roleRecord.school_id);

    // ACCE users authenticate via Microsoft SSO — no MFA requirement
    if (getRoleGroup(roleRecord.role) === 'acce') {
      setStage('ready');
      return;
    }

    // External users (school, de) must complete MFA
    const verified = await isMfaVerified();
    if (verified) {
      setStage('ready');
      return;
    }

    // Determine whether user needs to enrol or just verify
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasEnrolled = (factors?.totp ?? []).some((f: { status: string }) => f.status === 'verified');
    setStage(hasEnrolled ? 'mfa_required' : 'mfa_enroll');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — clearImpersonation is stable

  // Bootstrap on mount
  useEffect(() => {
    resolve();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthUser(null);
        setActualRole(null);
        setActualSchoolId(null);
        clearImpersonation();
        setStage('unauthenticated');
      } else {
        resolve();
      }
    });

    return () => subscription.unsubscribe();
  }, [resolve]);

  return (
    <AuthContext.Provider value={{
      authUser,
      userRole,
      actualRole,
      schoolId,
      stage,
      isImpersonating,
      setImpersonation,
      clearImpersonation,
      refresh: resolve,
      signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
