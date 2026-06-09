'use client';

import { useState } from 'react';
import { Plus, Target, CreditCard, ChevronRight } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GoalCard } from '@/components/goals/GoalCard';
import { DebtCard } from '@/components/goals/DebtCard';
import { EmiCard } from '@/components/goals/EmiCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { DebtForm } from '@/components/goals/DebtForm';
import { DebtPayoffChart } from '@/components/goals/DebtPayoffChart';
import { SavingsGoal, Debt } from '@/lib/types';

export default function GoalsPage() {
  const { state } = useApp();
  const { toast } = useToast();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const totalSavings = state.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const targetSavings = state.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  
  const activeEmis = state.recurringTransactions.filter(r => r.isEmi && r.active);
  const totalEmiBalance = activeEmis.reduce((sum, r) => sum + (Math.max(0, (r.totalInstallments || 1) - (r.paidInstallments || 0))) * r.amount, 0);
  const totalEmiPayment = activeEmis.reduce((sum, r) => sum + r.amount, 0);

  const totalDebt = state.debts.reduce((sum, d) => sum + d.balance, 0) + totalEmiBalance;
  const totalMinPayment = state.debts.reduce((sum, d) => sum + d.minimumPayment, 0) + totalEmiPayment;

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goals & Debts</h1>
          <p className="page-subtitle">Track your long-term financial objectives.</p>
        </div>
      </div>

      <DebtPayoffChart />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Savings Summary */}
        <div className="card" style={{ padding: 24, background: 'var(--income-subtle)', border: '1px solid var(--income)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--income)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Total Savings</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Across {state.savingsGoals.length} goals</p>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--income)' }}>
            {formatCurrency(totalSavings, state.currency)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            of {formatCurrency(targetSavings, state.currency)} target
          </div>
        </div>

        {/* Debt Summary */}
        <div className="card" style={{ padding: 24, background: 'var(--expense-subtle)', border: '1px solid var(--expense)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--expense)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Total Debt</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Across {state.debts.length + activeEmis.length} accounts & EMIs</p>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--expense)' }}>
            {formatCurrency(totalDebt, state.currency)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {formatCurrency(totalMinPayment, state.currency)} / mo minimum
          </div>
        </div>
      </div>

      {/* Savings Goals Section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Savings Goals <ChevronRight size={20} color="var(--text-muted)" />
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}>
            <Plus size={16} /> New Goal
          </button>
        </div>
        
        {state.savingsGoals.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', minHeight: 'auto' }}>
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No savings goals yet</div>
            <div className="empty-state-text">Start tracking for a vacation, emergency fund, or new car.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {state.savingsGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => { setEditingGoal(goal); setShowGoalForm(true); }} />
            ))}
          </div>
        )}
      </div>

      {/* Debts Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Debt Payoff <ChevronRight size={20} color="var(--text-muted)" />
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingDebt(null); setShowDebtForm(true); }}>
            <Plus size={16} /> Add Debt
          </button>
        </div>

        {state.debts.length === 0 && activeEmis.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', minHeight: 'auto' }}>
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-title">Debt free!</div>
            <div className="empty-state-text">You don't have any loans, credit cards, or EMIs to track.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {activeEmis.map(emi => (
              <EmiCard key={emi.id} emi={emi} />
            ))}
            {state.debts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={() => { setEditingDebt(debt); setShowDebtForm(true); }} />
            ))}
          </div>
        )}
      </div>

      {showGoalForm && (
        <GoalForm
          editing={editingGoal}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}
          onSave={() => toast(editingGoal ? 'Goal updated' : 'Goal created', 'success')}
        />
      )}
      
      {showDebtForm && (
        <DebtForm
          editing={editingDebt}
          onClose={() => { setShowDebtForm(false); setEditingDebt(null); }}
          onSave={() => toast(editingDebt ? 'Debt updated' : 'Debt added', 'success')}
        />
      )}
    </PageWrapper>
  );
}
