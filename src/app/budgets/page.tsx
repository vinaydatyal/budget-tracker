'use client';

import { useState } from 'react';
import { Plus, X, Check, Trash2 } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { format } from 'date-fns';
import { BudgetGoal } from '@/lib/types';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function BudgetsPage() {
  const { state, addBudgetGoal, updateBudgetGoal, deleteBudgetGoal } = useApp();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BudgetGoal | null>(null);

  const [categoryId, setCategoryId] = useState('');
  const [goalType, setGoalType] = useState<'spend' | 'save'>('spend');
  const [limit, setLimit] = useState(''); // Also used as targetAmount for 'save'
  const [rollover, setRollover] = useState(false);
  const [error, setError] = useState('');

  // Get explicit goals for selected month
  const explicitGoals = state.budgetGoals.filter(b => b.month === selectedMonth);

  // Combine with implicit category budgets
  const activeGoals = [
    ...explicitGoals,
    ...state.categories
      .filter(c => c.monthlyBudget && c.monthlyBudget > 0 && !explicitGoals.find(g => g.categoryId === c.id))
      .map(c => ({
        id: `implicit-${c.id}`,
        categoryId: c.id,
        monthlyLimit: c.monthlyBudget!,
        month: selectedMonth,
        rollover: !!c.budgetRollover,
        goalType: 'spend' as const,
        isImplicit: true
      }))
  ];

  // Available categories for new goals (don't allow duplicate goals for same category in same month)
  const expenseCats = state.categories.filter(c => c.type === 'expense' || c.type === 'both');
  const availableCats = expenseCats.filter(c => !activeGoals.find(g => g.categoryId === c.id) || editing?.categoryId === c.id);

  function openNew() {
    setEditing(null);
    const firstCat = availableCats[0];
    setCategoryId(firstCat?.id ?? '');
    setLimit(firstCat?.monthlyBudget ? String(firstCat.monthlyBudget) : '');
    setRollover(!!firstCat?.budgetRollover);
    setError('');
    setShowForm(true);
  }

  function openEdit(goal: BudgetGoal) {
    setEditing(goal);
    setCategoryId(goal.categoryId);
    setGoalType(goal.goalType || 'spend');
    setLimit(goal.goalType === 'save' ? (goal.targetAmount?.toString() || '') : goal.monthlyLimit.toString());
    setRollover(!!goal.rollover);
    setError('');
    setShowForm(true);
  }

  function handleAddFunds(e: React.MouseEvent, goal: BudgetGoal) {
    e.stopPropagation();
    const amountStr = prompt(`Add funds to ${state.categories.find(c => c.id === goal.categoryId)?.name} target? (Current saved: ${formatCurrency(goal.savedAmount || 0, state.currency)})`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      updateBudgetGoal({ ...goal, savedAmount: (goal.savedAmount || 0) + amount });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lmt = parseFloat(limit);
    if (!categoryId) return setError('Select a category');
    if (isNaN(lmt) || lmt <= 0) return setError('Enter a valid amount');

    const payload = goalType === 'spend' 
      ? { categoryId, monthlyLimit: lmt, month: selectedMonth, rollover, goalType }
      : { categoryId, monthlyLimit: 0, targetAmount: lmt, month: selectedMonth, goalType, savedAmount: editing?.savedAmount || 0 };
      
    if (editing) updateBudgetGoal({ ...payload, id: editing.id } as any);
    else addBudgetGoal(payload as any);

    setShowForm(false);
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Goals</h1>
          <p className="page-subtitle">Set limits and track your spending</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            id="budget-month"
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 160 }}
          />
          <button id="add-budget-btn" className="btn btn-primary" onClick={openNew} disabled={availableCats.length === 0}>
            <Plus size={16} /> New Goal
          </button>
        </div>
      </div>

      {activeGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No budget goals for this month</div>
          <div className="empty-state-text">Set spending limits for your categories to stay on track.</div>
          {availableCats.length > 0 && (
            <button className="btn btn-primary" onClick={openNew}>Set a Goal</button>
          )}
        </div>
      ) : (
        <div className="budget-grid">
          {activeGoals.map(goal => {
            const cat = state.categories.find(c => c.id === goal.categoryId);
            if (!cat) return null;

            const isSave = goal.goalType === 'save';

            if (isSave) {
              const target = goal.targetAmount || 1;
              const saved = goal.savedAmount || 0;
              const percent = Math.min((saved / target) * 100, 100);
              
              return (
                <div key={goal.id} className="budget-card animate-in" onClick={() => openEdit(goal)} style={{ cursor: 'pointer', borderTop: '4px solid var(--income)' }}>
                  <div className="budget-card-header">
                    <div className="budget-cat-icon" style={{ background: `${cat.color}22`, color: cat.color }}>
                      {cat.icon}
                    </div>
                    <div className="budget-info">
                      <div className="budget-cat-name">
                        {cat.name} 
                        <span className="badge" style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: 'var(--income-subtle)', color: 'var(--income)' }}>Savings Goal</span>
                      </div>
                      <div className="budget-amounts">
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(saved, state.currency)}</span> saved of <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(target, state.currency)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={e => handleAddFunds(e, goal)}>
                        + Funds
                      </button>
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={e => { e.stopPropagation(); if(confirm('Delete goal?')) deleteBudgetGoal(goal.id); }}
                        aria-label="Delete Goal"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${percent}%`, background: 'var(--income)' }} />
                  </div>

                  <div className="progress-label">
                    <span>{percent.toFixed(0)}%</span>
                    <span>{formatCurrency(target - saved, state.currency)} to go</span>
                  </div>
                </div>
              );
            }

            // --- Spend Goal Logic ---
            const spent = state.transactions
              .filter(t => t.categoryId === cat.id && t.date.slice(0, 7) === selectedMonth)
              .reduce((s, t) => s + t.amount, 0);

            let adjustedLimit = goal.monthlyLimit;
            let rolloverAmount = 0;

            if (goal.rollover) {
              const pastGoals = state.budgetGoals.filter(b => b.categoryId === goal.categoryId && b.month < goal.month && b.goalType !== 'save');
              if (pastGoals.length > 0) {
                const pastMonthsWithGoals = pastGoals.map(b => b.month);
                const totalPastLimit = pastGoals.reduce((s, b) => s + b.monthlyLimit, 0);
                const totalPastSpent = state.transactions
                  .filter(t => t.categoryId === goal.categoryId && pastMonthsWithGoals.includes(t.date.slice(0, 7)))
                  .reduce((s, t) => s + t.amount, 0);
                rolloverAmount = totalPastLimit - totalPastSpent;
                adjustedLimit += rolloverAmount;
              }
            }

            const effectiveLimit = Math.max(adjustedLimit, 0.01);
            const percent = Math.min((spent / effectiveLimit) * 100, 100);
            const isOver = spent > adjustedLimit;

            return (
              <div key={goal.id} className="budget-card animate-in" onClick={() => openEdit(goal)} style={{ cursor: 'pointer' }}>
                <div className="budget-card-header">
                  <div className="budget-cat-icon" style={{ background: `${cat.color}22`, color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="budget-info">
                    <div className="budget-cat-name">
                      {cat.name} 
                      {(goal as any).isImplicit && <span className="badge" style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Default</span>}
                      {goal.rollover && <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px' }}>Rollover</span>}
                    </div>
                    <div className="budget-amounts">
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(spent, state.currency)}</span> of <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(adjustedLimit, state.currency)}</span>
                      {rolloverAmount !== 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                          (Base: {formatCurrency(goal.monthlyLimit, state.currency)} {rolloverAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(rolloverAmount), state.currency)})
                        </span>
                      )}
                    </div>
                  </div>
                  {!(goal as any).isImplicit && (
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); if(confirm('Delete goal?')) deleteBudgetGoal(goal.id); }}
                      aria-label="Delete Goal"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${percent}%`,
                      background: isOver ? 'var(--expense)' : percent > 85 ? 'var(--warning)' : 'var(--text-main)'
                    }}
                  />
                </div>

                <div className="progress-label">
                  <span>{percent.toFixed(0)}%</span>
                  {isOver ? (
                    <span className="over-budget">Over limit by {formatCurrency(spent - adjustedLimit, state.currency)}</span>
                  ) : (
                    <span>{formatCurrency(adjustedLimit - spent, state.currency)} remaining</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Goal' : 'New Goal'}</h2>
              <button className="btn btn-icon" onClick={() => setShowForm(false)} id="close-budget-form"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  id="budget-category"
                  className="form-select"
                  value={categoryId}
                  onChange={e => {
                    const cid = e.target.value;
                    setCategoryId(cid);
                    if (!editing) {
                      const c = state.categories.find(cat => cat.id === cid);
                      if (c?.monthlyBudget) setLimit(String(c.monthlyBudget));
                      if (c?.budgetRollover !== undefined) setRollover(!!c.budgetRollover);
                    }
                  }}
                  disabled={!!editing}
                >
                  <option value="">Select category...</option>
                  {state.categories.filter(c => c.id === categoryId || !activeGoals.find(g => g.categoryId === c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Goal Type</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={goalType === 'spend'} onChange={() => setGoalType('spend')} /> Spending Limit
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={goalType === 'save'} onChange={() => setGoalType('save')} /> Savings Target
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{goalType === 'spend' ? `Monthly Limit (${state.currency})` : `Target Amount (${state.currency})`}</label>
                <input
                  id="budget-limit"
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>

              {goalType === 'spend' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rollover}
                      onChange={e => setRollover(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Enable Rollover
                  </label>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Unspent budget from past months will carry over and increase this month's available limit.
                  </div>
                </div>
              )}

              {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                {editing && !(editing as any).isImplicit && (
                  <button type="button" className="btn btn-icon" onClick={() => { if(confirm('Delete goal?')) { deleteBudgetGoal(editing.id); setShowForm(false); } }} style={{ marginRight: 'auto', color: 'var(--expense)' }} title="Delete Goal"><Trash2 size={15} /></button>
                )}
                {editing && (editing as any).isImplicit && (
                  <button type="button" className="btn btn-secondary" onClick={() => { alert('To completely remove this default budget, go to Categories and set its budget to 0.'); }} style={{ marginRight: 'auto' }} title="How to delete">How to remove?</button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" id="save-budget-btn" className="btn btn-primary"><Check size={15} /> Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
