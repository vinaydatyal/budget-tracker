'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SavingsGoal } from '@/lib/types';
import { X } from 'lucide-react';

interface Props {
  editing: SavingsGoal | null;
  onClose: () => void;
  onSave: () => void;
}

export function GoalForm({ editing, onClose, onSave }: Props) {
  const { addSavingsGoal, updateSavingsGoal } = useApp();
  
  const [name, setName] = useState(editing?.name || '');
  const [targetAmount, setTargetAmount] = useState(editing?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(editing?.currentAmount?.toString() || '0');
  const [deadline, setDeadline] = useState(editing?.deadline || '');
  const [color, setColor] = useState(editing?.color || '#3b82f6');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount);
    
    if (isNaN(target) || target <= 0) return setError('Target amount must be positive');
    if (isNaN(current) || current < 0) return setError('Current amount cannot be negative');

    const payload = {
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: deadline || undefined,
      color
    };

    if (editing) {
      updateSavingsGoal({ ...payload, id: editing.id });
    } else {
      addSavingsGoal(payload);
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

          {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create Goal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
