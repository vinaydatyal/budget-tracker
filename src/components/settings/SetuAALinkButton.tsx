'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';

export function SetuAALinkButton() {
  const [isLinking, setIsLinking] = useState(false);
  const [step, setStep] = useState<'initial' | 'consent_sent' | 'fetching' | 'done'>('initial');
  const [phone, setPhone] = useState('');
  const [consentId, setConsentId] = useState('');
  const { addAccount, addTransactionsBulk } = useApp();

  const handleLink = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }
    
    setIsLinking(true);
    
    try {
      // 1. Create Consent Request
      const consentRes = await fetch('/api/setu/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const consentData = await consentRes.json();
      
      if (!consentData.success) {
        throw new Error('Failed to generate consent');
      }

      setConsentId(consentData.consentId);
      setStep('consent_sent');
      toast.success('Opening Setu Account Aggregator in a new tab...', { duration: 3000 });
      
      // Open Setu URL in a new window for the user to approve
      if (consentData.url) {
         window.open(consentData.url, '_blank');
      }
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to initiate Setu AA flow');
      setStep('initial');
    } finally {
      setIsLinking(false);
    }
  };

  const checkConsentStatus = async () => {
    setStep('fetching');
    
    try {
      // 2. Fetch ReBIT Data (Assuming consent is now active)
      const fetchRes = await fetch('/api/setu/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId })
      });
      
      const rebitData = await fetchRes.json();
      
      if (rebitData.error || rebitData.status !== 'COMPLETED') {
        throw new Error(rebitData.error || 'Data fetch not completed. Did you approve it on Setu?');
      }

      // 3. Parse ReBIT data and inject into our app state
      const accountData = rebitData.data.Account;
      const accountId = `aa-acc-${Date.now()}`;
      
      addAccount({
        id: accountId,
        name: `${accountData.Summary?.branch || 'Bank'} (${accountData.maskedAccountNumber})`,
        assetType: 'checking',
        incomeSource: 'salary',
        color: '#004c8f' // Default Bank Blue
      });

      const parsedTransactions: Transaction[] = accountData.Transactions.Transaction.map((t: any) => {
        let catId = 'cat-12'; // Other
        const narration = t.narration?.toLowerCase() || '';
        if (narration.includes('swiggy') || narration.includes('zomato') || narration.includes('restaurant')) catId = 'cat-4b';
        else if (narration.includes('salary') || narration.includes('upwork')) catId = 'cat-1';
        else if (narration.includes('groceries') || narration.includes('fresh')) catId = 'cat-4a';

        return {
          id: `aa-txn-${t.reference}-${Date.now()}`,
          type: t.type === 'DEBIT' ? 'expense' : 'income',
          amount: parseFloat(t.amount),
          categoryId: catId,
          accountId: accountId,
          date: t.transactionTimestamp.split('T')[0],
          payee: t.mode || 'Transfer',
          description: t.narration || 'Bank Transaction',
          notes: `Ref: ${t.reference}`
        };
      });

      addTransactionsBulk(parsedTransactions);
      
      toast.success(`Successfully imported ${parsedTransactions.length} transactions via Setu!`);
      setStep('done');
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to fetch data from Setu');
      setStep('consent_sent'); // Let them try again
    }
  };

  return (
    <div style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 12 }}>
          <Shield size={24} color="#3b82f6" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>Account Aggregator (Setu)</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Securely link any Indian bank account via the RBI-regulated Account Aggregator framework to automatically import all historical and real-time transactions.
          </p>
          
          {step === 'initial' && (
            <div style={{ display: 'flex', gap: 8, maxWidth: 300 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter Mobile Number..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={isLinking}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleLink}
                disabled={isLinking || !phone.trim()}
                style={{ background: '#3b82f6' }}
              >
                {isLinking ? <Loader2 size={16} className="animate-spin" /> : 'Link via Setu'}
              </button>
            </div>
          )}

          {step === 'consent_sent' && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                We've opened the Setu Consent Screen in a new tab. Please approve the data request there, then come back and click the button below.
              </p>
              <button className="btn btn-primary" onClick={checkConsentStatus} style={{ background: '#10b981' }}>
                I have approved on Setu
              </button>
            </div>
          )}

          {step === 'fetching' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" /> 
              <span style={{ fontSize: 14 }}>Decrypting and fetching data from your bank...</span>
            </div>
          )}

          {step === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--income)' }}>
              <CheckCircle size={16} /> 
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bank linked successfully via Account Aggregator!</span>
              <button className="btn btn-icon" onClick={() => { setStep('initial'); setPhone(''); }} style={{ marginLeft: 8, fontSize: 12, padding: '4px 8px' }}>Link Another</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
