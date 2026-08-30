'use client';

import { useApp, formatCurrency } from '@/context/AppContext';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
  categoryIds?: string[];
}

export function SummaryCards({ transactions, activeRange, accountIds, categoryIds }: Props) {
  const { state } = useApp();

  const { income, expenses, balance, count } = useMemo(() => {
    let txns = transactions;
    txns = txns.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });
    if (accountIds && accountIds.length > 0) txns = txns.filter(t => accountIds.includes(t.accountId));
    if (categoryIds && categoryIds.length > 0) txns = txns.filter(t => categoryIds.includes(t.categoryId));

    let income = 0, expenses = 0;
    for (const t of txns) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
      }
    }
    return { income, expenses, balance: income - expenses, count: txns.length };
  }, [transactions, activeRange, accountIds, categoryIds]);

  const diffDays = differenceInDays(activeRange.end, activeRange.start);
  let dateLabel = `${format(activeRange.start, 'MMM d')} - ${format(activeRange.end, 'MMM d')}`;
  if (diffDays > 300 && diffDays < 380) dateLabel = format(activeRange.start, 'yyyy');
  if (diffDays > 3000) dateLabel = 'All time';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, height: '100%' }}>
      <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--income)', opacity: 0.1, filter: 'blur(30px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--income)' }}>
            <TrendingUp size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Income</div>
            <div style={{ fontSize: 12, color: 'var(--income)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dateLabel}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', wordBreak: 'break-word', lineHeight: 1.2 }}>{formatCurrency(income, state.currency)}</div>
      </div>

      <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--expense)', opacity: 0.1, filter: 'blur(30px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(251, 113, 133, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--expense)' }}>
            <TrendingDown size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Expenses</div>
            <div style={{ fontSize: 12, color: 'var(--expense)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dateLabel}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', wordBreak: 'break-word', lineHeight: 1.2 }}>{formatCurrency(expenses, state.currency)}</div>
      </div>

      <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--balance)', opacity: 0.1, filter: 'blur(30px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--balance)' }}>
            <Wallet size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Net Balance</div>
            <div style={{ fontSize: 12, color: balance >= 0 ? 'var(--income)' : 'var(--expense)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{balance >= 0 ? '▲ Surplus' : '▼ Deficit'}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', wordBreak: 'break-word', lineHeight: 1.2 }}>{formatCurrency(balance, state.currency)}</div>
      </div>

      <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--accent)', opacity: 0.1, filter: 'blur(30px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <ArrowLeftRight size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Transactions</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dateLabel}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', wordBreak: 'break-word', lineHeight: 1.2 }}>{count}</div>
      </div>
    </div>
  );
}
