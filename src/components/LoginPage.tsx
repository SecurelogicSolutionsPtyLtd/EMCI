import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Shield, Mail, Lock, Eye, EyeOff, Smartphone, Copy, Check, RefreshCw } from 'lucide-react';
import {
  signInWithMicrosoft,
  signInWithEmail,
  getMfaFactors,
  enrollMfa,
  unenrollMfa,
  challengeMfa,
  verifyMfa,
} from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { AuthShell, SectionHeader, ErrorBanner, INPUT_CLASS, BTN_PRIMARY } from './auth/AuthShell';
import { EMCI_BRAND, EMCI_PLATFORM, EMCI_PLATFORM_ADMINISTRATOR } from '../lib/programNaming';
import { MaintenanceNotice } from './MaintenanceNotice';

// ── LoginPage ─────────────────────────────────────────────────────────────────
// Handles three flows:
//   1. Microsoft SSO          — ACCE users
//   2. Email + Password       — External users (school, de)
//   3. MFA enrolment/verify   — Shown after email login when MFA is required

type LoginTab = 'microsoft' | 'email';

export function LoginPage() {
  const { stage, refresh } = useAuth();

  // Which tab is active on the sign-in card
  const [tab, setTab] = useState<LoginTab>('microsoft');

  // Email/password form
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // MFA state
  const [mfaFactorId,    setMfaFactorId]    = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode,        setMfaCode]        = useState('');
  const [mfaQrCode,      setMfaQrCode]      = useState<string | null>(null);
  const [mfaSecret,      setMfaSecret]      = useState<string | null>(null);
  const [secretCopied,   setSecretCopied]   = useState(false);

  // Kick off MFA flow when stage changes.
  // Guards prevent re-calling if the flow is already in progress (e.g. if the auth
  // state change fires again while the user has switched to their authenticator app).
  useEffect(() => {
    if (stage === 'mfa_enroll' && !mfaFactorId) void startEnrolment();
    if (stage === 'mfa_required' && !mfaChallengeId) void startVerification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Microsoft SSO ──────────────────────────────────────────────────────────

  async function handleMicrosoftSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithMicrosoft();
    } catch (e: any) {
      setError(e.message ?? 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  // ── Email / password ───────────────────────────────────────────────────────

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      await refresh();
    } catch (e: any) {
      setError(e.message ?? 'Sign-in failed. Check your email and password.');
      setLoading(false);
    }
  }

  // ── MFA enrolment ──────────────────────────────────────────────────────────

  async function startEnrolment() {
    setLoading(true);
    setError(null);
    try {
      // If the page reloaded mid-enrolment (e.g. mobile browser tab eviction or
      // switching to the authenticator app and back), Supabase may still hold an
      // unverified factor from the previous attempt. Unenroll it first so we can
      // create a fresh one — otherwise Supabase returns "factor already exists".
      const existing = await getMfaFactors();
      const stale = existing.find(f => f.status === 'unverified');
      if (stale) await unenrollMfa(stale.id);

      const { id, qrCode, secret } = await enrollMfa();
      setMfaFactorId(id);
      setMfaQrCode(qrCode);
      setMfaSecret(secret);
      const challengeId = await challengeMfa(id);
      setMfaChallengeId(challengeId);
    } catch (e: any) {
      setError(e.message ?? 'Failed to start MFA enrolment.');
    } finally {
      setLoading(false);
    }
  }

  // ── MFA verification ───────────────────────────────────────────────────────

  async function startVerification() {
    setLoading(true);
    setError(null);
    try {
      const factors = await getMfaFactors();
      const factor = factors[0];
      if (!factor) { setError('No MFA factor found.'); return; }
      setMfaFactorId(factor.id);
      const challengeId = await challengeMfa(factor.id);
      setMfaChallengeId(challengeId);
    } catch (e: any) {
      setError(e.message ?? 'Failed to start MFA verification.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || !mfaChallengeId) return;
    setLoading(true);
    setError(null);
    try {
      await verifyMfa(mfaFactorId, mfaChallengeId, mfaCode.replace(/\s/g, ''));
      await refresh();
    } catch (e: any) {
      setError(e.message ?? 'Invalid code. Please try again.');
      setMfaCode('');
      setLoading(false);
    }
  }

  function copySecret() {
    if (!mfaSecret) return;
    void navigator.clipboard.writeText(mfaSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (stage === 'mfa_enroll') {
    return (
      <AuthShell>
        <MaintenanceNotice />
        <SectionHeader
          icon={<Smartphone className="w-5 h-5 text-primary" />}
          title="Set up two-factor authentication"
          subtitle={`MFA is required before you can access the ${EMCI_PLATFORM}. Scan the QR code with your authenticator app.`}
        />
        {error && <ErrorBanner message={error} />}
        {loading && !mfaQrCode ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : mfaQrCode ? (
          <div className="space-y-5">
            <div className="flex justify-center bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm shadow-slate-900/[0.04]">
              <img src={mfaQrCode} alt="MFA QR Code" className="w-44 h-44" />
            </div>
            {mfaSecret && (
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 shadow-sm shadow-slate-900/[0.03]">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manual entry key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-slate-700 font-mono break-all">{mfaSecret}</code>
                  <button onClick={copySecret} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                    {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleMfaVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Enter the 6-digit code from your app</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="000 000"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  className={`${INPUT_CLASS} px-4 py-3 text-center text-lg font-mono tracking-[0.3em]`}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
                className={BTN_PRIMARY}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Verify and continue
              </button>
            </form>
          </div>
        ) : null}
      </AuthShell>
    );
  }

  if (stage === 'mfa_required') {
    return (
      <AuthShell>
        <SectionHeader
          icon={<Smartphone className="w-5 h-5 text-primary" />}
          title="Two-factor authentication"
          subtitle="Enter the 6-digit code from your authenticator app to continue."
        />
        {error && <ErrorBanner message={error} />}
        {loading && !mfaChallengeId ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              placeholder="000 000"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              className={`${INPUT_CLASS} px-4 py-3 text-center text-2xl font-mono tracking-[0.4em]`}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
              className={BTN_PRIMARY}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verify
            </button>
            <button
              type="button"
              onClick={() => void startVerification()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh code
            </button>
          </form>
        )}
      </AuthShell>
    );
  }

  if (stage === 'no_role') {
    return (
      <AuthShell>
        <SectionHeader
          icon={<Shield className="w-5 h-5 text-amber-500" />}
          title="Access pending"
          subtitle={`Your account has been authenticated but has not yet been granted access to the ${EMCI_PLATFORM}.`}
        />
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-4 text-sm text-amber-800 leading-relaxed shadow-sm shadow-amber-900/[0.04]">
          Please contact your {EMCI_PLATFORM_ADMINISTRATOR} to have your access configured. Once your role is assigned, refresh this page.
        </div>
        <motion.button
          type="button"
          onClick={() => void refresh()}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 mt-2 px-5 py-3 text-sm font-semibold text-slate-600 border border-slate-200/80 rounded-xl bg-white shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50 hover:shadow-md transition-all duration-300"
        >
          <RefreshCw className="w-4 h-4" />
          Check access again
        </motion.button>
      </AuthShell>
    );
  }

  // ── Main sign-in card ──────────────────────────────────────────────────────

  return (
    <AuthShell>
      <MaintenanceNotice />
      {/* Tab switcher */}
      <div className="relative flex rounded-xl bg-slate-100/90 p-1 mb-6 shadow-inner shadow-slate-900/[0.04]">
        <motion.div
          layoutId="login-tab-pill"
          className="absolute inset-y-1 rounded-lg bg-white shadow-md shadow-slate-900/[0.08] ring-1 ring-slate-900/[0.04]"
          style={{
            width: 'calc(50% - 4px)',
            left: tab === 'microsoft' ? 4 : 'calc(50%)',
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
        <button
          type="button"
          onClick={() => { setTab('microsoft'); setError(null); }}
          className={`relative z-10 flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors duration-200 ${
            tab === 'microsoft' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ACCE Staff
        </button>
        <button
          type="button"
          onClick={() => { setTab('email'); setError(null); }}
          className={`relative z-10 flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors duration-200 ${
            tab === 'email' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          School / DE Login
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence mode="wait">
        {tab === 'microsoft' ? (
          <motion.div key="microsoft" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Sign in with your SecureLogic Microsoft account to access the {EMCI_BRAND} programme dashboard.
            </p>
            <motion.button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99, y: 0 }}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-xl font-semibold text-sm transition-colors duration-300 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F35325"/>
                  <rect x="11" y="1" width="9" height="9" fill="#81BC06"/>
                  <rect x="1" y="11" width="9" height="9" fill="#05A6F0"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFBA08"/>
                </svg>
              )}
              {loading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              School administrators, principals, and Department of Education users sign in below. MFA is required.
            </p>
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@organisation.edu.au"
                    className={`${INPUT_CLASS} pl-10 pr-4 py-3 text-sm`}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${INPUT_CLASS} pl-10 pr-10 py-3 text-sm`}
                    required
                    autoComplete="current-password"
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
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                whileHover={{ y: loading || !email || !password ? 0 : -2 }}
                whileTap={{ scale: 0.99, y: 0 }}
                className={`${BTN_PRIMARY} mt-1`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        <span>
          {tab === 'microsoft'
            ? 'Secured via Microsoft SSO — your credentials are never stored by EMCI.'
            : 'External login requires multi-factor authentication (MFA).'}
        </span>
      </div>
    </AuthShell>
  );
}
