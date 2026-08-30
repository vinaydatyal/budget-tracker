'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SavingsGoal } from '@/lib/types';
import { X, RefreshCw } from 'lucide-react';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  editing: SavingsGoal | null;
  isBusinessMode?: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function GoalForm({ editing, isBusinessMode, onClose, onSave }: Props) {
  const { state, addSavingsGoal, updateSavingsGoal, addRecurring } = useApp();
  
  const [name, setName] = useState(editing?.name || '');
  const [targetAmount, setTargetAmount] = useState(editing?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(editing?.currentAmount?.toString() || '0');
  const [deadline, setDeadline] = useState(editing?.deadline || '');
  const [color, setColor] = useState(editing?.color || '#3b82f6');
  
  const [automate, setAutomate] = useState(false);
  const [autoAmount, setAutoAmount] = useState('');
  const [autoFrequency, setAutoFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [autoAccountId, setAutoAccountId] = useState(state.accounts[0]?.id || '');
  const [autoCategoryId, setAutoCategoryId] = useState(state.categories.find(c => c.type === 'expense')?.id || '');
  
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount);
    
    if (isNaN(target) || target <= 0) return setError('Target amount must be positive');
    if (isNaN(current) || current < 0) return setError('Current amount cannot be negative');

    if (automate) {
      if (!autoAmount || parseFloat(autoAmount) <= 0) return setError('Automated amount must be positive');
      if (!autoAccountId) return setError('Please select a source account for automation');
      if (!autoCategoryId) return setError('Please select a category for automation');
    }

    const payload = {
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: deadline || undefined,
      color,
      isBusiness: editing ? editing.isBusiness : isBusinessMode
    };

    if (editing) {
      updateSavingsGoal({ ...payload, id: editing.id });
    } else {
      const newId = generateId();
      addSavingsGoal({ ...payload, id: newId });
      
      if (automate) {
        addRecurring({
          type: 'expense',
          amount: parseFloat(autoAmount),
          categoryId: autoCategoryId,
          accountId: autoAccountId,
          description: `SIP/RD to ${name.trim()}`,
          payee: 'Savings Goal',
          frequency: autoFrequency,
          nextDueDate: new Date().toISOString().slice(0, 10),
          active: true,
          linkedSavingsGoalId: newId,
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
          <h2 className="modal-title">{editing ? 'Edit Goal' : 'New Savings Goal'}</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Goal Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vacation" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Amount</label>
              <input className="form-input" type="number" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Current Saved</label>
              <input className="form-input" type="number" step="0.01" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Date (Optional)</label>
            <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Theme Color</label>
            <input className="form-input" type="color" value={color} onChange={e => setColor(e.target.value)} style={{ padding: 4, height: 40 }} />
          </div>

          {!editing && (
            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card-hover)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input 
                  type="checkbox" 
                  id="automate-sip" 
                  checked={automate} 
                  onChange={e => setAutomate(e.target.checked)} 
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="automate-sip" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <RefreshCw size={14} color="var(--accent)" />
                  Automate Savings (SIP / RD)
                </label>
              </div>
              
              {automate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Installment Amount</label>
                      <input className="form-input" type="number" step="0.01" value={autoAmount} onChange={e => setAutoAmount(e.target.value)} required={automate} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Frequency</label>
                      <select className="form-select" value={autoFrequency} onChange={e => setAutoFrequency(e.target.value as any)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
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
            <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create Goal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
