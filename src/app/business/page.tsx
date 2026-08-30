'use client';

import React, { useMemo, useState } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Building, TrendingUp, DollarSign, SplitSquareHorizontal, PieChart as PieChartIcon, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { ForecastWidget } from '@/components/dashboard/ForecastWidget';
import { TransactionsWidget } from '@/components/dashboard/TransactionsWidget';

export default function BusinessDashboard() {
  const { state } = useApp();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  
  if (!state.preferences.enableBusinessMode) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            <Building size={32} />
          </div>
          <h2>Business Mode Disabled</h2>
          <p>Please enable Business & Freelance Mode in Settings to use these features.</p>
        </div>
      </div>
    );
  }

  const [dateRangePreset, setDateRangePreset] = useState<'1M'|'3M'|'6M'|'1Y'|'ALL'>('1M');

  const activeRange = useMemo(() => {
    const today = new Date();
    if (dateRangePreset === '1M') return { start: startOfMonth(today), end: endOfMonth(today) };
    if (dateRangePreset === '3M') return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
    if (dateRangePreset === '6M') return { start: startOfMonth(subMonths(today, 5)), end: endOfMonth(today) };
    if (dateRangePreset === '1Y') return { start: startOfMonth(subMonths(today, 11)), end: endOfMonth(today) };
    return { start: new Date('2000-01-01'), end: new Date('2099-12-31') };
  }, [dateRangePreset]);

  // Ledger Aggregates
  const { ledgerAssets, ledgerLiabilities, ledgerEquity, ledgerRevenue, ledgerExpenses } = useMemo(() => {
    let assets = 0, liabilities = 0, equity = 0, revenue = 0, expenses = 0;

    (state.ledger || []).forEach(l => {
      if (l.accountId === 'Asset') {
        assets += l.debit - l.credit;
      } else if (l.accountId === 'Liability') {
        liabilities += l.credit - l.debit;
      } else if (l.accountId === 'Equity') {
        equity += l.credit - l.debit;
      } else if (l.accountId === 'Revenue') {
        revenue += l.credit - l.debit;
      } else if (l.accountId === 'Expense') {
        expenses += l.debit - l.credit;
      }
    });

    const retainedEarnings = revenue - expenses;
    return {
      ledgerAssets: assets,
      ledgerLiabilities: liabilities,
      ledgerEquity: equity + retainedEarnings,
      ledgerRevenue: revenue,
      ledgerExpenses: expenses
    };
  }, [state.ledger]);

  // Calculate some basic business metrics
  const { totalRevenue, sourceData, periodTxns, collectedTax, paidTax, ruleStats } = useMemo(() => {
    let revenue = 0;
    const sourceTotals: Record<string, number> = {};

    let collectedTax = 0;
    let paidTax = 0;

    const businessTransactions = state.transactions.filter(t => t.isBusiness);
    
    // Calculate Split Rule Distributions (all-time, or we can filter by activeRange. Let's do all-time or activeRange?
    // Let's do activeRange for consistency with the rest of the metrics).
    const pTxns = businessTransactions.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });

    const ruleStats = state.splitRules.map(rule => {
      const txns = pTxns.filter(t => t.appliedSplitRuleId === rule.id);
      const totalProcessed = txns.reduce((sum, t) => sum + t.amount, 0);
      return { rule, totalProcessed };
    }).filter(rs => rs.totalProcessed > 0).sort((a, b) => b.totalProcessed - a.totalProcessed);

    pTxns.forEach(t => {
      if (t.taxAmount) {
        if (t.type === 'income') collectedTax += t.taxAmount;
        if (t.type === 'expense') paidTax += t.taxAmount;
      }
      
      if (t.type === 'income' && t.revenueSourceId) {
        revenue += t.amount;
        sourceTotals[t.revenueSourceId] = (sourceTotals[t.revenueSourceId] || 0) + t.amount;
      }
    });

    const pieData = Object.entries(sourceTotals).map(([id, amount]) => {
      const source = state.revenueSources.find(s => s.id === id);
      return {
        name: source ? source.name : 'Unknown',
        value: amount,
        color: source ? source.color : 'var(--border)'
      };
    });


    return { totalRevenue: revenue, sourceData: pieData, periodTxns: pTxns, collectedTax, paidTax, ruleStats };
  }, [state.transactions, state.revenueSources, state.splitRules, activeRange]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Hub</h1>
          <p className="page-subtitle">Track your freelance clients, business revenue, and splits</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTransactionForm(true)}>
          <Plus size={16} /> Log Business Income
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(52, 211, 153, 0.15)', color: 'var(--income)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Attributed Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalRevenue, state.currency)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Sources</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{state.revenueSources.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SplitSquareHorizontal size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Split Rules</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{state.splitRules.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--expense)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tax (Collected / Paid)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
               <span style={{ color: 'var(--income)' }}>+{formatCurrency(collectedTax, state.currency)}</span> / <span style={{ color: 'var(--expense)' }}>-{formatCurrency(paidTax, state.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <ForecastWidget transactions={state.transactions} accounts={state.accounts} isBusinessMode={true} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <PieChartIcon size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Revenue by Source</h3>
          </div>
          
          {sourceData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => formatCurrency(Number(value) || 0, state.currency)}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <p>No revenue assigned to specific sources yet.</p>
            </div>
          )}
        </div>
        
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 24 }}>Financial Statements (General Ledger)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Balance Sheet */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>Balance Sheet</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Assets</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(ledgerAssets, state.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--text-secondary)' }}>
                <span>Liabilities</span>
                <span>{formatCurrency(ledgerLiabilities, state.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Equity (inc. Retained Earnings)</span>
                <span>{formatCurrency(ledgerEquity, state.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontWeight: 600, fontSize: 12, color: ledgerAssets === (ledgerLiabilities + ledgerEquity) ? 'var(--income)' : 'var(--expense)' }}>
                <span>Accounting Equation</span>
                <span>{ledgerAssets === (ledgerLiabilities + ledgerEquity) ? 'Balanced ✓' : 'Out of Balance ⚠'}</span>
              </div>
            </div>

            {/* Income Statement */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>Income Statement</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--income)' }}>
                <span>Revenue</span>
                <span>{formatCurrency(ledgerRevenue, state.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--expense)' }}>
                <span>Expenses</span>
                <span>{formatCurrency(ledgerExpenses, state.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontWeight: 700 }}>
                <span>Net Income</span>
                <span>{formatCurrency(ledgerRevenue - ledgerExpenses, state.currency)}</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a href="/business/ledger" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              View Full General Ledger
            </a>
          </div>
        </div>
      </div>

      {ruleStats.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>Split Rule Distributions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {ruleStats.map(({ rule, totalProcessed }) => (
              <div key={rule.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SplitSquareHorizontal size={18} color="var(--accent)" />
                      {rule.name}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Processed</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalProcessed, state.currency)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rule.splits.map((split, idx) => {
                    const targetName = split.targetType === 'account' 
                      ? state.accounts.find(a => a.id === split.targetId)?.name || 'Unknown Account'
                      : state.categories.find(c => c.id === split.targetId)?.name || 'Unknown Category';
                    const amount = (totalProcessed * (split.percentage / 100));
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-input)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{targetName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{split.targetType === 'account' ? 'Bank Account' : 'Category'} &middot; {split.percentage}%</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(amount, state.currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Dashboard Widgets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>Performance Overview</h2>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 4, borderRadius: 8 }}>
          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(p => (
            <button
              key={p}
              onClick={() => setDateRangePreset(p)}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none',
                background: dateRangePreset === p ? 'var(--accent)' : 'transparent',
                color: dateRangePreset === p ? '#fff' : 'var(--text-muted)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ minHeight: 400 }}>
          <SummaryCards transactions={state.transactions.filter(t => t.isBusiness)} activeRange={activeRange} />
        </div>
        <div style={{ minHeight: 400 }}>
          <IncomeExpenseChart transactions={state.transactions.filter(t => t.isBusiness)} activeRange={activeRange} />
        </div>
      </div>
      
      <div style={{ minHeight: 400 }}>
        <TransactionsWidget transactions={periodTxns.slice(0, 10)} />
      </div>

      {showTransactionForm && (
        <TransactionForm 
          onClose={() => setShowTransactionForm(false)} 
          defaultValues={{ type: 'income', isBusiness: true }}
        />
      )}
    </div>
  );
}
