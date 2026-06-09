'use client';

import { useState, useMemo } from 'react';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { SpendingDonut } from '@/components/dashboard/SpendingDonut';
import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { BudgetProgressBars } from '@/components/dashboard/BudgetProgressBars';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { CashFlowSankey } from '@/components/dashboard/CashFlowSankey';
import { AccountsWidget } from '@/components/dashboard/AccountsWidget';
import { TransactionsWidget } from '@/components/dashboard/TransactionsWidget';
import { Settings2, X, Plus, Filter } from 'lucide-react';
// @ts-ignore
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

type GlobalDatePreset = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'insights', x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'summary', x: 0, y: 3, w: 7, h: 4, minW: 6, minH: 2 },
    { i: 'net-worth', x: 7, y: 3, w: 5, h: 4, minW: 4, minH: 3 },
    { i: 'cash-flow', x: 0, y: 7, w: 7, h: 5, minW: 5, minH: 4 },
    { i: 'income-expense', x: 7, y: 7, w: 5, h: 5, minW: 4, minH: 4 },
    { i: 'transactions', x: 0, y: 12, w: 7, h: 6, minW: 4, minH: 4 },
    { i: 'spending', x: 7, y: 12, w: 5, h: 6, minW: 3, minH: 4 },
    { i: 'accounts', x: 0, y: 18, w: 7, h: 5, minW: 4, minH: 4 },
    { i: 'forecast', x: 7, y: 18, w: 5, h: 5, minW: 4, minH: 4 },
    { i: 'budgets', x: 0, y: 23, w: 7, h: 5, minW: 4, minH: 4 },
    { i: 'bills', x: 7, y: 23, w: 5, h: 5, minW: 3, minH: 4 },
  ],
};

const WIDGET_NAMES: Record<string, string> = {
  'net-worth': 'Net Worth Hero',
  'insights': 'Smart Insights',
  'summary': 'Summary Cards',
  'cash-flow': 'Cash Flow Sankey',
  'spending': 'Spending Breakdowns',
  'forecast': 'Balance Forecast',
  'accounts': 'Accounts Overview',
  'income-expense': 'Income vs Expense',
  'budgets': 'Budget Progress',
  'transactions': 'Recent Transactions',
  'bills': 'Upcoming Bills',
};

