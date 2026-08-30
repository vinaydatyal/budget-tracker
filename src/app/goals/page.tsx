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
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { SavingsGoal, Debt, Transaction } from '@/lib/types';

export default function GoalsPage() {
  const { state } = useApp();
  const { toast } = useToast();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'business'>('personal');
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);

  const filteredGoals = state.savingsGoals.filter(g => activeTab === 'business' ? !!g.isBusiness : !g.isBusiness);
  const filteredDebts = state.debts.filter(d => activeTab === 'business' ? !!d.isBusiness : !d.isBusiness);
  // EMIs belong to the account/category they are linked to. Since recurring transactions don't have an explicit isBusiness flag yet, we check their linkedDebt or assume personal for now, but usually they don't have isBusiness. We'll filter them by checking if their linked debt is in filteredDebts or if not linked, just assume personal for now.
  const activeEmis = state.recurringTransactions.filter(r => r.isEmi && r.active && (!r.linkedDebtId ? activeTab === 'personal' : filteredDebts.some(d => d.id === r.linkedDebtId)));

  const totalSavings = filteredGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const targetSavings = filteredGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  
  const totalEmiBalance = activeEmis.reduce((sum, r) => sum + (Math.max(0, (r.totalInstallments || 1) - (r.paidInstallments || 0))) * r.amount, 0);
  const totalEmiPayment = activeEmis.reduce((sum, r) => sum + r.amount, 0);

  const totalDebt = filteredDebts.reduce((sum, d) => sum + d.balance, 0) + totalEmiBalance;
  const totalMinPayment = filteredDebts.reduce((sum, d) => sum + d.minimumPayment, 0) + totalEmiPayment;

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goals & Debts</h1>
          <p className="page-subtitle">Track your long-term financial objectives.</p>
        </div>
      </div>

      {state.preferences.enableDebtSimulator && <DebtPayoffChart />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Savings Summary */}
        <div className="card" style={{ padding: 24, background: 'var(--income-subtle)', border: '1px solid var(--income)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--income)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Total Savings</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Across {filteredGoals.length} goals</p>
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
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Across {filteredDebts.length + activeEmis.length} accounts & EMIs</p>
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

      {state.preferences.enableBusinessMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <button 
            className={`btn ${activeTab === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Goals & Debts
          </button>
          <button 
            className={`btn ${activeTab === 'business' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('business')}
          >
            Business Goals & Debts
          </button>
        </div>
      )}

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
        
        {filteredGoals.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', minHeight: 'auto' }}>
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No savings goals yet</div>
            <div className="empty-state-text">Start tracking for a vacation, emergency fund, or new car.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filteredGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onEdit={() => { setEditingGoal(goal); setShowGoalForm(true); }} 
                onLogContribution={() => { setContributionGoal(goal); setShowTransactionForm(true); }}
              />
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

        {filteredDebts.length === 0 && activeEmis.length === 0 ? (
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
            {filteredDebts.map(debt => (
              <DebtCard 
                key={debt.id} 
                debt={debt} 
                onEdit={() => { setEditingDebt(debt); setShowDebtForm(true); }} 
                onLogPayment={() => { setPaymentDebt(debt); setShowTransactionForm(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {showGoalForm && (
        <GoalForm
          editing={editingGoal}
          isBusinessMode={activeTab === 'business'}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}
          onSave={() => toast(editingGoal ? 'Goal updated' : 'Goal created', 'success')}
        />
      )}
      
      {showDebtForm && (
        <DebtForm
          editing={editingDebt}
          isBusinessMode={activeTab === 'business'}
          onClose={() => { setShowDebtForm(false); setEditingDebt(null); }}
          onSave={() => toast(editingDebt ? 'Debt updated' : 'Debt added', 'success')}
        />
      )}
      
      {showTransactionForm && paymentDebt && (
        <TransactionForm
          onClose={() => { setShowTransactionForm(false); setPaymentDebt(null); setContributionGoal(null); }}
          defaultValues={{
            type: 'expense',
            linkedDebtId: paymentDebt.id,
            amount: paymentDebt.minimumPayment,
            description: `Payment for ${paymentDebt.name}`
          }}
          onSave={() => {
            toast('Payment logged successfully', 'success');
          }}
        />
      )}

      {showTransactionForm && contributionGoal && (
        <TransactionForm
          onClose={() => { setShowTransactionForm(false); setPaymentDebt(null); setContributionGoal(null); }}
          defaultValues={{
            type: 'transfer',
            linkedSavingsGoalId: contributionGoal.id,
            description: `Contribution to ${contributionGoal.name}`
          }}
          onSave={() => {
            toast('Contribution logged successfully', 'success');
          }}
        />
      )}
    </PageWrapper>
  );
}
