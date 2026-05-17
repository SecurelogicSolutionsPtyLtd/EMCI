import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Shield, Mail, Lock, Eye, EyeOff, Smartphone, Copy, Check, RefreshCw } from 'lucide-react';
import {
  signInWithMicrosoft,
  signInWithEmail,
  getMfaFactors,
  enrollMfa,
  challengeMfa,
  verifyMfa,
} from '../services/supabase';
import { useAuth } from '../context/AuthContext';

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

  // Kick off MFA flow when stage changes
  useEffect(() => {
    if (stage === 'mfa_enroll') void startEnrolment();
    if (stage === 'mfa_required') void startVerification();
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
        <SectionHeader
          icon={<Smartphone className="w-5 h-5 text-primary" />}
          title="Set up two-factor authentication"
          subtitle="MFA is required before you can access the EMCI platform. Scan the QR code with your authenticator app."
        />
        {error && <ErrorBanner message={error} />}
        {loading && !mfaQrCode ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : mfaQrCode ? (
          <div className="space-y-5">
            <div className="flex justify-center bg-white rounded-xl p-4 border border-slate-100">
              <img src={mfaQrCode} alt="MFA QR Code" className="w-44 h-44" />
            </div>
            {mfaSecret && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-center text-lg font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
          subtitle="Your account has been authenticated but has not yet been granted access to the EMCI platform."
        />
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-800 leading-relaxed">
          Please contact your EMCI platform administrator to have your access configured. Once your role is assigned, refresh this page.
        </div>
        <button
          onClick={() => void refresh()}
          className="w-full flex items-center justify-center gap-2 mt-2 px-5 py-3 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Check access again
        </button>
      </AuthShell>
    );
  }

  // ── Main sign-in card ──────────────────────────────────────────────────────

  return (
    <AuthShell>
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          onClick={() => { setTab('microsoft'); setError(null); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'microsoft' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          ACCE Staff
        </button>
        <button
          onClick={() => { setTab('email'); setError(null); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          School / DE Login
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence mode="wait">
        {tab === 'microsoft' ? (
          <motion.div key="microsoft" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Sign in with your SecureLogic Microsoft account to access the EMCI programme dashboard.
            </p>
            <button
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
            </button>
          </motion.div>
        ) : (
          <motion.div key="email" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
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

// ── Shared layout components ───────────────────────────────────────────────────

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/5" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-slate-200/60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-slate-200/60" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-[2px]" />)}
                </div>
              </div>
              <div>
                <p className="text-base font-black tracking-tight text-slate-900 leading-none">EMCI</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-tight mt-0.5">Student Management Platform</p>
              </div>
            </div>
            {children}
          </div>
        </motion.div>
      </div>
      <div className="shrink-0 text-center py-4 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
        EMCI Student Management Platform · SecureLogic Solutions · {new Date().getFullYear()}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h1 className="text-lg font-black text-slate-900 tracking-tight">{title}</h1>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"
    >
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-700 leading-relaxed">{message}</p>
    </motion.div>
  );
}
