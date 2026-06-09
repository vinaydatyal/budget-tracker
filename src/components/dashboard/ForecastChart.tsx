import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useApp, formatCurrency } from '@/context/AppContext';

export function ForecastChart() {
  const { state } = useApp();

  const data = useMemo(() => {
    // 1. Calculate current balance
    let currentBalance = state.transactions.reduce((sum, t) => 
      t.type === 'income' ? sum + t.amount : sum - t.amount
    , 0);

    const chartData = [];
    const today = new Date();
    
    // We'll forecast 30 days into the future
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      // Add any recurring transactions that happen on this date
      const daysRecurring = state.recurringTransactions.filter(r => r.active && r.nextDueDate === dateStr);
      let dayChange = 0;
      daysRecurring.forEach(r => {
        dayChange += (r.type === 'income' ? r.amount : -r.amount);
      });

      currentBalance += dayChange;

      chartData.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        balance: currentBalance,
        change: dayChange
      });
    }

    return chartData;
  }, [state.transactions, state.recurringTransactions]);

  if (data.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="section-title">30-Day Balance Forecast</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          Projected balance based on your upcoming recurring transactions.
        </p>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="section-title">30-Day Balance Forecast</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Projected balance based on your upcoming recurring transactions.
      </p>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--balance)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--balance)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={v => new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency, maximumFractionDigits: 0, notation: 'compact' }).format(v)}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              formatter={(value: any) => [formatCurrency(Number(value) || 0, state.currency), 'Projected Balance']}
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="var(--balance)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorBalance)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
