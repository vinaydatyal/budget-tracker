'use client';

import { useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { format, subMonths } from 'date-fns';
import { Lightbulb, TrendingUp, TrendingDown, Award, Calendar, AlertTriangle } from 'lucide-react';

interface Insight {
  icon: React.ElementType;
  color: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
}

export function InsightsPanel() {
  const { state } = useApp();

  const insights = useMemo(() => {
    const results: Insight[] = [];
    const today = new Date();
    const thisMonth = format(today, 'yyyy-MM');
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

    const thisTxns = state.transactions.filter(t => t.date.startsWith(thisMonth));
    const lastTxns = state.transactions.filter(t => t.date.startsWith(lastMonth));

    const thisExpenses = thisTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const thisIncome = thisTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const lastExpenses = lastTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Savings rate
    if (thisIncome > 0) {
      const rate = ((thisIncome - thisExpenses) / thisIncome) * 100;
      if (rate >= 30) {
        results.push({ icon: Award, color: '#22c55e', type: 'positive', text: `🏆 Excellent! You're saving ${rate.toFixed(0)}% of your income this month.` });
      } else if (rate < 0) {
        results.push({ icon: AlertTriangle, color: '#ef4444', type: 'warning', text: `⚠️ You're spending more than you earn this month. Consider cutting back.` });
      } else {
        results.push({ icon: TrendingUp, color: '#f59e0b', type: 'neutral', text: `You're saving ${rate.toFixed(0)}% of your income. Aim for 20%+ for a healthy savings rate.` });
      }
    }

    // Month-over-month expense change
    if (lastExpenses > 0 && thisExpenses > 0) {
      const pct = ((thisExpenses - lastExpenses) / lastExpenses) * 100;
      if (pct > 15) {
        results.push({ icon: TrendingDown, color: '#ef4444', type: 'warning', text: `Spending is up ${pct.toFixed(0)}% vs last month (${formatCurrency(thisExpenses, state.currency)} vs ${formatCurrency(lastExpenses, state.currency)}).` });
      } else if (pct < -10) {
        results.push({ icon: TrendingDown, color: '#22c55e', type: 'positive', text: `Great job! Spending is down ${Math.abs(pct).toFixed(0)}% vs last month. You saved ${formatCurrency(lastExpenses - thisExpenses, state.currency)} more.` });
      }
    }

    // Top spending category this month
    const catSpend: Record<string, number> = {};
    thisTxns.filter(t => t.type === 'expense').forEach(t => {
      catSpend[t.categoryId] = (catSpend[t.categoryId] || 0) + t.amount;
    });
    const topCatEntry = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCatEntry) {
      const topCat = state.categories.find(c => c.id === topCatEntry[0]);
      if (topCat && thisExpenses > 0) {
        const pct = (topCatEntry[1] / thisExpenses) * 100;
        results.push({ icon: Lightbulb, color: '#f59e0b', type: 'neutral', text: `${topCat.icon} ${topCat.name} is your biggest expense category at ${formatCurrency(topCatEntry[1], state.currency)} (${pct.toFixed(0)}% of total expenses).` });
      }
    }

    // Over-budget warning
    const goalsThisMonth = state.budgetGoals.filter(b => b.month === thisMonth && b.goalType !== 'save');
    state.categories.forEach(cat => {
      const explicitGoal = goalsThisMonth.find(g => g.categoryId === cat.id);
      const limit = explicitGoal ? explicitGoal.monthlyLimit : cat.monthlyBudget;
      
      if (limit && limit > 0) {
        const spent = thisTxns.filter(t => t.type === 'expense' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
        if (spent > limit) {
          const over = spent - limit;
          results.push({ icon: AlertTriangle, color: '#ef4444', type: 'warning', text: `🚨 Over budget! You've spent ${formatCurrency(over, state.currency)} more than your limit for ${cat.icon} ${cat.name}.` });
        } else if (spent / limit > 0.9) {
          results.push({ icon: AlertTriangle, color: '#f97316', type: 'warning', text: `⚠️ Approaching limit! You are at ${Math.round((spent/limit)*100)}% of your budget for ${cat.icon} ${cat.name}.` });
        }
      }
    });

    // Highest spend day of week
    const dayTotals: Record<string, number> = {};
    state.transactions.filter(t => t.type === 'expense').forEach(t => {
      const day = format(new Date(t.date), 'EEEE');
      dayTotals[day] = (dayTotals[day] || 0) + t.amount;
    });
    const topDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    if (topDay) {
      results.push({ icon: Calendar, color: '#8b5cf6', type: 'neutral', text: `📅 You tend to spend the most on ${topDay[0]}s. Total: ${formatCurrency(topDay[1], state.currency)} across all time.` });
    }

    // Upcoming recurring bills this week
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today0); weekEnd.setDate(weekEnd.getDate() + 7);
    const upcomingTotal = state.recurringTransactions
      .filter(r => {
        const d = new Date(r.nextDueDate);
        return d >= today0 && d <= weekEnd && r.type === 'expense';
      })
      .reduce((s, r) => s + r.amount, 0);

    if (upcomingTotal > 0) {
      results.push({ icon: Calendar, color: '#f97316', type: 'warning', text: `🔔 You have ${formatCurrency(upcomingTotal, state.currency)} in recurring bills due this week.` });
    }

    return results.sort((a, b) => {
      // Prioritize warnings
      if (a.type === 'warning' && b.type !== 'warning') return -1;
      if (a.type !== 'warning' && b.type === 'warning') return 1;
      return 0;
    }).slice(0, 4);
  }, [state.transactions, state.categories, state.recurringTransactions, state.budgetGoals, state.currency]);

  if (insights.length === 0) return null;

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={16} color="#f59e0b" />
          Smart Insights
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Auto-generated</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {insights.map((insight, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
            borderRadius: 10, background: 'var(--bg-input)',
            borderLeft: `3px solid ${insight.color}`,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${insight.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <insight.icon size={15} color={insight.color} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
