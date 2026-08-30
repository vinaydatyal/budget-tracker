'use client';

import { useState, useMemo, useRef } from 'react';
import { Plus, Download, Upload, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Transaction } from '@/lib/types';
import { FilterBar } from '@/components/transactions/FilterBar';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { BulkTransactionForm } from '@/components/transactions/BulkTransactionForm';
import { BulkEditModal } from '@/components/transactions/BulkEditModal';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { exportToCSV } from '@/lib/exportCSV';
import { exportToPDF } from '@/lib/exportPDF';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { state, dispatch, personalTransactions } = useApp();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedRef = useRef<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [hubFilter, setHubFilter] = useState<'all' | 'personal' | 'business'>('personal');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  function wrapSet<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); setSelectedIds([]); };
  }

  const filtered = useMemo(() => {
    return state.transactions.filter(t => {
      if (hubFilter === 'personal' && t.isBusiness) return false;
      if (hubFilter === 'business' && !t.isBusiness) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (accountFilter && t.accountId !== accountFilter) return false;
      if (monthFilter && t.date.slice(0, 7) !== monthFilter) return false;
      if (dateFrom && t.date.slice(0, 10) < dateFrom) return false;
      if (dateTo && t.date.slice(0, 10) > dateTo) return false;
      if (amountMin && t.amount < parseFloat(amountMin)) return false;
      if (amountMax && t.amount > parseFloat(amountMax)) return false;
      if (tagFilter && !(t.tags?.includes(tagFilter))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.description.toLowerCase().includes(q) &&
          !(t.payee?.toLowerCase().includes(q)) &&
          !(t.notes?.toLowerCase().includes(q)) &&
          !t.amount.toString().includes(q) &&
          !(t.tags?.some(tag => tag.toLowerCase().includes(q)))
        ) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, hubFilter, search, typeFilter, categoryFilter, accountFilter, monthFilter, dateFrom, dateTo, amountMin, amountMax, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);



  function handleToggleSelect(id: string, shiftKey: boolean) {
    if (shiftKey && lastSelectedRef.current) {
      const allIds = paginated.map(t => t.id);
      const startIdx = allIds.indexOf(lastSelectedRef.current);
      const endIdx = allIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        const idsToSelect = allIds.slice(min, max + 1);
        setSelectedIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
        lastSelectedRef.current = id;
        return;
      }
    }
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    lastSelectedRef.current = id;
  }

  function handleSelectAll(dayTxns: Transaction[]) {
    const ids = dayTxns.map(t => t.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} transactions?`)) return;
    // Dispatch in reverse or handle bulk delete action. For now loop.
    selectedIds.forEach(id => dispatch({ type: 'DELETE_TRANSACTION', payload: id }));
    setSelectedIds([]);
    toast(`Deleted ${selectedIds.length} transactions`, 'info');
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{state.transactions.length} total · showing {filtered.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/import" className="btn btn-secondary btn-sm">
            <Upload size={15} /> Import CSV
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => { exportToCSV(filtered, state.categories, state.accounts); toast('CSV downloaded', 'info'); }}>
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { exportToPDF(filtered, state.categories, state.accounts, totalIncome, totalExpenses); toast('PDF downloaded', 'info'); }}>
            <FileText size={15} /> PDF
          </button>
          <button className="btn btn-secondary" onClick={() => setShowBulkForm(true)}><Plus size={16} /> Bulk Add</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Transaction</button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 18px', background: 'var(--income-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Income </span>
          <strong style={{ color: 'var(--income)' }}>{formatCurrency(totalIncome, state.currency)}</strong>
        </div>
        <div style={{ padding: '10px 18px', background: 'var(--expense-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Expenses </span>
          <strong style={{ color: 'var(--expense)' }}>{formatCurrency(totalExpenses, state.currency)}</strong>
        </div>
        <div style={{ padding: '10px 18px', background: (totalIncome - totalExpenses) >= 0 ? 'var(--income-subtle)' : 'var(--expense-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Net </span>
          <strong style={{ color: (totalIncome - totalExpenses) >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {(totalIncome - totalExpenses) >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpenses, state.currency)}
          </strong>
        </div>
        {filtered.length !== state.transactions.length && (
          <div style={{ padding: '10px 18px', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            🔍 {filtered.length} matches
          </div>
        )}
      </div>

      <FilterBar
        search={search} setSearch={wrapSet(setSearch)}
        typeFilter={typeFilter} setTypeFilter={wrapSet(setTypeFilter)}
        hubFilter={hubFilter} setHubFilter={wrapSet(setHubFilter)}
        categoryFilter={categoryFilter} setCategoryFilter={wrapSet(setCategoryFilter)}
        accountFilter={accountFilter} setAccountFilter={wrapSet(setAccountFilter)}
        monthFilter={monthFilter} setMonthFilter={wrapSet(setMonthFilter)}
        dateFrom={dateFrom} setDateFrom={wrapSet(setDateFrom)}
        dateTo={dateTo} setDateTo={wrapSet(setDateTo)}
        amountMin={amountMin} setAmountMin={wrapSet(setAmountMin)}
        amountMax={amountMax} setAmountMax={wrapSet(setAmountMax)}
        tagFilter={tagFilter} setTagFilter={wrapSet(setTagFilter)}
      />

      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'var(--accent)', color: '#fff',
          borderRadius: 'var(--radius-md)', marginBottom: 20, boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
        }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.length} selected</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={() => setSelectedIds([])}>
              Clear
            </button>
            <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--accent)', border: 'none' }} onClick={() => setShowBulkForm(true)}>
              Bulk Edit
            </button>
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }} onClick={handleBulkDelete}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <TransactionList
        transactions={paginated}
        onEdit={t => { setEditing(t); setShowForm(true); }}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onTagClick={setSearch}
      />

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={15} /> Prev
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: page === p ? 'var(--accent)' : 'var(--bg-input)',
                  color: page === p ? '#fff' : 'var(--text-muted)',
                }}>{p}</button>
              );
            })}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next <ChevronRight size={15} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
        </div>
      )}

      {showForm && (
        <TransactionForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={() => toast(editing ? 'Transaction updated' : 'Transaction added', 'success')} />
      )}
      {showBulkForm && selectedIds.length > 0 && (
        <BulkEditModal
          selectedIds={selectedIds}
          onClose={() => setShowBulkForm(false)}
          onSuccess={() => { setShowBulkForm(false); setSelectedIds([]); toast(`Updated ${selectedIds.length} transactions`, 'success'); }}
        />
      )}
    </PageWrapper>
  );
}