export default function DashboardPage() {
  const { state, dispatch } = useApp();
  
  // Global Filters State
  const [dateRangePreset, setDateRangePreset] = useState<GlobalDatePreset>('1M');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const today = new Date();

  // Calculate active date range
  const activeRange = useMemo(() => {
    let start = new Date();
    let end = new Date();

    if (dateRangePreset === 'CUSTOM' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    } else {
      if (dateRangePreset === '1M') {
        start = startOfMonth(today);
        end = endOfMonth(today);
      } else if (dateRangePreset === '3M') {
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
      } else if (dateRangePreset === '6M') {
        start = startOfMonth(subMonths(today, 5));
        end = endOfMonth(today);
      } else if (dateRangePreset === 'YTD') {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
      } else if (dateRangePreset === '1Y') {
        start = startOfMonth(subMonths(today, 11));
        end = endOfMonth(today);
      } else if (dateRangePreset === 'ALL') {
        start = new Date('2000-01-01');
        end = new Date('2099-12-31');
      }
    }
    return { start, end };
  }, [dateRangePreset, customStart, customEnd]);

  const recentTxns = useMemo(() => {
    let txns = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= activeRange.start && d <= activeRange.end;
    });

    if (selectedAccounts.length > 0) txns = txns.filter(t => selectedAccounts.includes(t.accountId));
    if (selectedCategories.length > 0) txns = txns.filter(t => selectedCategories.includes(t.categoryId));

    return txns
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [state.transactions, activeRange, selectedAccounts, selectedCategories]);

  const widgets: Record<string, React.ReactNode> = {
    'net-worth': <NetWorthCard activeRange={activeRange} accountIds={selectedAccounts} />,
    'insights': <InsightsPanel />,
    'summary': <SummaryCards activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />,
    'cash-flow': <CashFlowSankey activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />,
    'spending': <SpendingDonut activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />,
    'forecast': <ForecastChart />,
    'accounts': <AccountsWidget selectedAccounts={selectedAccounts} />,
    'income-expense': <IncomeExpenseChart activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />,
    'budgets': <BudgetProgressBars activeRange={activeRange} accountIds={selectedAccounts} categoryIds={selectedCategories} />,
    'transactions': <TransactionsWidget recentTxns={recentTxns} />,
    'bills': <UpcomingBills />
  };

  const hiddenWidgets = state.dashboardHiddenWidgets || [];
  const layouts = state.dashboardLayouts || DEFAULT_LAYOUTS;

  const onLayoutChange = (layout: Layout[], allLayouts: Record<string, Layout[]>) => {
    dispatch({ type: 'UPDATE_DASHBOARD_LAYOUT', payload: { layouts: allLayouts } });
  };

  const toggleWidget = (id: string) => {
    dispatch({ type: 'TOGGLE_WIDGET', payload: id });
  };

  return (
    <PageWrapper className="page-body">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's your financial overview</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings2 size={16} style={{ marginRight: 8 }} />
            {isEditMode ? 'Done Editing' : 'Customize Layout'}
          </button>
          {isEditMode && (
            <button className="btn btn-secondary" onClick={() => dispatch({ type: 'UPDATE_DASHBOARD_LAYOUT', payload: { layouts: DEFAULT_LAYOUTS } })}>
              Reset to Default Layout
            </button>
          )}
        </div>
      </div>

      {/* Global Filter Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24,
        padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, paddingBottom: 6 }}>
          <Filter size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Global Filters</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Date Range</label>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 4, borderRadius: 8 }}>
            {(['1M', '3M', '6M', 'YTD', '1Y', 'ALL', 'CUSTOM'] as GlobalDatePreset[]).map(p => (
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
          options={state.accounts.map(a => ({ id: a.id, label: a.name, color: a.color }))}
          selectedIds={selectedAccounts}
          onChange={setSelectedAccounts}
        />

        <MultiSelect
          label="Categories"
          placeholder="All Categories"
          options={state.categories.map(c => ({ id: c.id, label: <>{c.icon} {c.name}</>, color: c.color }))}
          selectedIds={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      {/* Hidden Widgets Drawer (Only in Edit Mode) */}
      {isEditMode && hiddenWidgets.length > 0 && (
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 16, border: '1px dashed var(--border)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hidden Widgets</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {hiddenWidgets.map(id => (
              <button 
                key={id} 
                className="btn btn-secondary btn-sm"
                onClick={() => toggleWidget(id)}
              >
                <Plus size={14} style={{ marginRight: 6 }} />
                {WIDGET_NAMES[id] || id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ margin: '0 -12px' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          onLayoutChange={onLayoutChange as any}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          margin={[24, 24]}
          containerPadding={[12, 0]}
          useCSSTransforms={true}
        >
          {Object.keys(widgets).filter(id => !hiddenWidgets.includes(id)).map(id => (
            <div key={id} style={{ position: 'relative' }}>
              {isEditMode && (
                <div style={{
                  position: 'absolute', top: -12, right: -12, zIndex: 10,
                  background: 'var(--bg-card)', borderRadius: '50%', padding: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
                  cursor: 'pointer'
                }} onClick={(e) => { e.stopPropagation(); toggleWidget(id); }}>
                  <X size={16} color="var(--text-muted)" />
                </div>
              )}
              {isEditMode && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 5,
                  background: 'rgba(99, 102, 241, 0.05)', border: '2px dashed var(--accent)', borderRadius: 16,
                  cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ background: 'var(--accent)', color: 'white', padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 13, pointerEvents: 'none' }}>
                    Drag to move • Drag corner to resize
                  </div>
                </div>
              )}
              <div style={{ height: '100%', pointerEvents: isEditMode ? 'none' : 'auto' }}>
                {widgets[id]}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </PageWrapper>
  );
}
