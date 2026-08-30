import React, { useMemo, useState } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { subDays, isAfter, addMonths, format } from 'date-fns';

import { Transaction, Account } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  isBusinessMode?: boolean;
}

export function ForecastChart({ transactions: rawTransactions, accounts: rawAccounts, isBusinessMode = false }: Props) {
  const { state } = useApp();

  const forecastData = useMemo(() => {
    // 0. Filter by Hub
    const transactions = (rawTransactions || []).filter(t => isBusinessMode ? t.isBusiness : !t.isBusiness);
    const accounts = (rawAccounts || []).filter(a => isBusinessMode ? a.isBusiness : !a.isBusiness);
    const debts = (state.debts || []).filter(d => isBusinessMode ? d.isBusiness : !d.isBusiness);
    const recurring = (state.recurringTransactions || []).filter(r => isBusinessMode ? r.isBusiness : !r.isBusiness);

    // 1. Calculate Current Liquid Net Worth
    const liquidAssets = accounts
      .filter(a => a.assetType !== 'real_estate' && a.assetType !== 'gold')
      .reduce((acc, account) => {
        const balance = transactions.reduce((sum, t) => {
          if (t.accountId === account.id) {
            return sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0);
          }
          if (t.type === 'transfer' && t.toAccountId === account.id) {
            return sum + t.amount;
          }
          return sum;
        }, 0);
        return acc + balance;
      }, 0);

    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const currentNetWorth = liquidAssets - totalDebt;

    // 2. Calculate Baseline Burn Rate (last 90 days, excluding recurring and wealth transfers)
    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentTxns = transactions.filter(t => 
      isAfter(new Date(t.date), ninetyDaysAgo) && 
      !t.linkedRecurringId && 
      t.type !== 'transfer'
    );

    let recentIncome = 0;
    let recentExpense = 0;
    recentTxns.forEach(t => {
      if (t.type === 'income') recentIncome += t.amount;
      if (t.type === 'expense') recentExpense += t.amount;
    });

    const baselineMonthlyIncome = recentIncome / 3;
    const baselineMonthlyExpense = recentExpense / 3;

    // 3. Calculate Recurring Delta
    let recurringMonthlyIncome = 0;
    let recurringMonthlyExpense = 0;

    recurring.filter(r => r.active).forEach(r => {
      let multiplier = 1;
      if (r.frequency === 'weekly') multiplier = 4.33;
      if (r.frequency === 'yearly') multiplier = 1 / 12;
      if (r.frequency === 'daily') multiplier = 30;

      if (r.type === 'income') recurringMonthlyIncome += r.amount * multiplier;
      // Do not count debt payments (EMI) or savings transfers as expenses that reduce net worth!
      if (r.type === 'expense') recurringMonthlyExpense += r.amount * multiplier;
    });

    const projectedMonthlyDelta = (baselineMonthlyIncome + recurringMonthlyIncome) - (baselineMonthlyExpense + recurringMonthlyExpense);

    // 4. Generate 6-Month Data Points
    const data = [];
    let runningNetWorth = currentNetWorth;
    const today = new Date();

    data.push({
      month: 'Now',
      netWorth: runningNetWorth,
      isFuture: false
    });

    for (let i = 1; i <= 6; i++) {
      runningNetWorth += projectedMonthlyDelta;
      data.push({
        month: format(addMonths(today, i), 'MMM'),
        netWorth: runningNetWorth,
        isFuture: true
      });
    }

    return {
      data,
      projectedMonthlyDelta,
      sixMonthDelta: projectedMonthlyDelta * 6,
      currentNetWorth,
      finalNetWorth: runningNetWorth
    };
  }, [rawTransactions, rawAccounts, state.debts, state.recurringTransactions, isBusinessMode]);

  const isPositiveTrajectory = forecastData.projectedMonthlyDelta >= 0;

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              6-Month Wealth Forecast
              <div className="tooltip-trigger" style={{ color: 'var(--text-muted)' }}>
                <Info size={14} />
              </div>
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Based on your recent spending habits and upcoming subscriptions.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 12,
            background: isPositiveTrajectory ? 'var(--income-subtle)' : 'var(--expense-subtle)',
            color: isPositiveTrajectory ? 'var(--income)' : 'var(--expense)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            {isPositiveTrajectory ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositiveTrajectory ? '+' : ''}{formatCurrency(forecastData.projectedMonthlyDelta, state.currency)} / mo
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Projected Change
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositiveTrajectory ? 'var(--income)' : 'var(--expense)'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositiveTrajectory ? 'var(--income)' : 'var(--expense)'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {payload[0].payload.month} {payload[0].payload.isFuture ? '(Projected)' : ''}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(payload[0].value as number, state.currency)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke={isPositiveTrajectory ? 'var(--income)' : 'var(--expense)'}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorNetWorth)"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Subtle indicator for future projection line */}
        <div style={{ position: 'absolute', top: 0, bottom: 20, left: '16.6%', borderLeft: '1px dashed var(--border-strong)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -10, left: '16.6%', fontSize: 10, color: 'var(--text-muted)', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0 4px' }}>
          Future
        </div>
      </div>
      
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <div style={{ color: 'var(--text-muted)' }}>
          Current Wealth: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(forecastData.currentNetWorth, state.currency)}</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          6-Month Projection: <span style={{ color: isPositiveTrajectory ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>{formatCurrency(forecastData.finalNetWorth, state.currency)}</span>
        </div>
      </div>
    </div>
  );
}
