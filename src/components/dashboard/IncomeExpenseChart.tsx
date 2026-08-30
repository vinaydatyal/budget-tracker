'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApp, formatCurrency } from '@/context/AppContext';
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

import { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  activeRange: { start: Date; end: Date };
  accountIds?: string[];
  categoryIds?: string[];
}

export function IncomeExpenseChart({ transactions, activeRange, accountIds, categoryIds }: Props) {
  const { state } = useApp();

  const data = useMemo(() => {
    let txns = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });

    if (accountIds && accountIds.length > 0) txns = txns.filter(t => accountIds.includes(t.accountId));
    if (categoryIds && categoryIds.length > 0) txns = txns.filter(t => categoryIds.includes(t.categoryId));

    const diffDays = differenceInDays(activeRange.end, activeRange.start);
    let intervals: Date[];
    let getGroupKey: (d: Date) => string;
    let formatLabel: (d: Date) => string;

    if (diffDays <= 35) {
      intervals = eachDayOfInterval(activeRange);
      getGroupKey = d => format(d, 'yyyy-MM-dd');
      formatLabel = d => format(d, 'MMM d');
    } else if (diffDays <= 185) {
      intervals = eachWeekOfInterval(activeRange, { weekStartsOn: 0 });
      getGroupKey = d => format(d, 'yyyy-ww');
      formatLabel = d => `Week ${format(d, 'w')}`;
    } else {
      intervals = eachMonthOfInterval(activeRange);
      getGroupKey = d => format(d, 'yyyy-MM');
      formatLabel = d => format(d, 'MMM yy');
    }

    const map = new Map<string, { label: string; income: number; expenses: number; wealthTransfers: number }>();
    for (const d of intervals) {
      map.set(getGroupKey(d), { label: formatLabel(d), income: 0, expenses: 0, wealthTransfers: 0 });
    }

    for (const t of txns) {
      const d = new Date(t.date);
      const key = getGroupKey(d);
      const entry = map.get(key);
      if (entry) {
        if (t.type === 'income') {
          entry.income += t.amount;
        } else if (t.type === 'expense') {
          entry.expenses += t.amount;
        }
      }
    }

    return Array.from(map.values());
  }, [transactions, activeRange, accountIds, categoryIds]);

  const hasData = data.some(d => d.income > 0 || d.expenses > 0 || d.wealthTransfers > 0);

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      color: 'var(--text-primary)',
      fontSize: '13px',
    },
  };

  const diffDays = differenceInDays(activeRange.end, activeRange.start);
  let subtitle = 'Daily overview';
  if (diffDays > 35) subtitle = 'Weekly overview';
  if (diffDays > 185) subtitle = 'Monthly overview';

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-title">Income vs Expenses</div>
      <div className="chart-subtitle">{subtitle}</div>
      {!hasData ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ minWidth: 400, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency, maximumFractionDigits: 0, notation: 'compact' }).format(v)}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: any) => [formatCurrency(Number(value), state.currency), '']}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'capitalize' }}>
                {value}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#colorIncome)"
            dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#22c55e' }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Sunk Costs"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#colorExpenses)"
            dot={{ fill: '#f43f5e', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#f43f5e' }}
          />
          <Area
            type="monotone"
            dataKey="wealthTransfers"
            name="Wealth Transfers"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#colorWealth)"
            dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#8b5cf6' }}
          />
          </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
