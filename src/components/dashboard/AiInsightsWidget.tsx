import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { isBefore, addDays, isAfter } from 'date-fns';

interface Insight {
  id: string;
  type: 'warning' | 'positive' | 'info';
  iconType: 'alert' | 'trend_up' | 'trend_down' | 'check' | 'sparkle' | 'info';
  title: string;
  text: string;
}

export function AiInsightsWidget() {
  const { state } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we already have cached insights for this session
    const cached = sessionStorage.getItem('ai_insights');
    if (cached) {
      try {
        setInsights(JSON.parse(cached));
        return;
      } catch (e) {
        // ignore
      }
    }

    const fetchInsights = async () => {
      // Don't bother AI if there is barely any data
      if (state.transactions.length < 5 && state.recurringTransactions.length === 0 && state.debts.length === 0) {
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        // Summarize context to avoid huge payloads
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const thirtyDaysAgo = addDays(now, -30);

        const upcomingRecurring = state.recurringTransactions.filter(r => r.active && isBefore(new Date(r.nextDueDate), thirtyDaysFromNow));
        const activeDebts = state.debts.filter(d => d.balance > 0);
        const activeSavings = state.savingsGoals.filter(s => s.currentAmount < s.targetAmount);

        // Basic spending summary for last 30 days
        let recentSpend = 0;
        let recentIncome = 0;
        state.transactions.forEach(t => {
          const d = new Date(t.date);
          if (isAfter(d, thirtyDaysAgo) && isBefore(d, now)) {
            if (t.type === 'expense') recentSpend += t.amount;
            if (t.type === 'income') recentIncome += t.amount;
          }
        });

        const context = {
          currency: state.currency || 'USD',
          recent30DaysActivity: {
            totalSpent: recentSpend,
            totalIncome: recentIncome
          },
          upcomingRecurring: upcomingRecurring.map(r => ({ name: r.description, amount: r.amount, type: r.type, nextDate: r.nextDueDate })),
          activeDebts: activeDebts.map(d => ({ name: d.name, balance: d.balance, interestRate: d.interestRate, minimumPayment: d.minimumPayment })),
          savingsGoals: activeSavings.map(s => ({ name: s.name, progress: s.currentAmount, target: s.targetAmount }))
        };

        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context })
        });

        if (!response.ok) {
          throw new Error('Failed to generate insights');
        }

        const data: Insight[] = await response.json();
        setInsights(data);
        sessionStorage.setItem('ai_insights', JSON.stringify(data));
      } catch (err) {
        console.error(err);
        setError('Could not generate insights right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [state.transactions.length, state.recurringTransactions, state.debts, state.savingsGoals, state.revenueSources, state.currency]);

  if (isDismissed || (!isLoading && insights.length === 0 && !error)) return null;

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
        ) : error ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</div>
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
