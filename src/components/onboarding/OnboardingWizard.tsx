'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ArrowRight, Wallet, Tag, CheckCircle } from 'lucide-react';

const STARTER_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#ef4444', type: 'expense' as const },
  { name: 'Transport', icon: '🚗', color: '#f97316', type: 'expense' as const },
  { name: 'Shopping', icon: '🛍️', color: '#8b5cf6', type: 'expense' as const },
  { name: 'Healthcare', icon: '💊', color: '#22c55e', type: 'expense' as const },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', type: 'expense' as const },
  { name: 'Utilities', icon: '💡', color: '#f59e0b', type: 'expense' as const },
  { name: 'Salary', icon: '💼', color: '#22c55e', type: 'income' as const },
  { name: 'Freelance', icon: '🖥️', color: '#6366f1', type: 'income' as const },
];

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'];

export function OnboardingWizard() {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState(1);
  const [accountName, setAccountName] = useState('Main Checking');
  const [accountType, setAccountType] = useState('checking');
  const [accountColor, setAccountColor] = useState('#6366f1');
  const [selectedCats, setSelectedCats] = useState<number[]>([0, 1, 2, 6, 7]);
  const [done, setDone] = useState(false);

  // Only show for truly new users
  if (state.accounts.length > 0 || done) return null;

  function toggleCat(i: number) {
    setSelectedCats(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  function handleFinish() {
    // Create account (no balance field in Account type)
    const accId = `acc-${Date.now()}`;
    dispatch({
      type: 'ADD_ACCOUNT',
      payload: { id: accId, name: accountName, assetType: accountType as any, incomeSource: 'salary', color: accountColor }
    });
    // Create categories
    selectedCats.forEach((i, idx) => {
      const cat = STARTER_CATEGORIES[i];
      dispatch({
        type: 'ADD_CATEGORY',
        payload: { id: `cat-${Date.now()}-${idx}`, name: cat.name, icon: cat.icon, color: cat.color, type: cat.type }
      });
    });
    setDone(true);
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

        {/* Step 1: Account */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Wallet size={28} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Welcome to BudgetPro! 👋</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>Let's set up your first account to get started.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input className="form-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Main Checking" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-select" value={accountType} onChange={e => setAccountType(e.target.value)}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <input type="color" value={accountColor} onChange={e => setAccountColor(e.target.value)} style={{ width: 48, height: 40, border: 'none', background: 'none', cursor: 'pointer' }} />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Tag size={28} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Pick Your Categories</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Choose categories to organize your transactions.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {STARTER_CATEGORIES.map((cat, i) => {
                const sel = selectedCats.includes(i);
                return (
                  <div key={i} onClick={() => toggleCat(i)} style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    border: `2px solid ${sel ? cat.color : 'var(--border)'}`,
                    background: sel ? `${cat.color}15` : 'var(--bg-input)',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cat.type}</div>
                    </div>
                    {sel && <CheckCircle size={16} color={cat.color} />}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>You're all set!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>
              Your account and {selectedCats.length} categories are ready. Start by adding your first transaction!
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <span>Press <kbd style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace' }}>A</kbd> anywhere to add a transaction</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
          {step > 1 && step < 3 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button
              className="btn btn-primary"
              disabled={step === 1 && !accountName.trim()}
              onClick={() => { if (step === 2) handleFinish(); setStep(s => s + 1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {step === 2 ? 'Finish Setup' : 'Next'} <ArrowRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button className="btn btn-primary" onClick={() => setDone(true)}>
              Start Tracking 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
