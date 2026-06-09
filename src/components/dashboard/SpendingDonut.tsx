'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp, formatCurrency } from '@/context/AppContext';

interface Props { 
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
  categoryIds?: string[];
}

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function SpendingDonut({ activeRange, accountIds, categoryIds }: Props) {
  const { state } = useApp();

  const data = useMemo(() => {
    let txns = state.transactions.filter(t => t.type === 'expense');
    
    txns = txns.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });

    if (accountIds && accountIds.length > 0) txns = txns.filter(t => accountIds.includes(t.accountId));
    if (categoryIds && categoryIds.length > 0) txns = txns.filter(t => categoryIds.includes(t.categoryId));

    const map: Record<string, number> = {};
    for (const t of txns) {
      map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount;
    }

    return Object.entries(map)
      .map(([catId, value]) => {
        const cat = state.categories.find(c => c.id === catId);
        return { name: cat?.name ?? 'Other', value, color: cat?.color ?? '#6b7280', icon: cat?.icon ?? '📦' };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [state.transactions, state.categories, activeRange, accountIds, categoryIds]);

  if (data.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-title">Spending by Category</div>
        <div className="chart-subtitle">Expense breakdown</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-title">Spending by Category</div>
      <div className="chart-subtitle">Expense breakdown</div>
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
            formatter={(value: any) =>
              [formatCurrency(Number(value), state.currency), '']
            }
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>
            )}
          />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
