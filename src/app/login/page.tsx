'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Cloud, 
  ArrowRight, 
  LogOut, 
  CheckCircle2, 
  ChevronLeft,
  Lock,
  Mail,
  KeyRound,
  UserPlus,
  LogIn
} from 'lucide-react';

function LoginForm() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
      router.push(redirectUrl);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMessage(err?.message || 'Could not sign in with Google. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.push(redirectUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(ellipse at 50% 10%, rgba(129, 140, 248, 0.12), transparent 60%), var(--bg-base)',
      color: 'var(--text-main)',
      position: 'relative'
    }}>
      {/* Back to Home Button */}
      <div style={{ position: 'absolute', top: 24, left: 24 }}>
        <Link 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            transition: 'all 0.2s'
          }}
        >
          <ChevronLeft size={16} /> Back to Home
        </Link>
      </div>

      <div style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: 56, 
            height: 56, 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <svg viewBox="0 0 24 24" width="56" height="56" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 6px 16px var(--accent-glow))' }}>
              <defs>
                <linearGradient id="heart-grad-login" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--balance)', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path fill="url(#heart-grad-login)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span style={{ position: 'relative', zIndex: 1, marginTop: '-5px', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>SV</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Solv
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Two distinct streams, One secure vault
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}>
          {user ? (
            /* Logged In State */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--balance))',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 4px 16px var(--accent-glow)'
              }}>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--income)', fontSize: 12, fontWeight: 600, background: 'var(--income-subtle)', padding: '4px 10px', borderRadius: 20, marginBottom: 8 }}>
                  <CheckCircle2 size={13} /> Active Firebase Session
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
                  {user.displayName || user.email}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Cloud Storage Active ({user.email})
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <Link
                  href={redirectUrl}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px 20px',
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px var(--accent-glow)'
                  }}
                >
                  Continue to Dashboard <ArrowRight size={16} />
                </Link>

                <button
                  onClick={handleSignOut}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: 14,
                    color: 'var(--expense)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <LogOut size={16} /> Sign Out / Switch Account
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out / Login Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Tab Selector: Sign In vs Sign Up */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-input)',
                borderRadius: 10,
                padding: 3,
                border: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: authMode === 'signin' ? 'var(--accent)' : 'transparent',
                    color: authMode === 'signin' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: authMode === 'signup' ? 'var(--accent)' : 'transparent',
                    color: authMode === 'signup' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Create Account
                </button>
              </div>

              {errorMessage && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--expense-subtle)',
                  border: '1px solid var(--expense)',
                  color: 'var(--expense)',
                  fontSize: 13,
                  lineHeight: 1.4
                }}>
                  {errorMessage}
                </div>
              )}

              {/* 1. Google 1-Click Sign-in via Firebase */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSubmitting || loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  opacity: isSubmitting || loading ? 0.7 : 1
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isSubmitting ? 'Authenticating with Firebase...' : 'Continue with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or with email</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* 2. Email & Password Form via Firebase */}
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--text-main)',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--text-main)',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '11px 18px',
                    fontSize: 14,
                    fontWeight: 600,
                    marginTop: 4,
                    boxShadow: '0 4px 12px var(--accent-glow)'
                  }}
                >
                  {isSubmitting ? (
                    'Processing...'
                  ) : authMode === 'signin' ? (
                    <><LogIn size={16} /> Sign In</>
                  ) : (
                    <><UserPlus size={16} /> Create Free Account</>
                  )}
                </button>
              </form>

              {/* Guest Access Alternative */}
              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>
                  Want to try without creating an account?
                </p>
                <Link
                  href={redirectUrl}
                  style={{
                    color: 'var(--accent)',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Continue as Guest (Offline Mode) <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Feature & Security Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          width: '100%'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
              <Cloud size={16} /> Cloud Firestore
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Automatic real-time sync across your devices with zero token expiration.
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--balance)', fontSize: 13, fontWeight: 600 }}>
              <Lock size={16} /> Private Vault
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Per-user data isolation. Financial data stays encrypted and completely yours.
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          By continuing, you agree to Solv&apos;s Terms of Service & Privacy Policy.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading Solv Login...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
