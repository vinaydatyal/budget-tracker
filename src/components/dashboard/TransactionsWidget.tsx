'use client';

import { useApp, formatCurrency } from '@/context/AppContext';
import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/lib/types';

export function TransactionsWidget({ recentTxns }: { recentTxns: Transaction[] }) {
  const { state } = useApp();

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title">Recent Transactions</span>
        <Link href="/transactions" className="btn btn-secondary btn-sm" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          View All <ArrowRight size={14} />
        </Link>
      </div>
      {recentTxns.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 0', flex: 1 }}>
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">No transactions yet</div>
          <div className="empty-state-text">Add your first income or expense to get started.</div>
          <Link href="/transactions" className="btn btn-primary" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
            Add Transaction
          </Link>
        </div>
      ) : (
        <div className="transaction-list" style={{ flex: 1 }}>
          {recentTxns.map(t => {
            const cat = state.categories.find(c => c.id === t.categoryId);
            return (
              <div key={t.id} className="transaction-item animate-in">
                <div className="transaction-icon" style={{ background: cat ? `${cat.color}22` : 'var(--bg-input)' }}>
                  {cat?.icon ?? '📦'}
                </div>
                <div className="transaction-info">
                  <div className="transaction-desc">{t.description}</div>
                  <div className="transaction-meta">
                    {cat?.name ?? 'Unknown'} • {format(new Date(t.date), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className={`transaction-amount ${t.type}`}>
                  {t.type === 'income' ? <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: 4 }} />}
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, state.currency)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
