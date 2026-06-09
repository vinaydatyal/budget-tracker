'use client';

import { RecurringTransaction } from '@/lib/types';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  emi: RecurringTransaction;
}

export function EmiCard({ emi }: Props) {
  const { state } = useApp();
  const router = useRouter();
  
  const account = state.accounts.find(a => a.id === emi.accountId);
  const paid = emi.paidInstallments || 0;
  const total = emi.totalInstallments || 1;
  const pct = Math.min(100, Math.max(0, (paid / total) * 100));
  
  const remainingMonths = Math.max(0, total - paid);
  const remainingBalance = remainingMonths * emi.amount;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{emi.description}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <span className="badge badge-warning" style={{ marginRight: 6, background: 'var(--warning-subtle)', color: 'var(--warning)' }}>EMI</span>
            Billed to {account?.name || 'Account'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-icon btn-sm" onClick={() => router.push('/recurring')} title="Manage in Subscriptions">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--expense)' }}>
          {formatCurrency(remainingBalance, state.currency)}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          left to pay
        </div>
      </div>

      <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ 
          height: '100%', 
          background: 'var(--warning)', 
          width: `${pct}%`,
          borderRadius: 4,
          transition: 'width 0.5s ease-out'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 16 }}>
        <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{paid} of {total} Paid ({pct.toFixed(0)}%)</span>
        <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(emi.amount, state.currency)} / mo</span>
      </div>
      
    </div>
  );
}
