'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
  onSave?: () => void;
}

interface RowData {
  id: string; // temporary row id
  type: 'income' | 'expense';
  date: string;
  description: string;
  amount: string;
  categoryId: string;
  accountId: string;
}

export function BulkTransactionForm({ onClose, onSave }: Props) {
  const { state, addTransactionsBulk } = useApp();

  const createEmptyRow = (): RowData => ({
    id: `row-${Date.now()}-${Math.random()}`,
    type: 'expense',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    categoryId: state.categories.find(c => c.type === 'expense' || c.type === 'both')?.id ?? '',
    accountId: state.accounts[0]?.id ?? '',
  });

  const [rows, setRows] = useState<RowData[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  const [error, setError] = useState('');

  const updateRow = (id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Filter out completely empty rows
    const activeRows = rows.filter(r => r.description.trim() || r.amount);

    if (activeRows.length === 0) {
      return setError('Please enter at least one transaction.');
    }

    const newTxns: Omit<Transaction, 'id'>[] = [];

    for (let i = 0; i < activeRows.length; i++) {
      const r = activeRows[i];
      const amt = parseFloat(r.amount);
      
      if (!r.description.trim()) return setError(`Row ${i + 1}: Description is required.`);
      if (isNaN(amt) || amt <= 0) return setError(`Row ${i + 1}: Enter a valid positive amount.`);
      if (!r.categoryId) return setError(`Row ${i + 1}: Select a category.`);
      if (!r.accountId) return setError(`Row ${i + 1}: Select an account.`);
      if (!r.date) return setError(`Row ${i + 1}: Select a date.`);

      newTxns.push({
        type: r.type,
        amount: amt,
        description: r.description.trim(),
        categoryId: r.categoryId,
        accountId: r.accountId,
        date: new Date(r.date).toISOString(),
        notes: '',
      });
    }

    addTransactionsBulk(newTxns);
    toast.success(`Added ${newTxns.length} transactions`);
    onSave?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        className="modal" style={{ maxWidth: 900 }}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Bulk Add Transactions</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close" id="close-bulk-form">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 4px' }}>Date</th>
                  <th style={{ padding: '8px 4px' }}>Type</th>
                  <th style={{ padding: '8px 4px' }}>Description</th>
                  <th style={{ padding: '8px 4px' }}>Amount</th>
                  <th style={{ padding: '8px 4px' }}>Category</th>
                  <th style={{ padding: '8px 4px' }}>Account</th>
                  <th style={{ padding: '8px 4px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-strong)' }}>
                    <td style={{ padding: '8px 4px' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '6px 10px' }}
                        value={row.date}
                        onChange={e => updateRow(row.id, 'date', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <select
                        className="form-select"
                        style={{ padding: '6px 10px' }}
                        value={row.type}
                        onChange={e => {
                          updateRow(row.id, 'type', e.target.value);
                          // Reset category if it doesn't match new type
                          updateRow(row.id, 'categoryId', '');
                        }}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px' }}
                        placeholder="Description"
                        value={row.description}
                        onChange={e => updateRow(row.id, 'description', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        style={{ padding: '6px 10px', width: 90 }}
                        placeholder="0.00"
                        value={row.amount}
                        onChange={e => updateRow(row.id, 'amount', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <select
                        className="form-select"
                        style={{ padding: '6px 10px' }}
                        value={row.categoryId}
                        onChange={e => updateRow(row.id, 'categoryId', e.target.value)}
                      >
                        <option value="">Category...</option>
                        {state.categories
                          .filter(c => c.type === row.type || c.type === 'both')
                          .sort((a, b) => {
                            const aParent = a.parentId ? state.categories.find(c => c.id === a.parentId)?.name : a.name;
                            const bParent = b.parentId ? state.categories.find(c => c.id === b.parentId)?.name : b.name;
                            if (aParent === bParent) {
                              if (!a.parentId && b.parentId) return -1;
                              if (a.parentId && !b.parentId) return 1;
                              return a.name.localeCompare(b.name);
                            }
                            return (aParent || '').localeCompare(bParent || '');
                          })
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.parentId ? '\u00A0\u00A0↳ ' : ''}{c.icon} {c.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <select
                        className="form-select"
                        style={{ padding: '6px 10px' }}
                        value={row.accountId}
                        onChange={e => updateRow(row.id, 'accountId', e.target.value)}
                      >
                        {state.accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        style={{ padding: 4 }}
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> Add Row
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              {error && <div style={{ color: 'var(--expense)', fontSize: 13, alignSelf: 'center' }}>{error}</div>}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary"><Check size={15} /> Save All</button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
