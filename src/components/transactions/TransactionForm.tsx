'use client';

import { useState, useRef, useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { X, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
  editing?: Transaction | null;
  defaultDate?: string;
  onSave?: () => void;
}

export function TransactionForm({ onClose, editing, defaultDate, onSave }: Props) {
  const { state, addTransaction, updateTransaction } = useApp();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(editing?.amount?.toString() ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [payee, setPayee] = useState(editing?.payee ?? '');
  const [tags, setTags] = useState(editing?.tags?.join(', ') ?? '');
  const [clientName, setClientName] = useState(editing?.freelanceData?.clientName ?? '');
  const [projectName, setProjectName] = useState(editing?.freelanceData?.projectName ?? '');
  const [monthName, setMonthName] = useState(editing?.freelanceData?.monthName ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? state.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? state.accounts[1]?.id ?? '');
  const [date, setDate] = useState(
    editing?.date ? format(new Date(editing.date), 'yyyy-MM-dd') : (defaultDate ? format(new Date(defaultDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [receiptUrl, setReceiptUrl] = useState(editing?.receiptUrl ?? '');
  const [receiptNotes, setReceiptNotes] = useState(editing?.receiptNotes ?? '');
  const [isSplit, setIsSplit] = useState(!!editing?.splitCategoryIds?.length);
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(
    editing?.splitCategoryIds && editing?.splitAmounts
      ? editing.splitCategoryIds.map((id, i) => ({ categoryId: id, amount: editing.splitAmounts![i].toString() }))
      : [{ categoryId: '', amount: '' }, { categoryId: '', amount: '' }]
  );
  const [splitWith, setSplitWith] = useState<{ name: string; amount: string; settled: boolean }[]>(
    editing?.splitWith ? editing.splitWith.map(s => ({ ...s, amount: s.amount.toString() })) : []
  );
  const [error, setError] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const isDirty = useMemo(() => {
    if (!editing) {
      return amount !== '' || description !== '' || notes !== '' || payee !== '' || tags !== '';
    }
    return amount !== (editing.amount?.toString() ?? '') ||
           description !== (editing.description ?? '') ||
           type !== (editing.type ?? 'expense') ||
           categoryId !== (editing.categoryId ?? '') ||
           notes !== (editing.notes ?? '');
  }, [amount, description, notes, payee, tags, type, categoryId, editing]);

  function handleCloseAttempt() {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }

  const filteredCats = state.categories.filter(
    c => c.type === type || c.type === 'both'
  ).sort((a, b) => {
    const aParent = a.parentId ? state.categories.find(c => c.id === a.parentId)?.name : a.name;
    const bParent = b.parentId ? state.categories.find(c => c.id === b.parentId)?.name : b.name;
    
    if (aParent === bParent) {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return a.name.localeCompare(b.name);
    }
    return (aParent || '').localeCompare(bParent || '');
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (!description.trim()) return setError('Description is required.');
    if (isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    
    if (type !== 'transfer' && !isSplit && !categoryId) return setError('Select a category.');
    if (type !== 'transfer' && isSplit) {
      if (splits.some(s => !s.categoryId || !s.amount)) return setError('All splits must have a category and amount.');
      const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(totalSplit - amt) > 0.01) return setError(`Splits total (${totalSplit.toFixed(2)}) must equal the transaction amount (${amt.toFixed(2)}).`);
    }
    if (!accountId) return setError('Select an account.');
    if (type === 'transfer' && accountId === toAccountId) return setError('Cannot transfer to the same account.');
    if (!date) return setError('Select a date.');

    const payload = {
      type,
      amount: amt,
      description: description.trim(),
      payee: payee.trim() || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      receiptUrl: receiptUrl.trim() || undefined,
      receiptNotes: receiptNotes.trim() || undefined,
      freelanceData: clientName || projectName || monthName ? {
        clientName: clientName.trim(),
        projectName: projectName.trim(),
        monthName: monthName.trim(),
      } : undefined,
      categoryId: type === 'transfer' ? 'transfer' : isSplit ? splits[0].categoryId : categoryId,
      splitCategoryIds: type === 'expense' && isSplit ? splits.map(s => s.categoryId) : undefined,
      splitAmounts: type === 'expense' && isSplit ? splits.map(s => parseFloat(s.amount)) : undefined,
      splitWith: splitWith.length > 0 ? splitWith.map(s => ({ name: s.name.trim(), amount: parseFloat(s.amount) || 0, settled: s.settled })) : undefined,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date: new Date(date).toISOString(),
      notes: notes.trim(),
    };

    if (editing) {
      updateTransaction({ ...payload, id: editing.id });
      toast.success('Transaction updated');
    } else {
      addTransaction(payload);
      toast.success('Transaction added');
    }
    onSave?.();
    onClose();
  }

  return (
    <>
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleCloseAttempt()}>
      <motion.div 
        className="modal"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="btn btn-icon" onClick={handleCloseAttempt} aria-label="Close" id="close-transaction-form">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="form-group" style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, backgroundColor: type === 'expense' ? 'var(--expense)' : '' }}
                onClick={() => { setType('expense'); setCategoryId(''); }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, backgroundColor: type === 'income' ? 'var(--income)' : '' }}
                onClick={() => { setType('income'); setCategoryId(''); }}
              >
                Income
              </button>
              <button
                type="button"
                className={`btn ${type === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('transfer')}
              >
                Transfer
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="txn-amount">Amount</label>
              <input
                id="txn-amount"
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="txn-date">Date</label>
              <input
                id="txn-date"
                className="form-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-desc">Description</label>
            <input
              id="txn-desc"
              className="form-input"
              type="text"
              placeholder="e.g. Monthly salary, Grocery shopping..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-payee">Payee (Optional)</label>
            <input
              id="txn-payee"
              className="form-input"
              type="text"
              placeholder="e.g. Amazon, Starbucks, Employer"
              value={payee}
              onChange={e => setPayee(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-tags">Tags (Comma separated)</label>
            <input
              id="txn-tags"
              className="form-input"
              type="text"
              placeholder="e.g. vacation, tax-deductible, business"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          {state.accounts.find(a => a.id === accountId)?.name.toLowerCase().includes('freelance') && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Freelance Details</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-client">Client Name</label>
                  <input
                    id="txn-client"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-project">Project</label>
                  <input
                    id="txn-project"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Website Redesign"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label" htmlFor="txn-month">Service Month</label>
                <input
                  id="txn-month"
                  className="form-input"
                  type="text"
                  placeholder="e.g. June 2026"
                  value={monthName}
                  onChange={e => setMonthName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Shared Expenses / IOU Section */}
          {type === 'expense' && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Shared Expense (IOU)</h4>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSplitWith(prev => [...prev, { name: '', amount: '', settled: false }])}
                >
                  <Plus size={14} /> Split with someone
                </button>
              </div>
              
              {splitWith.map((sw, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Friend's Name"
                    value={sw.name}
                    onChange={e => setSplitWith(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Owes you"
                    style={{ width: 120 }}
                    value={sw.amount}
                    onChange={e => setSplitWith(prev => prev.map((item, i) => i === idx ? { ...item, amount: e.target.value } : item))}
                  />
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    onClick={() => setSplitWith(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {splitWith.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  This will track how much they owe you on the Shared Expenses page.
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            {type !== 'transfer' && !isSplit && (
              <div className="form-group">
                <label className="form-label" htmlFor="txn-cat">Category</label>
                <select
                  id="txn-cat"
                  className="form-select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select a category...</option>
                  {filteredCats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? '\u00A0\u00A0↳ ' : ''}{c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label" htmlFor="txn-acc">{type === 'transfer' ? 'From Account' : 'Account'}</label>
              <select
                id="txn-acc"
                className="form-select"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                required
              >
                {state.accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div className="form-group">
                <label className="form-label" htmlFor="txn-to-acc">To Account</label>
                <select
                  id="txn-to-acc"
                  className="form-select"
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  required
                >
                  {state.accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {type === 'expense' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} />
                Split this transaction across multiple categories
              </label>
            </div>
          )}

          {type === 'expense' && isSplit && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Split Categories</h4>
              {splits.map((split, i) => (
                <div key={i} className="form-row" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <select
                      className="form-select"
                      value={split.categoryId}
                      onChange={e => {
                        const newSplits = [...splits];
                        newSplits[i].categoryId = e.target.value;
                        setSplits(newSplits);
                      }}
                      required={isSplit}
                    >
                      <option value="">Select category...</option>
                      {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={split.amount}
                      onChange={e => {
                        const newSplits = [...splits];
                        newSplits[i].amount = e.target.value;
                        setSplits(newSplits);
                      }}
                      required={isSplit}
                    />
                  </div>
                  {splits.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-icon"
                      style={{ marginTop: 2 }}
                      onClick={() => setSplits(splits.filter((_, idx) => idx !== i))}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSplits([...splits, { categoryId: '', amount: '' }])}
                >
                  + Add Split
                </button>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Total: {formatCurrency(splits.reduce((s, split) => s + (parseFloat(split.amount) || 0), 0), state.currency)} / {formatCurrency(parseFloat(amount) || 0, state.currency)}
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="txn-notes">Notes (optional)</label>
            <textarea
              id="txn-notes"
              className="form-textarea"
              placeholder="Any additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px dashed var(--border)' }}>
             <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Receipt / Proof of Payment</h4>
             <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-receipt-url">Receipt URL / Link</label>
                  <input
                    id="txn-receipt-url"
                    className="form-input"
                    type="url"
                    placeholder="https://..."
                    value={receiptUrl}
                    onChange={e => setReceiptUrl(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-receipt-notes">Reference No / Extra Info</label>
                  <input
                    id="txn-receipt-notes"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Transaction ID"
                    value={receiptNotes}
                    onChange={e => setReceiptNotes(e.target.value)}
                  />
                </div>
             </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--expense-subtle)',
              color: 'var(--expense)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              id="submit-transaction"
              className="btn btn-primary"
              style={type === 'income'
                ? { background: 'var(--income)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }
                : undefined}
            >
              {editing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>

    {showConfirmClose && (
      <div className="modal-overlay" style={{ zIndex: 99999 }}>
        <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Save changes?</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
            You have unsaved changes. Do you want to save them before closing?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>No, Discard</button>
            <button className="btn btn-primary" onClick={(e) => { setShowConfirmClose(false); handleSubmit(e as any); }}>Yes, Save</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
