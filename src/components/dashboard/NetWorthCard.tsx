'use client';

import { useMemo, useState } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { format } from 'date-fns';

import { Transaction, Account } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
}

export function NetWorthCard({ transactions, accounts, activeRange, accountIds }: Props) {
  const { state } = useApp();

  const { assets, liabilities, netWorth, liquidNetWorth, personalNetWorth, businessNetWorth, personalAssets, personalLiabilities, businessAssets, businessLiabilities, personalLiquidNetWorth, businessLiquidNetWorth } = useMemo(() => {
    let accountsToCalculate = accounts;
    if (accountIds && accountIds.length > 0) {
      accountsToCalculate = accountsToCalculate.filter(acc => accountIds.includes(acc.id));
    }

    const accountBalances = accountsToCalculate.map(acc => {
      const bal = transactions.reduce((s, t) => {
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

    const personalAccountBalances = accountBalances.filter(a => !a.isBusiness);
    const businessAccountBalances = accountBalances.filter(a => a.isBusiness);

    const personalAccountAssets = personalAccountBalances.filter(a => a.bal > 0).reduce((s, a) => s + a.bal, 0);
    const personalAccountLiabilities = Math.abs(personalAccountBalances.filter(a => a.bal < 0).reduce((s, a) => s + a.bal, 0));
    
    const businessAccountAssets = businessAccountBalances.filter(a => a.bal > 0).reduce((s, a) => s + a.bal, 0);
    const businessAccountLiabilities = Math.abs(businessAccountBalances.filter(a => a.bal < 0).reduce((s, a) => s + a.bal, 0));

    const accountAssets = accountBalances.filter(a => a.bal > 0).reduce((s, a) => s + a.bal, 0);
    const accountLiabilities = Math.abs(accountBalances.filter(a => a.bal < 0).reduce((s, a) => s + a.bal, 0));
    
    const personalSavingsAssets = state.savingsGoals.filter(g => !g.isBusiness).reduce((sum, g) => sum + g.currentAmount, 0);
    const businessSavingsAssets = state.savingsGoals.filter(g => g.isBusiness).reduce((sum, g) => sum + g.currentAmount, 0);
    
    const personalDebtLiabilities = state.debts.filter(d => !d.isBusiness).reduce((sum, d) => sum + d.balance, 0);
    const businessDebtLiabilities = state.debts.filter(d => d.isBusiness).reduce((sum, d) => sum + d.balance, 0);

    const personalAssets = personalAccountAssets + personalSavingsAssets;
    const personalLiabilities = personalAccountLiabilities + personalDebtLiabilities;
    const personalNetWorth = personalAssets - personalLiabilities;

    const businessAssets = businessAccountAssets + businessSavingsAssets;
    const businessLiabilities = businessAccountLiabilities + businessDebtLiabilities;
    const businessNetWorth = businessAssets - businessLiabilities;

    const isBusinessOn = state.preferences.enableBusinessMode;

    const assets = isBusinessOn ? (accountAssets + personalSavingsAssets + businessSavingsAssets) : personalAssets;
    const liabilities = isBusinessOn ? (accountLiabilities + personalDebtLiabilities + businessDebtLiabilities) : personalLiabilities;
    
    const personalLiquidNetWorth = personalAccountAssets - personalAccountLiabilities;
    const businessLiquidNetWorth = businessAccountAssets - businessAccountLiabilities;
    const liquidNetWorth = isBusinessOn ? (accountAssets - accountLiabilities) : personalLiquidNetWorth;
    
    return { assets, liabilities, netWorth: assets - liabilities, liquidNetWorth, accountAssets, accountLiabilities, savingsAssets: personalSavingsAssets + businessSavingsAssets, debtLiabilities: personalDebtLiabilities + businessDebtLiabilities, personalNetWorth, businessNetWorth, personalAssets, personalLiabilities, businessAssets, businessLiabilities, personalLiquidNetWorth, businessLiquidNetWorth };
  }, [transactions, accounts, state.savingsGoals, state.debts, activeRange, accountIds, state.preferences.enableBusinessMode]);

  const [viewMode, setViewMode] = useState<'total' | 'personal' | 'business'>('total');

  const displayAssets = viewMode === 'personal' ? personalAssets : viewMode === 'business' ? businessAssets : assets;
  const displayLiabilities = viewMode === 'personal' ? personalLiabilities : viewMode === 'business' ? businessLiabilities : liabilities;
  const displayNetWorth = viewMode === 'personal' ? personalNetWorth : viewMode === 'business' ? businessNetWorth : netWorth;
  const displayLiquid = viewMode === 'personal' ? personalLiquidNetWorth : viewMode === 'business' ? businessLiquidNetWorth : liquidNetWorth;

  const getTitlePrefix = () => {
    if (viewMode === 'personal') return 'Personal ';
    if (viewMode === 'business') return 'Business ';
    return 'Total ';
  };

  return (
    <div className="card" style={{
      padding: '16px 24px', position: 'relative', overflowY: 'auto', overflowX: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      {/* Decorative premium orbs */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--balance)', opacity: 0.1, filter: 'blur(50px)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(129, 140, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
            <Landmark size={20} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{getTitlePrefix()}Net Worth</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>As of {format(activeRange.end, 'MMM d, yyyy')}</div>
          </div>
        </div>
      </div>

      {state.preferences.enableBusinessMode && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-modifier-hover)', padding: 4, borderRadius: 8, marginBottom: 12, zIndex: 1, position: 'relative' }}>
          <button
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', background: viewMode === 'total' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'total' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: viewMode === 'total' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={() => setViewMode('total')}
          >Total</button>
          <button
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', background: viewMode === 'personal' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'personal' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: viewMode === 'personal' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={() => setViewMode('personal')}
          >Personal</button>
          <button
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', background: viewMode === 'business' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'business' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: viewMode === 'business' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={() => setViewMode('business')}
          >Business</button>
        </div>
      )}

      <div style={{ fontSize: 'clamp(24px, 4vw, 46px)', fontWeight: 800, color: displayNetWorth >= 0 ? 'var(--text-primary)' : 'var(--expense)', lineHeight: 1, marginBottom: 12, zIndex: 1, position: 'relative', letterSpacing: '-0.03em', marginTop: 4 }}>
        {displayNetWorth < 0 ? '-' : ''}{formatCurrency(Math.abs(displayNetWorth), state.currency)}
      </div>

      {state.preferences.enableBusinessMode && viewMode === 'total' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', zIndex: 1, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Personal</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(personalNetWorth, state.currency)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Business</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(businessNetWorth, state.currency)}</div>
          </div>
        </div>
      )}

      <div style={{ zIndex: 1, position: 'relative', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ padding: '4px 10px', borderRadius: 20, background: 'var(--bg-modifier-hover)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Liquid Cash:</span>
          <span style={{ color: displayLiquid >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {displayLiquid < 0 ? '-' : ''}{formatCurrency(Math.abs(displayLiquid), state.currency)}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, zIndex: 1, position: 'relative' }}>
        <div style={{ padding: '12px 16px', borderRadius: 16, background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--income)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <TrendingUp size={16} /> Assets
          </div>
          <div style={{ fontSize: 'clamp(14px, 3vw, 24px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(displayAssets, state.currency)}</div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 16, background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--expense)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <TrendingDown size={16} /> Liabilities
          </div>
          <div style={{ fontSize: 'clamp(14px, 3vw, 24px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatCurrency(displayLiabilities, state.currency)}</div>
        </div>
      </div>
    </div>
  );
}
