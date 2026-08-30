'use client';

import { SavingsGoal } from '@/lib/types';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Pencil, Trash2 } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';

interface Props {
  goal: SavingsGoal;
  onEdit: () => void;
  onLogContribution?: () => void;
}

export function GoalCard({ goal, onEdit, onLogContribution }: Props) {
  const { state, deleteSavingsGoal } = useApp();
  const pct = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
  
  let monthsLeft = null;
  let requiredPerMonth = null;
  
  if (goal.deadline) {
    const months = differenceInMonths(new Date(goal.deadline), new Date());
    monthsLeft = Math.max(0, months);
    if (monthsLeft > 0 && goal.currentAmount < goal.targetAmount) {
      requiredPerMonth = (goal.targetAmount - goal.currentAmount) / monthsLeft;
    }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{goal.name}</h3>
          {goal.deadline && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Target: {format(new Date(goal.deadline), 'MMM yyyy')} 
              {monthsLeft !== null && monthsLeft > 0 && ` (${monthsLeft} months left)`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onLogContribution && (
            <button 
              className="btn btn-sm" 
              onClick={onLogContribution}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', marginRight: 4, height: 28, fontSize: 12, padding: '0 8px' }}
            >
              Log Contribution
            </button>
          )}
          <button className="btn btn-icon btn-sm" onClick={onEdit} aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button className="btn btn-icon btn-sm" onClick={() => {
            const hasLinked = state.recurringTransactions.some(r => r.linkedSavingsGoalId === goal.id);
            const msg = hasLinked 
              ? `Delete goal "${goal.name}"? This will also CANCEL your automated SIP/RD subscription.` 
              : `Delete goal "${goal.name}"?`;
            if (confirm(msg)) deleteSavingsGoal(goal.id);
          }} aria-label="Delete" style={{ color: 'var(--expense)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
          {formatCurrency(goal.currentAmount, state.currency)}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          of {formatCurrency(goal.targetAmount, state.currency)}
        </div>
      </div>

      <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ 
          height: '100%', 
          background: goal.color || 'var(--income)', 
          width: `${pct}%`,
          borderRadius: 4,
          transition: 'width 0.5s ease-out'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: goal.color || 'var(--income)' }}>{pct.toFixed(0)}%</span>
        {requiredPerMonth !== null && (
          <span style={{ color: 'var(--text-muted)' }}>Need {formatCurrency(requiredPerMonth, state.currency)}/mo</span>
        )}
      </div>
    </div>
  );
}
