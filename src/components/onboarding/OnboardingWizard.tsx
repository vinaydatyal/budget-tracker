'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Wallet, Tag, CheckCircle, LogIn, Globe, Settings as SettingsIcon, Check } from 'lucide-react';
import { COMMON_CURRENCIES } from '@/lib/currency';

const STARTER_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#ef4444', type: 'expense' as const },
  { name: 'Transport', icon: '🚗', color: '#f97316', type: 'expense' as const },
  { name: 'Shopping', icon: '🛍️', color: '#8b5cf6', type: 'expense' as const },
  { name: 'Healthcare', icon: '💊', color: '#22c55e', type: 'expense' as const },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', type: 'expense' as const },
  { name: 'Utilities', icon: '💡', color: '#f59e0b', type: 'expense' as const },
  { name: 'Business', icon: '💼', color: '#6366f1', type: 'income' as const },
];

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'];

export function OnboardingWizard() {
  const { state, dispatch, updatePreferences, isInitializing } = useApp();
  const { user, signInWithGoogle } = useAuth();
  
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState(state.currency || 'USD');
  const [accountName, setAccountName] = useState('Main Checking');
  const [accountType, setAccountType] = useState('checking');
  const [accountColor, setAccountColor] = useState('#6366f1');
  const [selectedCats, setSelectedCats] = useState<number[]>([0, 1, 2, 6, 7]);
  const [enableBusiness, setEnableBusiness] = useState(!!state.preferences.enableBusinessMode);

  // If already completed onboarding or still initializing, don't show
  if (state.preferences.hasCompletedOnboarding || isInitializing) return null;

  if (typeof window !== 'undefined' && sessionStorage.getItem('drive_expired') === 'true') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
          <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
            <SettingsIcon size={32} color="var(--expense)" />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>Session Expired</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your Google Drive sync session has expired (Google limits this to 1 hour). Please re-authenticate to restore your cloud data and continue.
            </p>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px 16px' }} onClick={signInWithGoogle}>
            Re-authenticate with Google
          </button>
        </div>
      </div>
    );
  }

  function toggleCat(i: number) {
    setSelectedCats(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  function handleFinish() {
    // Dispatch Currency
    dispatch({ type: 'SET_CURRENCY', payload: currency });

    // Only create account if they don't have any yet
    if (state.accounts.length === 0) {
      const accId = `acc-${Date.now()}`;
      dispatch({
        type: 'ADD_ACCOUNT',
        payload: { id: accId, name: accountName, assetType: accountType as any, incomeSource: 'salary', color: accountColor }
      });
    }

    // Only create categories if they don't have any yet
    if (state.categories.length === 0) {
      selectedCats.forEach((i, idx) => {
        const cat = STARTER_CATEGORIES[i];
        dispatch({
          type: 'ADD_CATEGORY',
          payload: { id: `cat-${Date.now()}-${idx}`, name: cat.name, icon: cat.icon, color: cat.color, type: cat.type }
        });
      });
    }

    // Update Preferences
    updatePreferences({
      enableBusinessMode: enableBusiness,
      hasCompletedOnboarding: true
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: '40px 48px', maxWidth: 560, width: '100%',
        border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              height: 4, flex: 1, borderRadius: 99,
              background: s <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step 1: Welcome & Currency */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Wallet size={28} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Welcome to Solv! 👋</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>Let's set up your financial hub.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {!user && (
                <div style={{ background: 'var(--bg-modifier-hover)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <button onClick={signInWithGoogle} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                    <LogIn size={18} /> Sign in with Google (Recommended)
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                    Securely backup your data to the cloud. You can also continue as a Guest.
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} /> Primary Base Currency
                </label>
                <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                  {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>You can log transactions in any currency later.</p>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Account & Categories */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--income-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Tag size={28} color="var(--income)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>First Account & Categories</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Create a checking account and select starter categories.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Account Name</label>
                  <input className="form-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Main Checking" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Color</label>
                  <input type="color" value={accountColor} onChange={e => setAccountColor(e.target.value)} style={{ width: '100%', height: 40, border: 'none', background: 'none', cursor: 'pointer' }} />
                </div>
              </div>
            </div>
            
            <label className="form-label">Starter Categories</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {STARTER_CATEGORIES.map((cat, i) => {
                const sel = selectedCats.includes(i);
                return (
                  <div key={i} onClick={() => toggleCat(i)} style={{
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    border: `2px solid ${sel ? cat.color : 'var(--border)'}`,
                    background: sel ? `${cat.color}15` : 'var(--bg-input)',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{cat.name}</div>
                    {sel && <CheckCircle size={14} color={cat.color} />}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--info-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <SettingsIcon size={28} color="var(--info)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Preferences</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>
              Almost done! You can change this later in Settings.
            </p>
            
            <div className="card" style={{ padding: 16, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Business Mode</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Enable advanced tools like client tracking and automated split rules.</p>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={enableBusiness} onChange={e => setEnableBusiness(e.target.checked)} />
                  <span className="ios-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button
              className="btn btn-primary"
              disabled={(step === 1 && !currency) || (step === 2 && !accountName.trim())}
              onClick={() => setStep(s => s + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button className="btn btn-primary" onClick={handleFinish}>
              Finish Setup <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
