import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  LogOut,
  MailCheck,
  RefreshCw,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { FIREBASE_PROJECT_ID } from '../../lib/firebase';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Postgraduate',
];

export const AuthScreen: React.FC = () => {
  const {
    firebaseUser,
    pendingVerificationEmail,
    needsProfileSetup,
    signIn,
    signUp,
    signInWithGoogle,
    completeOnboardingProfile,
    resendVerificationEmail,
    checkEmailVerification,
    signOut,
  } = usePortal();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up / Onboarding state
  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('1st Year');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await signUp({
      name,
      email,
      password,
      college,
      branch,
      year,
    });
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleGoogle = async () => {
    setError('');
    setSubmitting(true);
    const res = await signInWithGoogle();
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await completeOnboardingProfile({
      name: name || firebaseUser?.displayName || 'Student',
      college,
      branch,
      year,
    });
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleCheckVerified = async () => {
    setError('');
    setSubmitting(true);
    const res = await checkEmailVerification();
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleResend = async () => {
    setError('');
    setSubmitting(true);
    const res = await resendVerificationEmail();
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const showEmailProviderHint = error.includes('Email/Password sign-in is not yet enabled');

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Compact Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <span className="font-[var(--font-display)] text-base font-bold tracking-tight">
            CampusDesk
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Centered Auth Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-[460px] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
          {/* State 1: Email Verification Gate */}
          {pendingVerificationEmail ? (
            <div className="space-y-5">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)] flex items-center justify-center">
                <MailCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Verify your student email
                </h1>
                <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">
                  We sent a verification link to{' '}
                  <strong className="text-[var(--text-primary)]">
                    {pendingVerificationEmail}
                  </strong>
                  . Open your inbox, click the verification link, and then continue below.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--danger)]"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCheckVerified}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Checking...' : "I've Verified My Email"}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleResend}
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Verification Email</span>
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Use a different account</span>
                </button>
              </div>
            </div>
          ) : needsProfileSetup ? (
            /* State 2: First-Time Student Profile Onboarding (e.g. Google Sign-In) */
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="mb-2">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Complete your student profile
                </h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Signed in as{' '}
                  <strong className="text-[var(--text-primary)]">
                    {firebaseUser?.email}
                  </strong>
                  . Add your campus details to start your clean workspace.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--danger)]"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  College / University
                </label>
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Enter your institution name"
                  className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Branch / Course
                  </label>
                  <input
                    type="text"
                    required
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Academic Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {YEAR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                <span>{submitting ? 'Setting up workspace...' : 'Enter CampusDesk'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={signOut}
                className="w-full min-h-[38px] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Sign out and switch account
              </button>
            </form>
          ) : (
            /* State 3: Standard Login / Sign Up */
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {mode === 'login' ? 'Sign in to CampusDesk' : 'Create your student account'}
                </h1>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  {mode === 'login'
                    ? 'Sync your subjects, folders, shared notes, and real-time study groups across devices.'
                    : 'Start with a clean cloud workspace built around your semester.'}
                </p>
              </div>

              {/* Mode Toggle */}
              <div
                role="tablist"
                className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-[var(--bg-subtle)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
                    mode === 'signup'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--danger)] space-y-2"
                >
                  <p>{error}</p>
                  {showEmailProviderHint && (
                    <a
                      href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline font-semibold"
                    >
                      <span>Open Firebase Authentication Providers</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      Student Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="w-full min-h-[44px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full min-h-[44px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-3.5 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
                  >
                    <span>{submitting ? 'Signing in...' : 'Log In with Email'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Email
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@college.edu"
                        className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-3.5 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-college"
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      College / University
                    </label>
                    <input
                      id="signup-college"
                      type="text"
                      required
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="Enter your institution name"
                      className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-branch"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Branch / Course
                      </label>
                      <input
                        id="signup-branch"
                        type="text"
                        required
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-year"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Academic Year
                      </label>
                      <select
                        id="signup-year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        {YEAR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
                  >
                    <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Divider + Instant Google Sign-In */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-hairline)]" />
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  or
                </span>
                <div className="h-px flex-1 bg-[var(--border-hairline)]" />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogle}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
