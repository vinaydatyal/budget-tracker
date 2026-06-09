import React, { useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { differenceInDays, format } from 'date-fns';

interface Props {
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
  categoryIds?: string[];
}

export function BudgetProgressBars({ activeRange, accountIds, categoryIds }: Props) {
  const { state } = useApp();

  const budgets = useMemo(() => {
    const diffDays = differenceInDays(activeRange.end, activeRange.start) + 1;
    const ratio = diffDays / 30.44; // Scale budget based on how many days are selected vs average month

    const activeCategoryIds = new Set<string>(
      state.categories.filter(c => c.monthlyBudget && c.monthlyBudget > 0).map(c => c.id)
    );

    if (activeCategoryIds.size === 0) return [];

    let periodTxns = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end && t.type === 'expense';
    });

    if (accountIds && accountIds.length > 0) periodTxns = periodTxns.filter(t => accountIds.includes(t.accountId));
    if (categoryIds && categoryIds.length > 0) periodTxns = periodTxns.filter(t => categoryIds.includes(t.categoryId));

    const spentMap: Record<string, number> = {};
    periodTxns.forEach(t => {
      spentMap[t.categoryId] = (spentMap[t.categoryId] || 0) + t.amount;
    });

    const results = Array.from(activeCategoryIds).map(catId => {
      const c = state.categories.find(cat => cat.id === catId);
      if (!c) return null;

      const spent = spentMap[c.id] || 0;
      
      // We use the default monthly budget and scale it to the selected date range.
      // If the user selects a 3-month range, the budget shown is 3x the monthly budget.
      let baseLimit = (c.monthlyBudget || 0) * ratio;

      const budget = Math.max(baseLimit, 0.01);
      const percent = Math.min(100, Math.round((spent / budget) * 100));
      const overBudget = spent > budget;

      return {
        category: c,
        spent,
        budget,
        percent,
        overBudget,
      };
    }).filter(Boolean) as any[];

    // If categories are selected in the global filter, only show those
    let finalResults = results;
    if (categoryIds && categoryIds.length > 0) {
      finalResults = finalResults.filter(r => categoryIds.includes(r.category.id));
    }

    return finalResults.sort((a, b) => b.percent - a.percent); 
  }, [state.categories, state.transactions, activeRange, accountIds, categoryIds]);

  if (budgets.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title">Budget Tracker</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title">Budget Tracker</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {budgets.map(({ category, spent, budget, percent, overBudget }) => (
          <div key={category.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{category.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{category.name}</span>
              </div>
              <div style={{ fontSize: 13, color: overBudget ? 'var(--expense)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(spent, state.currency)}</span> / {formatCurrency(budget, state.currency)}
              </div>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: overBudget ? 'var(--expense)' : category.color,
                  width: `${percent}%`,
                  transition: 'width 0.5s ease-in-out'
                }} 
              />
            </div>
            {overBudget && (
              <div style={{ fontSize: 11, color: 'var(--expense)', marginTop: 4, textAlign: 'right' }}>
                Over budget by {formatCurrency(spent - budget, state.currency)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
