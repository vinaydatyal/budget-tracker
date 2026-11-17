'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Insight {
  id: string;
  type: 'warning' | 'positive' | 'info';
  iconType: 'alert' | 'trend_up' | 'trend_down' | 'check' | 'sparkle' | 'info';
  title: string;
  text: string;
}

function generateLocalInsights(context: any): Insight[] {
  const insights: Insight[] = [];
  const curr = context?.currency || '₹';
  const spent = Number(context?.recent30DaysActivity?.totalSpent || 0);
  const income = Number(context?.recent30DaysActivity?.totalIncome || 0);

  if (income > 0 || spent > 0) {
    if (income >= spent) {
      insights.push({
        id: 'cf-positive',
        type: 'positive',
        iconType: 'trend_up',
        title: 'Net Surplus',
        text: `Your income (${curr}${income.toLocaleString()}) outpaced expenses (${curr}${spent.toLocaleString()}) over the last 30 days by ${curr}${(income - spent).toLocaleString()}.`
      });
    } else {
      insights.push({
        id: 'cf-deficit',
        type: 'warning',
        iconType: 'trend_down',
        title: 'Spending Alert',
        text: `Your 30-day expenses (${curr}${spent.toLocaleString()}) exceeded your recorded income (${curr}${income.toLocaleString()}). Monitor discretionary expenses to maintain savings.`
      });
    }
  }

  if (context?.upcomingRecurring && context.upcomingRecurring.length > 0) {
    const nextBill = context.upcomingRecurring[0];
    insights.push({
      id: 'recurring-reminder',
      type: 'info',
      iconType: 'sparkle',
      title: 'Upcoming Subscription',
      text: `${nextBill.name} (${curr}${Number(nextBill.amount || 0).toLocaleString()}) is scheduled for ${nextBill.nextDate || 'soon'}. Ensure your account has sufficient balance.`
    });
  }

  if (context?.activeDebts && context.activeDebts.length > 0) {
    const highestDebt = [...context.activeDebts].sort((a, b) => Number(b.interestRate || 0) - Number(a.interestRate || 0))[0];
    insights.push({
      id: 'debt-strategy',
      type: 'warning',
      iconType: 'alert',
      title: 'Debt Payoff Focus',
      text: `Prioritize paying down ${highestDebt.name} (Balance: ${curr}${Number(highestDebt.balance || 0).toLocaleString()}) to minimize cumulative interest charges.`
    });
  }

  if (context?.savingsGoals && context.savingsGoals.length > 0) {
    const goal = context.savingsGoals[0];
    const progress = Number(goal.progress || 0);
    const target = Number(goal.target || 0);
    const pct = target > 0 ? Math.round((progress / target) * 100) : 0;
    insights.push({
      id: 'savings-milestone',
      type: 'positive',
      iconType: 'check',
      title: 'Savings Progress',
      text: `You have reached ${pct}% of your "${goal.name}" target (${curr}${progress.toLocaleString()} of ${curr}${target.toLocaleString()}). Keep it up!`
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'welcome-solv',
      type: 'info',
      iconType: 'sparkle',
      title: 'Welcome to Solv',
      text: 'Log your transactions using Quick Add (A) to unlock automated personalized financial recommendations.'
    });
    insights.push({
      id: 'cloud-storage-ready',
      type: 'positive',
      iconType: 'check',
      title: 'Cloud Sync Ready',
      text: 'Sign in to automatically sync your ledger in real-time across all your desktop and mobile devices.'
    });
  }

  return insights;
}

export function AiInsightsWidget() {
  const { state } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      // Check session storage first to avoid unnecessary fetches
      const cached = sessionStorage.getItem('ai_insights');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInsights(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // ignore cache parse error
        }
      }

      setIsLoading(true);

      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      let recentSpend = 0;
      let recentIncome = 0;

      const upcomingRecurring = (state.recurringTransactions || []).filter(r => {
        if (!r.nextDueDate) return false;
        const d = new Date(r.nextDueDate);
        const diff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 30;
      });

      const activeDebts = (state.debts || []).filter(d => (d.balance || 0) > 0);
      const activeSavings = (state.savingsGoals || []).filter(s => (s.currentAmount || 0) < (s.targetAmount || 0));

      (state.transactions || []).forEach(t => {
        const d = new Date(t.date);
        if (d >= thirtyDaysAgo && d <= today) {
          if (t.type === 'expense') recentSpend += Number(t.amount || 0);
          if (t.type === 'income') recentIncome += Number(t.amount || 0);
        }
      });

      const context = {
        currentDate: today.toISOString().split('T')[0],
        currency: state.currency || 'USD',
        recent30DaysActivity: {
          totalSpent: recentSpend,
          totalIncome: recentIncome
        },
        upcomingRecurring: upcomingRecurring.map(r => ({ name: r.description, amount: r.amount, type: r.type, nextDate: r.nextDueDate })),
        activeDebts: activeDebts.map(d => ({ name: d.name, balance: d.balance, interestRate: d.interestRate, minimumPayment: d.minimumPayment })),
        savingsGoals: activeSavings.map(s => ({ name: s.name, progress: s.currentAmount, target: s.targetAmount }))
      };

      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context })
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setInsights(data);
            sessionStorage.setItem('ai_insights', JSON.stringify(data));
            return;
          }
        }
        
        // Fallback to local heuristic generator
        const localInsights = generateLocalInsights(context);
        setInsights(localInsights);
        sessionStorage.setItem('ai_insights', JSON.stringify(localInsights));
      } catch (err: any) {
        console.warn('AiInsights fetch fallback to heuristics:', err);
        const localInsights = generateLocalInsights(context);
        setInsights(localInsights);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [state.transactions.length, state.recurringTransactions, state.debts, state.savingsGoals, state.revenueSources, state.currency]);

  if (isDismissed || (!isLoading && insights.length === 0)) return null;

  const renderIcon = (type: Insight['iconType'], color: string) => {
    switch (type) {
      case 'alert': return <AlertCircle size={16} color={color} />;
      case 'trend_up': return <TrendingUp size={16} color={color} />;
      case 'trend_down': return <TrendingDown size={16} color={color} />;
      case 'check': return <CheckCircle size={16} color={color} />;
      case 'sparkle': return <Sparkles size={16} color={color} />;
      case 'info': return <Info size={16} color={color} />;
      default: return <Sparkles size={16} color={color} />;
    }
  };

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
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168, 85, 247, 0.1)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: '30%', height: 14, borderRadius: 4, background: 'rgba(168, 85, 247, 0.1)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '80%', height: 12, borderRadius: 4, background: 'rgba(168, 85, 247, 0.1)', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ))}
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
          </div>
        ) : (
          insights.map(insight => {
            const isWarning = insight.type === 'warning';
            const isPos = insight.type === 'positive';
            const bgColor = isWarning ? 'rgba(239, 68, 68, 0.1)' : isPos ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)';
            const iconColor = isWarning ? 'var(--expense)' : isPos ? 'var(--income)' : '#3b82f6';

            return (
              <div key={insight.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ 
                  marginTop: 2,
                  padding: 8, 
                  borderRadius: 8, 
                  background: bgColor 
                }}>
                  {renderIcon(insight.iconType, iconColor)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{insight.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
