'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Debt } from '@/lib/types';
import { X } from 'lucide-react';

interface Props {
  editing: Debt | null;
  onClose: () => void;
  onSave: () => void;
}

export function DebtForm({ editing, onClose, onSave }: Props) {
  const { addDebt, updateDebt } = useApp();
  
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<Debt['type']>(editing?.type || 'credit_card');
  const [balance, setBalance] = useState(editing?.balance?.toString() || '');
  const [interestRate, setInterestRate] = useState(editing?.interestRate?.toString() || '');
  const [minimumPayment, setMinimumPayment] = useState(editing?.minimumPayment?.toString() || '');
  const [dueDate, setDueDate] = useState(editing?.dueDate || '');
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

    const payload = {
      name: name.trim(),
      type,
      balance: bal,
      interestRate: ir,
      minimumPayment: minPay,
      dueDate
    };

    if (editing) {
      updateDebt({ ...payload, id: editing.id });
    } else {
      addDebt(payload);
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
              <label className="form-label">Minimum Payment</label>
              <input className="form-input" type="number" step="0.01" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Next Due Date</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>

          {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Debt'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
