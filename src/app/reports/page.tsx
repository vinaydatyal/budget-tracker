'use client';

import { useState, useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { format, subMonths, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, startOfWeek, endOfWeek, differenceInDays, eachMonthOfInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, Cell, PieChart, Pie,
} from 'recharts';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
  TrendingUp, TrendingDown, Target, Calendar, AlertTriangle,
  DollarSign, Activity, Zap, Award, ArrowUpRight, ArrowDownRight, Filter, X
} from 'lucide-react';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { CashFlowSankey } from '@/components/dashboard/CashFlowSankey';

type Tab = 'overview' | 'trends' | 'categories' | 'money-flow';
type GlobalDatePreset = '7D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string; sub?: string; color: string;
  icon: React.ElementType; trend?: { pct: number; up: boolean };
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 16, padding: 20,
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 30px -8px ${color}40`;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.transform = '';
      (e.currentTarget as HTMLElement).style.boxShadow = '';
    }}
    >
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.12, filter: 'blur(20px)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: trend.up ? 'var(--income)' : 'var(--expense)', background: trend.up ? 'var(--income-subtle)' : 'var(--expense-subtle)', padding: '3px 8px', borderRadius: 999 }}>
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.pct).toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Savings Rate Gauge
function SavingsGauge({ rate }: { rate: number }) {
  const clipped = Math.min(100, Math.max(0, rate));
  const color = rate >= 50 ? '#22c55e' : rate >= 20 ? '#f59e0b' : '#ef4444';
  const data = [{ name: 'rate', value: clipped }, { name: 'rest', value: 100 - clipped }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 120, height: 65, overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={44} outerRadius={60} dataKey="value" strokeWidth={0}>
              <Cell fill={color} />
              <Cell fill="var(--bg-input)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: -8 }}>{clipped.toFixed(0)}%</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Savings Rate</div>
    </div>
  );
}

// Heatmap calendar for spending
function SpendingHeatmap({ transactions, activeRange }: { transactions: any[], activeRange: { start: Date, end: Date } }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const diffDays = differenceInDays(activeRange.end, activeRange.start);
  const isSmallRange = diffDays <= 35;
  
  let renderStart = new Date(activeRange.start);
  let renderEnd = new Date(activeRange.end);
  if (diffDays > 185) {
    renderStart = new Date(activeRange.end);
    renderStart.setDate(renderStart.getDate() - 180); // Cap at 6 months max
  }

  const days = eachDayOfInterval({ start: renderStart, end: renderEnd });
  const monthStarts = eachMonthOfInterval({ start: renderStart, end: renderEnd });

  const dayAmounts: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      const tDate = new Date(t.date);
      if (tDate >= renderStart && tDate <= renderEnd) {
        const d = t.date.slice(0, 10);
        dayAmounts[d] = (dayAmounts[d] || 0) + t.amount;
      }
    }
  });

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => t.date.startsWith(selectedDate));
  }, [transactions, selectedDate]);

  const maxAmt = Math.max(1, ...Object.values(dayAmounts));
  const firstDayOfWeek = getDay(days[0]);
  const blanks = Array.from({ length: firstDayOfWeek });

  return (
    <div>
      <AnimatePresence mode="wait">
        {isSmallRange ? (
          <motion.div 
            key="small-range"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 4 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const amt = dayAmounts[key] || 0;
                const intensity = amt > 0 ? 0.2 + (amt / maxAmt) * 0.8 : 0;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <motion.div layoutId={`day-${key}`} key={key} title={amt > 0 ? `${format(day, 'MMM d')}: $${amt.toFixed(0)}` : format(day, 'MMM d')} style={{
                    aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                    background: amt > 0 ? `rgba(239, 68, 68, ${intensity})` : 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: intensity > 0.5 ? '#fff' : 'var(--text-muted)',
                    border: isToday ? '1.5px solid var(--accent)' : '1px solid transparent',
                    transition: 'transform 0.15s, background 0.15s',
                  }}
                  onClick={() => setSelectedDate(key)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                    (e.currentTarget as HTMLElement).style.background = amt > 0 ? `rgba(239, 68, 68, ${intensity + 0.1})` : 'var(--bg-elevated)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.background = amt > 0 ? `rgba(239, 68, 68, ${intensity})` : 'var(--bg-input)';
                  }}
                  >
                    {format(day, 'd')}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="large-range"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}
          >
            {monthStarts.map(monthStart => {
              const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
              const firstDayOfWeek = getDay(monthStart);
              const blanks = Array.from({ length: firstDayOfWeek });

              return (
                <div key={monthStart.toISOString()} style={{ minWidth: 160, flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-main)', textAlign: 'center' }}>
                    {format(monthStart, 'MMMM yyyy')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                    {daysInMonth.map(day => {
                      const key = format(day, 'yyyy-MM-dd');
                      const isOutOfRange = day < renderStart || day > renderEnd;
                      const amt = isOutOfRange ? 0 : (dayAmounts[key] || 0);
                      const intensity = amt > 0 ? 0.2 + (amt / maxAmt) * 0.8 : 0;
                      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <motion.div layoutId={`day-${key}`} key={key} title={amt > 0 ? `${format(day, 'MMM d')}: $${amt.toFixed(0)}` : format(day, 'MMM d')} style={{
                          aspectRatio: '1', borderRadius: 4, cursor: isOutOfRange ? 'default' : 'pointer',
                          background: amt > 0 ? `rgba(239, 68, 68, ${intensity})` : 'var(--bg-input)',
                          opacity: isOutOfRange ? 0.15 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 500, color: intensity > 0.5 ? '#fff' : 'var(--text-muted)',
                          border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                          transition: 'transform 0.15s, background 0.15s',
                        }}
                        onClick={() => !isOutOfRange && setSelectedDate(key)}
                        onMouseEnter={e => {
                          if (isOutOfRange) return;
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                          (e.currentTarget as HTMLElement).style.background = amt > 0 ? `rgba(239, 68, 68, ${intensity + 0.1})` : 'var(--bg-elevated)';
                        }}
                        onMouseLeave={e => {
                          if (isOutOfRange) return;
                          (e.currentTarget as HTMLElement).style.transform = '';
                          (e.currentTarget as HTMLElement).style.background = amt > 0 ? `rgba(239, 68, 68, ${intensity})` : 'var(--bg-input)';
                        }}
                        >
                          {format(day, 'd')}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(239, 68, 68, ${v})` }} />
        ))}
        <span>More</span>
      </div>

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)} style={{ zIndex: 100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '90%', padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Transactions for {format(new Date(selectedDate), 'MMMM d, yyyy')}</h2>
              <button className="btn btn-icon" onClick={() => setSelectedDate(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {selectedTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                  No transactions on this day.
                </div>
              ) : (
                <TransactionList 
                  transactions={selectedTransactions} 
                  onEdit={setEditingTxn} 
                  selectedIds={[]} 
                  onToggleSelect={() => {}} 
                  onSelectAll={() => {}} 
                />
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedDate(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsAddingNew(true)}>Add Transaction</button>
            </div>
          </div>
        </div>
      )}

      {editingTxn && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setEditingTxn(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 0, overflow: 'visible' }}>
            <TransactionForm onClose={() => setEditingTxn(null)} editing={editingTxn} />
          </div>
        </div>
      )}

      {isAddingNew && selectedDate && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setIsAddingNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 0, overflow: 'visible' }}>
            <TransactionForm onClose={() => setIsAddingNew(false)} defaultDate={selectedDate} />
          </div>
        </div>
      )}
    </div>
  );
}

