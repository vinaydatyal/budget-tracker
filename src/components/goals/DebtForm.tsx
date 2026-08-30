'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Debt } from '@/lib/types';
import { X, RefreshCw } from 'lucide-react';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  editing: Debt | null;
  isBusinessMode?: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function DebtForm({ editing, isBusinessMode, onClose, onSave }: Props) {
  const { state, addDebt, updateDebt, addRecurring } = useApp();
  
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<Debt['type']>(editing?.type || 'credit_card');
  const [balance, setBalance] = useState(editing?.balance?.toString() || '');
  const [interestRate, setInterestRate] = useState(editing?.interestRate?.toString() || '');
  const [minimumPayment, setMinimumPayment] = useState(editing?.minimumPayment?.toString() || '');
  const [dueDate, setDueDate] = useState(editing?.dueDate || '');
  
  const [automate, setAutomate] = useState(false);
  const [autoFrequency, setAutoFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [autoAccountId, setAutoAccountId] = useState(state.accounts[0]?.id || '');
  const [autoCategoryId, setAutoCategoryId] = useState(state.categories.find(c => c.type === 'expense')?.id || '');
  const [autoTotalInstallments, setAutoTotalInstallments] = useState('');
  
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    const bal = parseFloat(balance);
    const ir = parseFloat(interestRate);
    const minPay = parseFloat(minimumPayment);
    
    if (isNaN(bal) || bal < 0) return setError('Balance must be valid');
    if (isNaN(ir) || ir < 0) return setError('Interest rate must be valid');
    if (isNaN(minPay) || minPay < 0) return setError('Minimum payment must be valid');
    if (!dueDate) return setError('Due date is required');

    if (automate) {
      if (!autoAccountId) return setError('Please select a source account for automation');
      if (!autoCategoryId) return setError('Please select a category for automation');
    }

    const payload = {
      name: name.trim(),
      type,
      balance: bal,
      interestRate: ir,
      minimumPayment: minPay,
      dueDate,
      isBusiness: editing ? editing.isBusiness : isBusinessMode
    };

    if (editing) {
      updateDebt({ ...payload, id: editing.id });
    } else {
      const newId = generateId();
      addDebt({ ...payload, id: newId });
      
      if (automate) {
        addRecurring({
          type: 'expense',
          amount: minPay,
          categoryId: autoCategoryId,
          accountId: autoAccountId,
          description: `EMI for ${name.trim()}`,
          payee: name.trim(),
          frequency: autoFrequency,
          nextDueDate: dueDate,
          active: true,
          isEmi: true,
          totalInstallments: autoTotalInstallments ? parseInt(autoTotalInstallments) : undefined,
          paidInstallments: 0,
          linkedDebtId: newId,
        });
      }
    }
    
    onSave();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Debt' : 'Add Debt'}</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Debt Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chase Sapphire" required />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="credit_card">Credit Card</option>
              <option value="loan">Personal Loan</option>
              <option value="mortgage">Mortgage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Current Balance</label>
              <input className="form-input" type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Interest Rate (APR %)</label>
              <input className="form-input" type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Minimum Payment (EMI)</label>
              <input className="form-input" type="number" step="0.01" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Next Due Date</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>

          {!editing && (
            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card-hover)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input 
                  type="checkbox" 
                  id="automate-emi" 
                  checked={automate} 
                  onChange={e => setAutomate(e.target.checked)} 
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="automate-emi" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <RefreshCw size={14} color="var(--accent)" />
                  Automate EMI / Installments
                </label>
              </div>
              
              {automate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Frequency</label>
                      <select className="form-select" value={autoFrequency} onChange={e => setAutoFrequency(e.target.value as any)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Total Installments (Optional)</label>
                      <input className="form-input" type="number" placeholder="e.g. 24" value={autoTotalInstallments} onChange={e => setAutoTotalInstallments(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Source Account</label>
                      <select className="form-select" value={autoAccountId} onChange={e => setAutoAccountId(e.target.value)} required={automate}>
                        <option value="">Select Account</option>
                        {state.accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Log as Category</label>
                      <select className="form-select" value={autoCategoryId} onChange={e => setAutoCategoryId(e.target.value)} required={automate}>
                        <option value="">Select Category</option>
                        {state.categories.filter(c => c.type === 'expense').map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12, marginTop: 16 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Debt'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
