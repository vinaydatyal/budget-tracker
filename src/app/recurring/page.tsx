'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Repeat, AlertCircle, Wand2 } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { RecurringTransaction, TransactionType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function RecurringPage() {
  const { state, addRecurring, updateRecurring, deleteRecurring } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);

  // Auto-detect suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(state.accounts[1]?.id ?? '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEmi, setIsEmi] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [error, setError] = useState('');

  const filteredCats = state.categories.filter(c => c.type === type || c.type === 'both');

  // Calculate True Costs and Investments
  function getMonthlySum(txns: RecurringTransaction[]) {
    return txns.reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === 'daily') multiplier = 30;
      else if (r.frequency === 'weekly') multiplier = 4.33;
      else if (r.frequency === 'yearly') multiplier = 1/12;
      return sum + (r.amount * multiplier);
    }, 0);
  }

  const isSIP = (r: RecurringTransaction) => !!r.linkedSavingsGoalId || /\b(sip|rd|saving|invest)\b/i.test(r.description);
  const isEMI = (r: RecurringTransaction) => r.isEmi || !!r.linkedDebtId || /\b(emi|loan|mortgage|debt)\b/i.test(r.description);

  const sunkCosts = state.recurringTransactions.filter(r => r.active && r.type === 'expense' && !isSIP(r) && !isEMI(r));
  const investments = state.recurringTransactions.filter(r => r.active && isSIP(r));
  const debtPayments = state.recurringTransactions.filter(r => r.active && isEMI(r));

  const monthlySunkCost = getMonthlySum(sunkCosts);
  const monthlyInvestments = getMonthlySum(investments);
  const monthlyDebtPayments = getMonthlySum(debtPayments);

  function openNew() {
    setEditing(null);
    setType('expense');
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId(state.accounts[0]?.id ?? '');
    setToAccountId(state.accounts[1]?.id ?? '');
    setFrequency('monthly');
    setNextDueDate(format(new Date(), 'yyyy-MM-dd'));
    setIsEmi(false);
    setTotalInstallments('');
    setPaidInstallments('0');
    setError('');
    setShowForm(true);
  }

  function openEdit(r: RecurringTransaction) {
    setEditing(r);
    setType(r.type);
    setAmount(r.amount.toString());
    setDescription(r.description);
    setCategoryId(r.categoryId);
    setAccountId(r.accountId);
    setToAccountId(r.toAccountId ?? '');
    setFrequency(r.frequency);
    setNextDueDate(r.nextDueDate);
    setIsEmi(r.isEmi || false);
    setTotalInstallments(r.totalInstallments?.toString() || '');
    setPaidInstallments(r.paidInstallments?.toString() || '0');
    setError('');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim()) return setError('Description is required.');
    if (isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    if (type !== 'transfer' && !categoryId) return setError('Select a category.');
    if (!accountId) return setError('Select an account.');
    if (type === 'transfer' && accountId === toAccountId) return setError('Cannot transfer to same account.');
    if (!nextDueDate) return setError('Select a next due date.');

    if (isEmi) {
      const ti = parseInt(totalInstallments);
      const pi = parseInt(paidInstallments);
      if (isNaN(ti) || ti <= 0) return setError('Total installments must be a positive number.');
      if (isNaN(pi) || pi < 0 || pi > ti) return setError('Paid installments must be valid and cannot exceed total.');
    }

    const payload = {
      type,
      amount: amt,
      description: description.trim(),
      categoryId: type === 'transfer' ? 'transfer' : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      frequency,
      nextDueDate,
      active: true,
      isEmi,
      totalInstallments: isEmi ? parseInt(totalInstallments) : undefined,
      paidInstallments: isEmi ? parseInt(paidInstallments) : undefined,
    };

    if (editing) updateRecurring({ ...payload, id: editing.id, active: editing.active });
    else addRecurring(payload);
    
    setShowForm(false);
  }

  function scanForSubscriptions() {
    setIsScanning(true);
    setTimeout(() => {
      const expenses = state.transactions.filter(t => t.type === 'expense');
      
      const groups: Record<string, typeof expenses> = {};
      expenses.forEach(t => {
        const key = t.description.trim().toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      const found: any[] = [];
      Object.entries(groups).forEach(([name, txns]) => {
        if (txns.length >= 2) {
          txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const mostRecent = txns[0];
          const secondMostRecent = txns[1];
          
          if (mostRecent.amount === secondMostRecent.amount) {
            const isTracked = state.recurringTransactions.some(r => r.description.toLowerCase() === name);
            if (!isTracked) {
              const d1 = new Date(mostRecent.date);
              const d2 = new Date(secondMostRecent.date);
              const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
              
              if (diffDays >= 25 && diffDays <= 35) {
                const nextDue = new Date(d1);
                nextDue.setMonth(nextDue.getMonth() + 1);
                found.push({
                  description: mostRecent.description,
                  amount: mostRecent.amount,
                  categoryId: mostRecent.categoryId,
                  accountId: mostRecent.accountId,
                  frequency: 'monthly',
                  predictedNextDate: nextDue.toISOString().split('T')[0]
                });
              }
            }
          }
        }
      });

      setSuggestions(found);
      setIsScanning(false);
    }, 800);
  }

  function handleAcceptSuggestion(s: any) {
    addRecurring({
      type: 'expense',
      amount: s.amount,
      categoryId: s.categoryId,
      accountId: s.accountId,
      description: s.description,
      frequency: s.frequency,
      nextDueDate: s.predictedNextDate,
      active: true
    });
    setSuggestions(prev => prev.filter(p => p.description !== s.description));
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions & Recurring</h1>
          <p className="page-subtitle">Manage automated transactions that repeat over time</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={scanForSubscriptions} disabled={isScanning}>
            <Wand2 size={16} /> {isScanning ? 'Scanning...' : 'Auto-Detect'}
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> New Recurring
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--expense)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>True Monthly Cost (Sunk)</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--expense)' }}>{formatCurrency(monthlySunkCost, state.currency)}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--income)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Auto-Savings (SIP)</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--income)' }}>{formatCurrency(monthlyInvestments, state.currency)}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Auto-EMIs</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--text-main)' }}>{formatCurrency(monthlyDebtPayments, state.currency)}</div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="card animate-in" style={{ marginBottom: 24, border: '1px solid var(--income)', background: 'var(--income-subtle)' }}>
          <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <span className="card-title" style={{ color: 'var(--income)' }}>Found {suggestions.length} Potential Subscriptions!</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestions.map((s, i) => {
                const cat = state.categories.find(c => c.id === s.categoryId);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: 16, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: `${cat?.color}22`, width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {cat?.icon || '💳'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.description}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Predicted Next: {s.predictedNextDate}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(s.amount, state.currency)} / mo</div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAcceptSuggestion(s)}>Track This</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {state.recurringTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Repeat /></div>
            <div className="empty-state-title">No recurring transactions</div>
            <div className="empty-state-text">Automate your rent, salaries, and Netflix subscriptions.</div>
          </div>
        ) : (
          state.recurringTransactions.map(r => {
            const cat = state.categories.find(c => c.id === r.categoryId);
            const acc = state.accounts.find(a => a.id === r.accountId);
            const toAcc = state.accounts.find(a => a.id === r.toAccountId);
            return (
              <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', opacity: r.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="transaction-icon" style={{ background: cat ? `${cat.color}22` : 'var(--bg-input)' }}>
                    {cat?.icon ?? <Repeat size={20} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{r.description}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      {isSIP(r) ? (
                        <span className="badge badge-income" style={{ background: 'var(--income)', color: 'white' }}>SIP / Savings</span>
                      ) : isEMI(r) ? (
                        <span className="badge badge-expense" style={{ background: 'var(--expense)', color: 'white' }}>EMI / Debt</span>
                      ) : (
                        <span className={`badge badge-${r.type}`}>{r.type}</span>
                      )}
                      <span>•</span>
                      {r.isEmi ? (
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>EMI ({r.paidInstallments}/{r.totalInstallments} paid)</span>
                      ) : (
                        <span>Repeats {r.frequency}</span>
                      )}
                      <span>•</span>
                      <span>Next: {format(parseISO(r.nextDueDate), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>{acc?.name} {r.type === 'transfer' && `→ ${toAcc?.name}`}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: (r.type === 'income' || isSIP(r)) ? 'var(--income)' : 'var(--expense)' }}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount, state.currency)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => updateRecurring({ ...r, active: !r.active })}
                      title={r.active ? 'Pause' : 'Resume'}
                    >
                      {r.active ? 'Pause' : 'Resume'}
                    </button>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if(confirm('Delete this recurring transaction?')) deleteRecurring(r.id); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Recurring' : 'New Recurring Transaction'}</h2>
              <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, backgroundColor: type === 'expense' ? 'var(--expense)' : '' }} onClick={() => { setType('expense'); setCategoryId(''); }}>Expense</button>
                <button type="button" className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, backgroundColor: type === 'income' ? 'var(--income)' : '' }} onClick={() => { setType('income'); setCategoryId(''); }}>Income</button>
                <button type="button" className={`btn ${type === 'transfer' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setType('transfer')}>Transfer</button>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Description</label>
                  <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Netflix, Rent, Salary" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Amount</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div className="form-row">
                {type !== 'transfer' && (
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                      <option value="">Select category...</option>
                      {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">{type === 'transfer' ? 'From Account' : 'Account'}</label>
                  <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {type === 'transfer' && (
                  <div className="form-group">
                    <label className="form-label">To Account</label>
                    <select className="form-select" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                      {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="form-group">
                  <label className="form-label">Repeats</label>
                  <select className="form-select" value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Next Due Date</label>
                  <input type="date" className="form-input" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isEmi ? 16 : 0 }}>
                  <input type="checkbox" checked={isEmi} onChange={e => setIsEmi(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 500 }}>This is an EMI / Fixed Installment plan</span>
                </label>
                
                {isEmi && (
                  <div className="form-row" style={{ marginTop: 8 }}>
                    <div className="form-group">
                      <label className="form-label">Total Installments</label>
                      <input type="number" min="1" className="form-input" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} placeholder="e.g. 12" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Installments Paid So Far</label>
                      <input type="number" min="0" className="form-input" value={paidInstallments} onChange={e => setPaidInstallments(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ color: 'var(--expense)', fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Check size={15} /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
