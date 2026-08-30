import React, { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp, formatCurrency } from '@/context/AppContext';

import { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
  categoryIds?: string[];
}

export function CashFlowSankey({ transactions, activeRange, accountIds, categoryIds }: Props) {
  const { state } = useApp();

  const data = useMemo(() => {
    let txns = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });

    if (accountIds && accountIds.length > 0) txns = txns.filter(t => accountIds.includes(t.accountId));
    if (categoryIds && categoryIds.length > 0) txns = txns.filter(t => categoryIds.includes(t.categoryId));

    let totalIncome = 0;
    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};

    txns.forEach(t => {
      const cat = state.categories.find(c => c.id === t.categoryId);
      if (!cat) return;

      if (t.type === 'income') {
        incomeByCat[cat.name] = (incomeByCat[cat.name] || 0) + t.amount;
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        expenseByCat[cat.name] = (expenseByCat[cat.name] || 0) + t.amount;
      }
    });

    const totalExpense = Object.values(expenseByCat).reduce((a, b) => a + b, 0);
    const savings = Math.max(0, totalIncome - totalExpense);

    const nodes: { name: string }[] = [];
    const links: { source: number, target: number, value: number }[] = [];

    // 1. Add Income Nodes
    const incomeNames = Object.keys(incomeByCat);
    incomeNames.forEach(name => nodes.push({ name }));

    // 2. Add Center Node "Budget"
    const centerIndex = nodes.length;
    nodes.push({ name: 'Total Pool' });

    // Link Incomes -> Center
    incomeNames.forEach((name, i) => {
      links.push({
        source: i,
        target: centerIndex,
        value: incomeByCat[name]
      });
    });

    // 3. Add Expense Nodes
    const expenseNames = Object.keys(expenseByCat);
    expenseNames.forEach(name => nodes.push({ name }));

    // Link Center -> Expenses
    expenseNames.forEach((name, i) => {
      links.push({
        source: centerIndex,
        target: centerIndex + 1 + i,
        value: expenseByCat[name]
      });
    });

    // 4. Add Savings Node if there's leftover
    if (savings > 0) {
      const savingsIndex = nodes.length;
      nodes.push({ name: 'Savings/Leftover' });
      links.push({
        source: centerIndex,
        target: savingsIndex,
        value: savings
      });
    }

    // If no income and no expenses, show empty state
    if (nodes.length <= 1) return null;

    return { nodes, links };
  }, [transactions, state.categories, activeRange, accountIds, categoryIds]);

  if (!data) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title">Cash Flow</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      </div>
    );
  }

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div style={{ background: 'var(--bg-card)', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, zIndex: 10 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
            {p.name || `${p.source?.name} → ${p.target?.name}`}
          </div>
          <div style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(p.value, state.currency)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title">Cash Flow</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ minWidth: 400, height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              node={{ fill: 'var(--income)', opacity: 0.8 }}
              nodePadding={20}
              link={{ stroke: 'var(--text-muted)', strokeOpacity: 0.2 }}
              margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
