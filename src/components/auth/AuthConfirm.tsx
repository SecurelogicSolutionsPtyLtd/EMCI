import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { verifyEmailToken, setUserPassword, getSession, signOut } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { AuthShell, SectionHeader, ErrorBanner, INPUT_CLASS, BTN_PRIMARY } from './AuthShell';
import { EMCI_BRAND, EMCI_PLATFORM_ADMINISTRATOR } from '../../lib/programNaming';
import {
  INVITE_LINK_TTL_MS,
  parseInviteIssuedAt,
  inviteDeadlineFromIssuedAt,
  isInviteExpired,
  readPendingInviteSetup,
  writePendingInviteSetup,
  clearPendingInviteSetup,
} from '../../lib/inviteLink';

// ── AuthConfirm ───────────────────────────────────────────────────────────────
// Handles the EMCI-domain invite link: /auth/confirm?token_hash=…&type=invite
// 1. Verifies the one-time token (establishes a session)
// 2. Invited users set their password
// 3. Hands off to the normal auth flow (MFA enrolment) by leaving this route
//
// Keeping this link on the EMCI domain (instead of the raw Supabase verify URL)
// prevents mail security from quarantining the email.

type Phase = 'verifying' | 'set_password' | 'submitting' | 'already_signed_up' | 'error';

const MIN_PASSWORD_LENGTH = 8;

function inviteExpiredMessage(): string {
  return `This invitation link expired after 1 hour. Please ask your ${EMCI_PLATFORM_ADMINISTRATOR} to send a new invite.`;
}

export function AuthConfirm() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [phase,   setPhase]   = useState<Phase>('verifying');
  const [error,   setError]   = useState<string | null>(null);

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);

  // The one-time token is held until password submit (not consumed on open),
  // so the link stays reusable from any browser/device until the hour expires.
  const tokenRef    = useRef<string | null>(null);
  const typeRef     = useRef<EmailOtpType>('invite');
  const deadlineRef = useRef<number>(0);

  // Guard against React 18 StrictMode double-invoke of the init effect.
  const initRef = useRef(false);

  const expireInviteSetup = useCallback(async () => {
    clearPendingInviteSetup();
    try {
      await signOut();
    } catch {
      /* session may already be gone */
    }
    setError(inviteExpiredMessage());
    setPhase('error');
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const params    = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type      = (params.get('type') ?? 'invite') as EmailOtpType;
    const issuedAtMs = parseInviteIssuedAt(params.get('issued_at'));

    void (async () => {
      // Derive the 1-hour deadline from the link's issued_at; fall back to any
      // stored deadline (resume in the same browser) or one hour from now.
      const stored = readPendingInviteSetup();
      const deadlineMs = issuedAtMs
        ? inviteDeadlineFromIssuedAt(issuedAtMs)
        : stored?.deadlineMs ?? Date.now() + INVITE_LINK_TTL_MS;

      if (isInviteExpired(deadlineMs)) {
        clearPendingInviteSetup();
        setError(inviteExpiredMessage());
        setPhase('error');
        return;
      }

      if (tokenHash) {
        // Defer verification until submit so the token isn't consumed on open.
        // The link stays valid (any browser/device) until used or the hour ends.
        // verifyOtp is a POST, so GET link-prefetch scanners won't consume it.
        tokenRef.current    = tokenHash;
        typeRef.current     = type;
        deadlineRef.current = deadlineMs;
        writePendingInviteSetup(deadlineMs);
        setPhase('set_password');
        return;
      }

      // No token in the URL — only resumable if this browser already holds a
      // session from a prior step in this flow.
      const session = await getSession();
      if (session && stored && !isInviteExpired(stored.deadlineMs)) {
        deadlineRef.current = stored.deadlineMs;
        setPhase('set_password');
        return;
      }
      clearPendingInviteSetup();
      setError(`This invitation link is missing its security token. Please request a new invite from your ${EMCI_PLATFORM_ADMINISTRATOR}.`);
      setPhase('error');
    })();
  }, []);

  useEffect(() => {
    if (phase !== 'set_password' && phase !== 'submitting') return;
    if (!deadlineRef.current) return;

    const msLeft = deadlineRef.current - Date.now();
    if (msLeft <= 0) {
      void expireInviteSetup();
      return;
    }

    const timer = window.setTimeout(() => {
      void expireInviteSetup();
    }, msLeft);

    return () => window.clearTimeout(timer);
  }, [phase, expireInviteSetup]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (deadlineRef.current && isInviteExpired(deadlineRef.current)) {
      await expireInviteSetup();
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPhase('submitting');
    setError(null);
    try {
      // Consume the one-time token now to establish a session. Within the valid
      // window, a failed verification means the single-use invite token has
      // already been used — i.e. the account is already activated (the user has
      // already signed up, possibly on another device). Don't offer password
      // setup again; send them to sign in instead.
      const token = tokenRef.current;
      if (token) {
        try {
          await verifyEmailToken(token, typeRef.current);
        } catch {
          clearPendingInviteSetup();
          setPhase('already_signed_up');
          return;
        }
      }
      await setUserPassword(password);
      clearPendingInviteSetup();
      // Session is active now; refreshing resolves the auth stage (school/DE
      // users → MFA enrolment) before we leave this route.
      await refresh();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Could not set your password. Please try again.');
      setPhase('set_password');
    }
  }

  if (phase === 'verifying') {
    return (
      <AuthShell>
        <SectionHeader
          icon={<ShieldCheck className="w-5 h-5 text-primary" />}
          title="Confirming your invitation"
          subtitle="Verifying your secure invitation link — this will only take a moment."
        />
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (phase === 'already_signed_up') {
    return (
      <AuthShell>
        <SectionHeader
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          title="You've already signed up"
          subtitle={`This ${EMCI_BRAND} account is already active. Please sign in with your email and password.`}
        />
        <button type="button" onClick={() => navigate('/', { replace: true })} className={BTN_PRIMARY}>
          Go to sign in
        </button>
      </AuthShell>
    );
  }

  if (phase === 'error') {
    return (
      <AuthShell>
        <SectionHeader
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          title="Invitation link problem"
          subtitle="We couldn't confirm this invitation."
        />
        {error && <ErrorBanner message={error} />}
        <button type="button" onClick={() => navigate('/', { replace: true })} className={BTN_PRIMARY}>
          Go to sign in
        </button>
      </AuthShell>
    );
  }

  const submitting = phase === 'submitting';

  return (
    <AuthShell>
      <SectionHeader
        icon={<Lock className="w-5 h-5 text-primary" />}
        title="Create your password"
        subtitle={`Set a password to finish activating your ${EMCI_BRAND} account. You'll set up two-factor authentication next.`}
      />
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSetPassword} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">New password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`${INPUT_CLASS} pl-10 pr-10 py-3 text-sm`}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className={`${INPUT_CLASS} pl-10 pr-4 py-3 text-sm`}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !password || !confirm}
          className={`${BTN_PRIMARY} mt-1`}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Saving…' : 'Set password and continue'}
        </button>
      </form>
    </AuthShell>
  );
}
