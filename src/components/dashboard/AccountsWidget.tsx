'use client';

import { useApp, formatCurrency } from '@/context/AppContext';
import Link from 'next/link';
import { ArrowRight, CreditCard } from 'lucide-react';

export function AccountsWidget({ selectedAccounts }: { selectedAccounts: string[] }) {
  const { state } = useApp();

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title">Accounts Overview</span>
        <Link href="/accounts" className="btn btn-secondary btn-sm" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          Manage <ArrowRight size={14} />
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {state.accounts.filter(a => selectedAccounts.length === 0 || selectedAccounts.includes(a.id)).map(acc => {
          const bal = state.transactions.reduce((s, t) => {
            if (t.accountId === acc.id) return t.type === 'income' ? s + t.amount : s - t.amount;
            if (t.type === 'transfer' && t.toAccountId === acc.id) return s + t.amount;
            return s;
          }, 0);
          return (
            <div key={acc.id} style={{ 
              position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '16px', color: 'white',
              background: `linear-gradient(135deg, ${acc.color}dd, ${acc.color}77)`,
              boxShadow: `0 4px 16px -2px ${acc.color}40`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
                <CreditCard size={20} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{acc.name}</span>
              </div>
              <div style={{ zIndex: 1 }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  {bal < 0 ? '-' : ''}{formatCurrency(Math.abs(bal), state.currency)}
                </span>
              </div>
              <div style={{ position: 'absolute', right: -10, bottom: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
