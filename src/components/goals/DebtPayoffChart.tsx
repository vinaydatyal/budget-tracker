import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Debt } from '@/lib/types';
import { addMonths, format } from 'date-fns';

export function DebtPayoffChart() {
  const { state } = useApp();
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);

  const data = useMemo(() => {
    if (state.debts.length === 0) return [];

    let currentDebts = state.debts.map(d => ({ ...d }));
    let currentDate = new Date();
    
    const chartData = [];
    let isDebtFree = false;

    // Simulate up to 360 months (30 years)
    for (let i = 0; i < 360; i++) {
      let totalBalance = currentDebts.reduce((sum, d) => sum + d.balance, 0);
      chartData.push({
        month: format(currentDate, 'MMM yy'),
        date: new Date(currentDate), // Keep date for tooltip sorting
        balance: totalBalance
      });

      if (totalBalance <= 0) {
        isDebtFree = true;
        break;
      }

      // Sort debts based on strategy
      if (strategy === 'snowball') {
        currentDebts.sort((a, b) => a.balance - b.balance);
      } else {
        currentDebts.sort((a, b) => b.interestRate - a.interestRate);
      }

      let availableCash = currentDebts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraPayment;

      // Apply payments
      for (let debt of currentDebts) {
        if (debt.balance <= 0) continue;
        
        // Add interest for the month (APR / 12)
        const interest = debt.balance * (debt.interestRate / 100 / 12);
        debt.balance += interest;

        // Minimum payment
        let payment = Math.min(debt.minimumPayment, debt.balance);
        debt.balance -= payment;
        availableCash -= payment;
      }

      // Apply remaining extra cash to target debt
      if (availableCash > 0) {
        for (let debt of currentDebts) {
          if (debt.balance > 0) {
            let extra = Math.min(availableCash, debt.balance);
            debt.balance -= extra;
            availableCash -= extra;
            if (availableCash <= 0) break;
          }
        }
      }

      currentDate = addMonths(currentDate, 1);
    }

    return chartData;
  }, [state.debts, strategy, extraPayment]);

  if (state.debts.length === 0) return null;

  const debtFreeDate = data.length > 0 && data[data.length - 1].balance <= 0 ? data[data.length - 1].month : '30+ Years';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, zIndex: 10 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{label}</div>
          <div style={{ color: 'var(--expense)' }}>
            Remaining Debt: {formatCurrency(payload[0].value, state.currency)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <h2 className="card-title">Debt Payoff Visualizer</h2>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
          <select 
            className="form-select form-select-sm" 
            style={{ width: 140 }}
            value={strategy}
            onChange={e => setStrategy(e.target.value as any)}
          >
            <option value="avalanche">Avalanche (Highest %)</option>
            <option value="snowball">Snowball (Smallest Balance)</option>
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Extra {state.currency}/mo:</span>
            <input 
              type="number" 
              className="form-input form-input-sm" 
              style={{ width: 80 }}
              value={extraPayment || ''}
              onChange={e => setExtraPayment(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      </div>
      
      <div style={{ padding: '0 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Projected Debt Free Date:</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--income)' }}>{debtFreeDate}</span>
        </div>

        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--expense)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--expense)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                axisLine={false} 
                tickLine={false}
                minTickGap={30}
              />
              <YAxis 
                tickFormatter={(val) => `$${val.toLocaleString()}`}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                axisLine={false} 
                tickLine={false}
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="var(--expense)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorDebt)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
