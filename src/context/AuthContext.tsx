import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, mapUser, getUserRole, isMfaVerified, type AppUser } from '../services/supabase';
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
  userRole:   AppRole | null;
  schoolId:   string | null;
  stage:      AuthStage;
  /** Re-checks role and MFA after external changes (e.g. admin grants a role). */
  refresh:    () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [stage,    setStage]    = useState<AuthStage>('loading');

  const resolve = useCallback(async () => {
    setStage('loading');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthUser(null);
      setUserRole(null);
      setSchoolId(null);
      setStage('unauthenticated');
      return;
    }

    const user = mapUser(session.user);
    setAuthUser(user);

    // Fetch the user's role record
    const roleRecord = await getUserRole(user.id, user.email);
    if (!roleRecord) {
      setUserRole(null);
      setSchoolId(null);
      setStage('no_role');
      return;
    }

    setUserRole(roleRecord.role);
    setSchoolId(roleRecord.school_id);

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
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    resolve();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthUser(null);
        setUserRole(null);
        setSchoolId(null);
        setStage('unauthenticated');
      } else {
        // Re-resolve when session changes (e.g. MFA verified, token refreshed)
        resolve();
      }
    });

    return () => subscription.unsubscribe();
  }, [resolve]);

  return (
    <AuthContext.Provider value={{ authUser, userRole, schoolId, stage, refresh: resolve }}>
      {children}
    </AuthContext.Provider>
  );
}
