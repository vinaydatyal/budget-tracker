'use client';

import { Debt } from '@/lib/types';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  debt: Debt;
  onEdit: () => void;
  onLogPayment: () => void;
}

export function DebtCard({ debt, onEdit, onLogPayment }: Props) {
  const { state, deleteDebt } = useApp();
  
  // Calculate estimated months to payoff if paying minimum
  // Formula: N = -log(1 - (r * P / M)) / log(1 + r)
  // where r = monthly interest rate, P = principal, M = monthly payment
  let payoffMonths = null;
  const r = (debt.interestRate / 100) / 12;
  const P = debt.balance;
  const M = debt.minimumPayment;

  if (r > 0 && M > 0 && (r * P) < M) {
    payoffMonths = Math.ceil(-Math.log(1 - (r * P / M)) / Math.log(1 + r));
  } else if (M > 0 && r === 0) {
    payoffMonths = Math.ceil(P / M);
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'credit_card': return 'Credit Card';
      case 'loan': return 'Personal Loan';
      case 'mortgage': return 'Mortgage';
      default: return 'Other Debt';
    }
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{debt.name}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <span className="badge badge-neutral" style={{ marginRight: 6 }}>{getTypeLabel(debt.type)}</span>
            {debt.interestRate}% APR
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-icon btn-sm" onClick={onEdit} aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button className="btn btn-icon btn-sm" onClick={() => {
            const hasLinked = state.recurringTransactions.some(r => r.linkedDebtId === debt.id);
            const msg = hasLinked 
              ? `Delete debt "${debt.name}"? This will also CANCEL your automated EMI subscription.` 
              : `Delete debt "${debt.name}"?`;
            if (confirm(msg)) deleteDebt(debt.id);
          }} aria-label="Delete" style={{ color: 'var(--expense)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--expense)', marginBottom: 16 }}>
        {formatCurrency(debt.balance, state.currency)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Min. Payment</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(debt.minimumPayment, state.currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Due Date</span>
          <span style={{ fontWeight: 600 }}>Day {new Date(debt.dueDate).getDate()} of month</span>
        </div>
        {payoffMonths !== null ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Est. Next Interest</span>
              <span style={{ fontWeight: 600, color: 'var(--expense)' }}>{formatCurrency(r * P, state.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Est. Payoff</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {Math.floor(payoffMonths / 12)}y {payoffMonths % 12}m
              </span>
            </div>
          </>
        ) : M > 0 && (r * P) >= M ? (
          <div style={{ fontSize: 12, color: 'var(--expense)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
            Minimum payment doesn't cover interest!
          </div>
        ) : null}
      </div>
      
      <button 
        className="btn btn-secondary" 
        style={{ width: '100%', marginTop: 16 }}
        onClick={onLogPayment}
      >
        Log Payment
      </button>
    </div>
  );
}
