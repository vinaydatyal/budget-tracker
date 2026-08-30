'use client';

import { format } from 'date-fns';
import { Pencil, Trash2, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  selectedIds: string[];
  onToggleSelect: (id: string, shift: boolean) => void;
  onSelectAll: (dayTxns: Transaction[]) => void;
  onTagClick?: (tag: string) => void;
}

function renderWithTags(text: string, onClick?: (tag: string) => void) {
  if (!text) return text;
  const parts = text.split(/(#[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span 
          key={i} 
          className="hashtag" 
          onClick={(e) => { e.stopPropagation(); onClick?.(part); }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function TransactionList({ transactions, onEdit, selectedIds, onToggleSelect, onSelectAll, onTagClick }: Props) {
  const { state, deleteTransaction } = useApp();

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">No transactions found</div>
        <div className="empty-state-text">Try adjusting your filters or add a new transaction.</div>
      </div>
    );
  }

  // Group by date
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const key = format(new Date(t.date), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sortedDates.map(dateKey => {
        const dayTxns = groups[dateKey];
        const dayTotal = dayTxns.reduce((sum, t) =>
          t.type === 'income' ? sum + t.amount : sum - t.amount, 0
        );
        return (
          <div key={dateKey}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              padding: '0 4px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: dayTotal >= 0 ? 'var(--income)' : 'var(--expense)',
              }}>
                {dayTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayTotal), state.currency)}
              </span>
            </div>
            
            <div style={{ marginBottom: 8, padding: '0 4px' }}>
              <label style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={dayTxns.every(t => selectedIds.includes(t.id))}
                  onChange={() => onSelectAll(dayTxns)}
                />
                Select All
              </label>
            </div>

            <div className="transaction-list">
              {dayTxns.map(t => {
                const cat = state.categories.find(c => c.id === t.categoryId);
                const acc = state.accounts.find(a => a.id === t.accountId);
                return (
                  <div key={t.id} className={`transaction-item animate-in ${selectedIds.includes(t.id) ? 'selected' : ''}`} style={{ backgroundColor: selectedIds.includes(t.id) ? 'var(--accent-subtle)' : undefined }}>
                    <div style={{ marginRight: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={(e) => onToggleSelect(t.id, (e.nativeEvent as any).shiftKey)}
                      />
                    </div>
                    <div
                      className="transaction-icon"
                      style={{ background: cat ? `${cat.color}22` : 'var(--bg-input)' }}
                    >
                      {cat?.icon ?? (t.categoryId === 'transfer' ? '🔁' : '📦')}
                    </div>

                    <div className="transaction-info">
                      <div className="transaction-desc">{renderWithTags(t.description, onTagClick)}</div>
                      <div className="transaction-meta">
                        <span className={`badge badge-${t.type}`} style={{ marginRight: 6 }}>
                          {t.type}
                        </span>
                        {acc && (
                          <span className="badge badge-neutral" style={{ marginRight: 6 }}>
                            {acc.name}
                          </span>
                        )}
                        {cat?.name ?? (t.categoryId === 'transfer' ? 'Transfer' : 'Multiple / Unknown')}
                        {t.splitCategoryIds && t.splitCategoryIds.length > 0 && ` (Split)`}
                        <span style={{ margin: '0 8px' }}>•</span>
                        {t.isBusiness ? (
                          <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>Business</span>
                        ) : (
                          <span style={{ fontSize: 10, background: 'var(--surface-highlight)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 10, border: '1px solid var(--border)' }}>Personal</span>
                        )}
                        {t.revenueSourceId && state.revenueSources.find(s => s.id === t.revenueSourceId) && (
                          <span style={{ fontSize: 10, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: 10, marginLeft: 6 }}>
                            {state.revenueSources.find(s => s.id === t.revenueSourceId)?.name}
                          </span>
                        )}
                        {t.splitWith && t.splitWith.length > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'var(--income-subtle)', color: 'var(--income)', padding: '2px 6px', borderRadius: 10, border: '1px solid var(--income)' }}>
                            <Users size={10} /> Shared
                          </span>
                        )}
                        {t.tags && t.tags.length > 0 && ` • ${t.tags.join(', ')}`}

                        {t.receiptUrl && ` • 📎 Receipt`}
                        {t.notes && <><span style={{ margin: '0 4px' }}>•</span>{renderWithTags(t.notes, onTagClick)}</>}
                      </div>
                    </div>

                    <div className={`transaction-amount ${t.type}`}>
                      {t.type === 'income'
                        ? <TrendingUp size={13} style={{ display: 'inline', marginRight: 3 }} />
                        : <TrendingDown size={13} style={{ display: 'inline', marginRight: 3 }} />
                      }
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, state.currency)}
                    </div>

                    <div className="transaction-actions">
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => onEdit(t)}
                        aria-label="Edit"
                        id={`edit-txn-${t.id}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm('Delete this transaction?')) deleteTransaction(t.id);
                        }}
                        aria-label="Delete"
                        id={`delete-txn-${t.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
