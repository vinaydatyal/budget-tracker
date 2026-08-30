import React, { useMemo, useState } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { subMonths, isAfter, isBefore } from 'date-fns';
import { Transaction } from '@/lib/types';

export function AiInsightsWidget() {
  const { state } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);

  const insights = useMemo(() => {
    if (state.transactions.length < 5) return [];

    const now = new Date();
    const oneMonthAgo = subMonths(now, 1);
    const twoMonthsAgo = subMonths(now, 2);

    const personalExpenses = state.transactions.filter(t => !t.isBusiness && t.type === 'expense');

    const lastMonthExpenses = personalExpenses.filter(t => {
      const d = new Date(t.date);
      return isAfter(d, oneMonthAgo) && isBefore(d, now);
    });

    const previousMonthExpenses = personalExpenses.filter(t => {
      const d = new Date(t.date);
      return isAfter(d, twoMonthsAgo) && isBefore(d, oneMonthAgo);
    });

    const categorySpending: Record<string, { lastMonth: number, prevMonth: number }> = {};
    
    state.categories.forEach(c => {
      categorySpending[c.id] = { lastMonth: 0, prevMonth: 0 };
    });

    lastMonthExpenses.forEach(t => {
      if (categorySpending[t.categoryId]) categorySpending[t.categoryId].lastMonth += t.amount;
    });

    previousMonthExpenses.forEach(t => {
      if (categorySpending[t.categoryId]) categorySpending[t.categoryId].prevMonth += t.amount;
    });

    const generatedInsights = [];

    // Check for high spending categories
    let highestIncreaseCat = null;
    let highestIncreaseAmount = 0;

    for (const [catId, data] of Object.entries(categorySpending)) {
      if (data.prevMonth > 0) {
        const increase = data.lastMonth - data.prevMonth;
        if (increase > highestIncreaseAmount && increase > 50) {
          highestIncreaseAmount = increase;
          highestIncreaseCat = catId;
        }
      }
    }

    if (highestIncreaseCat) {
      const cat = state.categories.find(c => c.id === highestIncreaseCat);
      generatedInsights.push({
        id: '1',
        icon: <TrendingUp size={16} color="var(--expense)" />,
        title: 'Spending Alert',
        text: `You spent ${formatCurrency(highestIncreaseAmount, state.currency)} more on ${cat?.name || 'this category'} in the last 30 days compared to the previous month.`,
        type: 'warning'
      });
    } else {
      // Find a savings insight if no bad alerts
      generatedInsights.push({
        id: '2',
        icon: <TrendingDown size={16} color="var(--income)" />,
        title: 'Looking Good',
        text: 'Your spending is well-controlled compared to last month. Keep it up!',
        type: 'positive'
      });
    }

    // Debt check
    const highInterestDebts = state.debts.filter(d => d.balance > 0 && d.interestRate > 15);
    if (highInterestDebts.length > 0) {
      generatedInsights.push({
        id: '3',
        icon: <AlertCircle size={16} color="var(--expense)" />,
        title: 'High Interest Debt',
        text: `You have ${highInterestDebts.length} high-interest debt(s). Consider focusing your surplus funds on paying these down to save on interest.`,
        type: 'warning'
      });
    }

    return generatedInsights;
  }, [state.transactions, state.debts, state.currency, state.categories]);

  if (insights.length === 0 || isDismissed) return null;

  return (
    <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(to right, rgba(168, 85, 247, 0.05), rgba(59, 130, 246, 0.05))', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(168, 85, 247, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#a855f7" />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>AI Financial Insights</h3>
        </div>
        <button className="btn btn-icon" style={{ padding: 4 }} onClick={() => setIsDismissed(true)}>
          <span style={{ fontSize: 12 }}>Dismiss</span>
        </button>
      </div>
      
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {insights.map(insight => (
          <div key={insight.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ 
              marginTop: 2,
              padding: 8, 
              borderRadius: 8, 
              background: insight.type === 'warning' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' 
            }}>
              {insight.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{insight.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
