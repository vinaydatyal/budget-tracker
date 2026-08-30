'use client';

import React, { useState } from 'react';
import { Landmark, CheckCircle, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/context/AppContext';

export function BankLinkButton() {
  const [isLinking, setIsLinking] = useState(false);
  const [step, setStep] = useState<'select' | 'mobile' | 'card' | 'done'>('select');
  const [accountType, setAccountType] = useState<'SB' | 'CC'>('SB');
  const [inputValue, setInputValue] = useState('');
  const { addAccount, state, updateAccount } = useApp();

  const syncSavingsAccount = async (acctNo: string) => {
    const res = await fetch('/api/icici/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SB', acctNo })
    });
    const data = await res.json();
    if (data.balance) {
      const existing = state.accounts.find(a => a.name.includes(acctNo.slice(-4)));
      if (existing) {
        updateAccount(existing);
      } else {
        addAccount({
          name: `ICICI Savings (...${acctNo.slice(-4)})`,
          assetType: 'checking',
          incomeSource: 'salary',
          color: '#f97316' // ICICI Orange
        });
      }
    }
  };

  const handleSync = async () => {
    if (!inputValue.trim()) {
      toast.error('Please enter a valid number.');
      return;
    }
    
    setIsLinking(true);
    
    try {
      if (accountType === 'SB') {
        // Fetch accounts by mobile number
        const res = await fetch('/api/icici/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'SB', mobileNo: inputValue })
        });
        const data = await res.json();
        
        if (data.acctNo && Array.isArray(data.acctNo)) {
          // Sync all accounts
          for (const acct of data.acctNo) {
            await syncSavingsAccount(acct);
          }
          toast.success(`Successfully synced ${data.acctNo.length} savings accounts!`);
          setStep('done');
        } else if (data.balance && data.AccountNo) {
           // Single account fallback based on sample response
           await syncSavingsAccount(data.AccountNo);
           toast.success('Successfully synced savings account!');
           setStep('done');
        } else {
          throw new Error('Invalid response from bank');
        }
      } else {
        // Fetch Credit Card
        const res = await fetch('/api/icici/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'CC', cardNo: inputValue })
        });
        const data = await res.json();
        
        if (data.availbalance && data.usedbalance) {
          const usedBalanceStr = String(data.usedbalance).replace('-', '');
          const existing = state.accounts.find(a => a.name.includes(inputValue.slice(-4)));
          if (existing) {
            updateAccount(existing);
          } else {
            addAccount({
              name: `ICICI Credit (...${inputValue.slice(-4)})`,
              assetType: 'credit',
              incomeSource: 'none',
              color: '#f97316'
            });
          }
          toast.success('Successfully synced credit card!');
          setStep('done');
        } else {
          throw new Error('Invalid response from bank');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync with ICICI API');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: 12, borderRadius: 12 }}>
          <Landmark size={24} color="#f97316" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>Bank Integration (ICICI Bank)</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Connect your ICICI Bank accounts securely to automatically import balances.
          </p>
          
          {step === 'select' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-secondary"
                onClick={() => { setAccountType('SB'); setStep('mobile'); }}
              >
                <Landmark size={16} style={{ marginRight: 8 }}/> Link Savings Account
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => { setAccountType('CC'); setStep('card'); }}
              >
                <CreditCard size={16} style={{ marginRight: 8 }}/> Link Credit Card
              </button>
            </div>
          )}

          {(step === 'mobile' || step === 'card') && (
            <div style={{ display: 'flex', gap: 8, maxWidth: 300 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder={step === 'mobile' ? 'Enter Mobile Number...' : 'Enter Card Number...'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={isLinking}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleSync}
                disabled={isLinking || !inputValue.trim()}
                style={{ background: '#f97316' }}
              >
                {isLinking ? <Loader2 size={16} className="animate-spin" /> : 'Sync'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--income)' }}>
              <CheckCircle size={16} /> 
              <span style={{ fontSize: 14, fontWeight: 600 }}>Accounts synced with ICICI API</span>
              <button className="btn btn-icon" onClick={() => { setStep('select'); setInputValue(''); }} style={{ marginLeft: 8, fontSize: 12, padding: '4px 8px' }}>Sync Another</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
