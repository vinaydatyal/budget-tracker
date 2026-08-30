'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useMemo } from 'react';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense' | 'transfer';
  setTypeFilter: (v: 'all' | 'income' | 'expense' | 'transfer') => void;
  hubFilter?: 'all' | 'personal' | 'business';
  setHubFilter?: (v: 'all' | 'personal' | 'business') => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  accountFilter: string;
  setAccountFilter: (v: string) => void;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  amountMin: string;
  setAmountMin: (v: string) => void;
  amountMax: string;
  setAmountMax: (v: string) => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
}

export function FilterBar({
  search, setSearch,
  typeFilter, setTypeFilter,
  hubFilter, setHubFilter,
  categoryFilter, setCategoryFilter,
  accountFilter, setAccountFilter,
  monthFilter, setMonthFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  amountMin, setAmountMin,
  amountMax, setAmountMax,
  tagFilter, setTagFilter,
}: Props) {
  const { state } = useApp();

  // Collect all unique tags from transactions
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    state.transactions.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [state.transactions]);

  const hasFilters = search || typeFilter !== 'all' || categoryFilter || accountFilter || monthFilter || dateFrom || dateTo || amountMin || amountMax || tagFilter;

  function clearAll() {
    setSearch(''); setTypeFilter('all'); setCategoryFilter('');
    setAccountFilter(''); setMonthFilter(''); setDateFrom('');
    setDateTo(''); setAmountMin(''); setAmountMax(''); setTagFilter('');
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
      {/* Row 1: Search + Type */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '2 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            id="txn-search"
            data-search
            className="form-input"
            type="text"
            placeholder="Search by description, payee, tag... (Press / to focus)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {(['all', 'income', 'expense', 'transfer'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', transition: 'all 0.15s',
                background: typeFilter === t ? 'var(--accent)' : 'transparent',
                color: typeFilter === t ? '#fff' : 'var(--text-muted)',
                textTransform: 'capitalize',
              }}
            >{t}</button>
          ))}
        </div>

        {setHubFilter && state.preferences.enableBusinessMode && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
            {(['all', 'personal', 'business'] as const).map(h => (
              <button
                key={h}
                onClick={() => setHubFilter(h)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.15s',
                  background: hubFilter === h ? 'var(--accent)' : 'transparent',
                  color: hubFilter === h ? '#fff' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >{h}</button>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: Category, Account, Month, Tag */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <select className="form-select" style={{ flex: '1 1 140px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {state.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        <select className="form-select" style={{ flex: '1 1 140px' }} value={accountFilter} onChange={e => setAccountFilter(e.target.value)}>
          <option value="">All Accounts</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <input className="form-input" type="month" style={{ flex: '1 1 130px' }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)} title="Filter by month" />

        {allTags.length > 0 && (
          <select className="form-select" style={{ flex: '1 1 130px' }} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
            <option value="">All Tags</option>
            {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
          </select>
        )}
      </div>

      {/* Row 3: Date range + Amount range */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Date:</span>
          <input className="form-input" type="date" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
          <input className="form-input" type="date" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Amount:</span>
          <input className="form-input" type="number" min="0" step="0.01" style={{ width: 100 }} value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="Min" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>–</span>
          <input className="form-input" type="number" min="0" step="0.01" style={{ width: 100 }} value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="Max" />
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
              background: 'var(--expense-subtle)', color: 'var(--expense)', border: '1px solid var(--expense)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <X size={13} /> Clear All
          </button>
        )}
      </div>
    </div>
  );
}
