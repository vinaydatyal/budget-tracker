'use client';

import { useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
}

export function NetWorthCard({ activeRange, accountIds }: Props) {
  const { state } = useApp();

  const { assets, liabilities, netWorth } = useMemo(() => {
    let accountsToCalculate = state.accounts;
    if (accountIds && accountIds.length > 0) {
      accountsToCalculate = accountsToCalculate.filter(acc => accountIds.includes(acc.id));
    }

    const accountBalances = accountsToCalculate.map(acc => {
      const bal = state.transactions.reduce((s, t) => {
        const tDate = new Date(t.date);
        // Net worth calculates all history up to the end of the selected date range
        if (tDate <= activeRange.end) {
          if (t.accountId === acc.id) return t.type === 'income' ? s + t.amount : s - t.amount;
          if (t.type === 'transfer' && t.toAccountId === acc.id) return s + t.amount;
        }
        return s;
      }, 0);
      return { ...acc, bal };
    });

    const assets = accountBalances.filter(a => a.bal > 0).reduce((s, a) => s + a.bal, 0);
    const liabilities = Math.abs(accountBalances.filter(a => a.bal < 0).reduce((s, a) => s + a.bal, 0));
    return { assets, liabilities, netWorth: assets - liabilities };
  }, [state.transactions, state.accounts, activeRange, accountIds]);

  return (
    <div className="card" style={{
      padding: 32, position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      {/* Decorative premium orbs */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--balance)', opacity: 0.1, filter: 'blur(50px)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, zIndex: 1, position: 'relative' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(129, 140, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
          <Landmark size={20} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Net Worth</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>As of {format(activeRange.end, 'MMM d, yyyy')}</div>
        </div>
      </div>

      <div style={{ fontSize: 56, fontWeight: 800, color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--expense)', lineHeight: 1, marginBottom: 32, zIndex: 1, position: 'relative', letterSpacing: '-0.03em', marginTop: 16 }}>
        {netWorth < 0 ? '-' : ''}{formatCurrency(Math.abs(netWorth), state.currency)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, zIndex: 1, position: 'relative' }}>
        <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--income)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <TrendingUp size={16} /> Assets
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(assets, state.currency)}</div>
        </div>
        <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--expense)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <TrendingDown size={16} /> Liabilities
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(liabilities, state.currency)}</div>
        </div>
      </div>
    </div>
  );
}