function CashFlowVisualizer({ income, expenses, taxRate }: { income: number; expenses: number; taxRate: number }) {
  if (income <= 0) return <div className="empty-state" style={{ minHeight: 150 }}>No income data for this period</div>;
  
  const tax = income * (taxRate / 100);
  const netSavings = income - expenses - tax;
  
  const taxPct = (tax / income) * 100;
  const expPct = (expenses / income) * 100;
  const savPct = Math.max(0, (netSavings / income) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
          <span>Total Income</span>
          <span style={{ color: 'var(--income)' }}>100%</span>
        </div>
        <div style={{ width: '100%', height: 28, background: 'var(--income)', borderRadius: 6 }} />
      </div>

      <div style={{ display: 'flex', paddingLeft: 12 }}>
        <div style={{ width: 2, height: 16, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {taxPct > 0 && (
          <div style={{ width: `${taxPct}%`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '100%', height: 28, background: '#f59e0b', borderRadius: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
              <strong style={{ color: '#f59e0b' }}>Tax</strong><br/>{taxPct.toFixed(1)}%
            </div>
          </div>
        )}
        {expPct > 0 && (
          <div style={{ width: `${expPct}%`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '100%', height: 28, background: 'var(--expense)', borderRadius: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
              <strong style={{ color: 'var(--expense)' }}>Expenses</strong><br/>{expPct.toFixed(1)}%
            </div>
          </div>
        )}
        {savPct > 0 && (
          <div style={{ width: `${savPct}%`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '100%', height: 28, background: '#6366f1', borderRadius: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
              <strong style={{ color: '#6366f1' }}>Savings</strong><br/>{savPct.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function ReportsPage() {
  const { state, dispatch, personalTransactions, personalAccounts, personalCategories } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // ── Global Date Range State ───────────────────────────────────────────────
  const [dateRangePreset, setDateRangePreset] = useState<GlobalDatePreset>('1M');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const today = new Date();

  // Calculate active and previous date ranges
  const { activeRange, previousRange } = useMemo(() => {
    let start = new Date();
    let end = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (dateRangePreset === 'CUSTOM' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 24 * 3600 * 1000);
      prevStart = new Date(prevEnd.getTime() - diff);
    } else {
      if (dateRangePreset === '7D') {
        start = subDays(today, 6);
        end = today;
        prevStart = subDays(start, 7);
        prevEnd = subDays(end, 7);
      } else if (dateRangePreset === '1M') {
        start = startOfMonth(today);
        end = endOfMonth(today);
        prevStart = startOfMonth(subMonths(today, 1));
        prevEnd = endOfMonth(subMonths(today, 1));
      } else if (dateRangePreset === '3M') {
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
        prevStart = startOfMonth(subMonths(today, 5));
        prevEnd = endOfMonth(subMonths(today, 3));
      } else if (dateRangePreset === '6M') {
        start = startOfMonth(subMonths(today, 5));
        end = endOfMonth(today);
        prevStart = startOfMonth(subMonths(today, 11));
        prevEnd = endOfMonth(subMonths(today, 6));
      } else if (dateRangePreset === 'YTD') {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        prevStart = new Date(today.getFullYear() - 1, 0, 1);
        prevEnd = new Date(today.getFullYear() - 1, 11, 31);
      } else if (dateRangePreset === '1Y') {
        start = startOfMonth(subMonths(today, 11));
        end = endOfMonth(today);
        prevStart = startOfMonth(subMonths(today, 23));
        prevEnd = endOfMonth(subMonths(today, 12));
      } else if (dateRangePreset === 'ALL') {
        start = new Date('2000-01-01');
        end = new Date('2099-12-31');
        prevStart = start;
        prevEnd = end;
      }
    }
    return { activeRange: { start, end }, previousRange: { start: prevStart, end: prevEnd } };
  }, [dateRangePreset, customStart, customEnd]);

  // Apply account & category filters
  const filteredTxns = useMemo(() => {
    let txns = personalTransactions;
    if (selectedAccounts.length > 0) txns = txns.filter(t => selectedAccounts.includes(t.accountId));
    if (selectedCategories.length > 0) txns = txns.filter(t => selectedCategories.includes(t.categoryId));
    return txns;
  }, [personalTransactions, selectedAccounts, selectedCategories]);

  // Apply Date Range
  const periodTxns = useMemo(() => {
    return filteredTxns.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });
  }, [filteredTxns, activeRange]);

  const prevPeriodTxns = useMemo(() => {
    return filteredTxns.filter(t => {
      const d = new Date(t.date);
      return d >= previousRange.start && d <= previousRange.end;
    });
  }, [filteredTxns, previousRange]);

  // ── Aggregations ──────────────────────────────────────────────────────────
  const currentExpenses = periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevPeriodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const currentIncome = periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevPeriodTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const diffDays = differenceInDays(activeRange.end, activeRange.start) + 1;
  const avgDailySpend = diffDays > 0 ? currentExpenses / diffDays : 0;
  
  // Projection only makes sense if end date is in the future and start date is in the past
  const currentDayInPeriod = (today >= activeRange.start && today <= activeRange.end) ? differenceInDays(today, activeRange.start) + 1 : diffDays;
  const projectedSpend = currentDayInPeriod > 0 && currentDayInPeriod < diffDays 
    ? (currentExpenses / currentDayInPeriod) * diffDays 
    : currentExpenses;

  const projectedBalance = currentIncome - projectedSpend;
  const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;

  const expenseTrend = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
  const incomeTrend = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;

  // ── Chart Data Aggregation (Trends) ─────────────────────────────────────────
  const chartData = useMemo(() => {
    const isMonthly = diffDays > 90;
    const isWeekly = diffDays > 31 && diffDays <= 90;
    
    const dataMap: Record<string, { label: string, Income: number, Expense: number, fullDate: string }> = {};

    periodTxns.forEach(t => {
      const tDate = new Date(t.date);
      let key = '';
      let label = '';
      
      if (isMonthly) {
        key = format(tDate, 'yyyy-MM');
        label = format(tDate, 'MMM yy');
      } else if (isWeekly) {
        const sw = startOfWeek(tDate, { weekStartsOn: 1 });
        key = format(sw, 'yyyy-MM-dd');
        label = format(sw, 'MMM d');
      } else {
        key = t.date.slice(0, 10);
        label = format(tDate, 'MMM d');
      }

      if (!dataMap[key]) dataMap[key] = { label, Income: 0, Expense: 0, fullDate: key };
      if (t.type === 'income') dataMap[key].Income += t.amount;
      if (t.type === 'expense') dataMap[key].Expense += t.amount;
    });

    const result = [];
    let curr = new Date(activeRange.start);
    while (curr <= activeRange.end) {
      let key = '';
      let label = '';
      if (isMonthly) {
        key = format(curr, 'yyyy-MM');
        label = format(curr, 'MMM yy');
        curr = addMonths(curr, 1);
      } else if (isWeekly) {
        const sw = startOfWeek(curr, { weekStartsOn: 1 });
        key = format(sw, 'yyyy-MM-dd');
        label = format(sw, 'MMM d');
        curr.setDate(curr.getDate() + 7);
      } else {
        key = format(curr, 'yyyy-MM-dd');
        label = format(curr, 'MMM d');
        curr.setDate(curr.getDate() + 1);
      }
      
      result.push({
        label,
        Income: dataMap[key]?.Income || 0,
        Expense: dataMap[key]?.Expense || 0,
        Savings: (dataMap[key]?.Income || 0) - (dataMap[key]?.Expense || 0),
        fullDate: key
      });
    }
    return result;
  }, [periodTxns, activeRange, diffDays]);

  // ── Category Breakdown ────────────────────────────────────────────────────
  const categoryExpenses = useMemo(() => {
    const catMap: Record<string, number> = {};
    periodTxns
      .filter(t => t.type === 'expense')
      .forEach(t => { 
        const cat = personalCategories.find(c => c.id === t.categoryId);
        const targetId = cat?.parentId || t.categoryId;
        catMap[targetId] = (catMap[targetId] || 0) + t.amount; 
      });
    return Object.entries(catMap)
      .map(([id, amount]) => ({ cat: personalCategories.find(c => c.id === id), amount }))
      .filter(x => x.cat)
      .sort((a, b) => b.amount - a.amount);
  }, [periodTxns, personalCategories]);



  const tooltipStyle = {
    contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
    labelStyle: { color: 'var(--text-main)', fontWeight: 600 },
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'trends', label: 'Trends', icon: TrendingUp },
    { key: 'categories', label: 'Categories', icon: Target },
    { key: 'money-flow', label: 'Money Flow', icon: ArrowUpRight },
  ];

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">Deep insights into your financial health</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        position: 'relative', zIndex: 100,
        display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20,
        padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, paddingBottom: 6 }}>
          <Filter size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Global Filters</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Date Range</label>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 4, borderRadius: 8 }}>
            {(['7D', '1M', '3M', '6M', 'YTD', '1Y', 'ALL', 'CUSTOM'] as GlobalDatePreset[]).map(p => (
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



        {dateRangePreset === 'CUSTOM' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start</label>
              <input type="date" className="input" style={{ padding: '6px 10px', height: 32, fontSize: 12 }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End</label>
              <input type="date" className="input" style={{ padding: '6px 10px', height: 32, fontSize: 12 }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        <MultiSelect
          label="Accounts"
          placeholder="All Accounts"
          options={personalAccounts.map(a => ({ id: a.id, label: a.name, color: a.color }))}
          selectedIds={selectedAccounts}
          onChange={setSelectedAccounts}
        />

        <MultiSelect
          label="Categories"
          placeholder="All Categories"
          options={personalCategories.map(c => ({ id: c.id, label: <>{c.icon} {c.name}</>, color: c.color }))}
          selectedIds={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 28, width: 'fit-content' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              background: activeTab === key ? 'var(--accent)' : 'transparent',
              color: activeTab === key ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <KpiCard label="Period Income" value={formatCurrency(currentIncome, state.currency)} color="#22c55e" icon={TrendingUp}
              trend={{ pct: incomeTrend, up: incomeTrend >= 0 }} sub={`vs prev period`} />
            <KpiCard label="Period Expenses" value={formatCurrency(currentExpenses, state.currency)} color="#ef4444" icon={TrendingDown}
              trend={{ pct: expenseTrend, up: expenseTrend < 0 }} sub={`vs prev period`} />
            <KpiCard label="Projected Spend" value={formatCurrency(projectedSpend, state.currency)} color="#f59e0b" icon={Calendar}
              sub={`${formatCurrency(avgDailySpend, state.currency)}/day avg`} />
            <KpiCard label="Projected Net Balance" value={formatCurrency(Math.abs(projectedBalance), state.currency)}
              color={projectedBalance >= 0 ? '#22c55e' : '#ef4444'} icon={DollarSign}
              sub={projectedBalance >= 0 ? 'Projected surplus' : 'Projected deficit'} />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Cash Flow Distribution</div>
            <CashFlowVisualizer income={currentIncome} expenses={currentExpenses} taxRate={state.taxRate} />
          </div>

          {/* Savings Gauge + Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <SavingsGauge rate={savingsRate} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                {savingsRate >= 50 ? '🏆 Excellent savings habit!' : savingsRate >= 20 ? '👍 On the right track' : '⚠️ Try to save more'}
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Calendar size={16} color="var(--expense)" /> Spending Heatmap
                {diffDays > 90 && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 'auto' }}>Showing last 35 days of period</span>}
              </h3>
              <SpendingHeatmap transactions={periodTxns} activeRange={activeRange} />
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Income vs Expenses</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} tickFormatter={v => formatCurrency(v, state.currency)} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v), state.currency), '']} />
                  <Legend />
                  <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Net Savings Trend</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} tickFormatter={v => formatCurrency(v, state.currency)} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v), state.currency), 'Net Savings']} />
                  <Area type="monotone" dataKey="Savings" stroke="#6366f1" strokeWidth={2.5} fill="url(#savGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Expense Breakdown</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Total: {formatCurrency(currentExpenses, state.currency)}</div>

            {categoryExpenses.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No expense data yet</div>
                <div className="empty-state-text">Add some expenses to see your breakdown</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {categoryExpenses.map(({ cat, amount }) => {
                  const pct = currentExpenses > 0 ? (amount / currentExpenses) * 100 : 0;
                  return (
                    <div key={cat!.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat!.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            {cat!.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{cat!.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct.toFixed(1)}% of total</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: cat!.color }}>{formatCurrency(amount, state.currency)}</div>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-input)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: cat!.color, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pie Chart */}
          {categoryExpenses.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Distribution Chart</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryExpenses.map(x => ({ name: x.cat!.name, value: x.amount, color: x.cat!.color }))}
                      cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={4} dataKey="value">
                      {categoryExpenses.map(({ cat }) => (
                        <Cell key={cat!.id} fill={cat!.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v), state.currency), '']} />
                    <Legend formatter={(value) => <span style={{ color: 'var(--text-main)', fontSize: 13 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MONEY FLOW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'money-flow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: 600 }}>
          <CashFlowSankey transactions={personalTransactions} activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />
        </div>
      )}


    </PageWrapper>
  );
}
