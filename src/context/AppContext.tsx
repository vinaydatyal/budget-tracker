'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AppState, AppAction, Transaction, Category, BudgetGoal, Account, RecurringTransaction, Debt, SavingsGoal } from '@/lib/types';
import { loadState, saveState, DEFAULT_STATE } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
        debts: action.payload.debts || [],
        savingsGoals: action.payload.savingsGoals || []
      };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'ADD_TRANSACTIONS_BULK':
      return { ...state, transactions: [...action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
      };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(a => a.id !== action.payload),
      };
    case 'ADD_BUDGET_GOAL':
      return { ...state, budgetGoals: [...state.budgetGoals, action.payload] };
    case 'UPDATE_BUDGET_GOAL':
      return {
        ...state,
        budgetGoals: state.budgetGoals.map(b =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case 'DELETE_BUDGET_GOAL':
      return {
        ...state,
        budgetGoals: state.budgetGoals.filter(b => b.id !== action.payload),
      };
    case 'ADD_RECURRING':
      return { ...state, recurringTransactions: [...state.recurringTransactions, action.payload] };
    case 'UPDATE_RECURRING':
      return {
        ...state,
        recurringTransactions: state.recurringTransactions.map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_RECURRING':
      return {
        ...state,
        recurringTransactions: state.recurringTransactions.filter(r => r.id !== action.payload),
      };
    case 'MARK_RECURRING_PAID':
      return {
        ...state,
        recurringTransactions: state.recurringTransactions.map(r => {
          if (r.id !== action.payload.recurringId) return r;
          
          let nextDueDate = action.payload.newDueDate;
          let active = r.active;
          let paidInstallments = r.paidInstallments || 0;
          
          if (r.isEmi && r.totalInstallments) {
            paidInstallments += 1;
            if (paidInstallments >= r.totalInstallments) {
              active = false;
            }
          }
          
          return { ...r, nextDueDate, active, paidInstallments };
        })
      };
    case 'ADD_DEBT':
      return { ...state, debts: [...state.debts, action.payload] };
    case 'UPDATE_DEBT':
      return {
        ...state,
        debts: state.debts.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'DELETE_DEBT':
      return {
        ...state,
        debts: state.debts.filter(d => d.id !== action.payload),
      };
    case 'ADD_SAVINGS_GOAL':
      return { ...state, savingsGoals: [...state.savingsGoals, action.payload] };
    case 'UPDATE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.map(sg =>
          sg.id === action.payload.id ? action.payload : sg
        ),
      };
    case 'DELETE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.filter(sg => sg.id !== action.payload),
      };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_TAX_RATE':
      return { ...state, taxRate: action.payload };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };
    case 'IMPORT_TRANSACTIONS':
      return {
        ...state,
        transactions: [
          ...action.payload,
          ...state.transactions.filter(
            t => !action.payload.find(imp => imp.id === t.id)
          ),
        ],
      };
    case 'UPDATE_DASHBOARD_LAYOUT':
      return { ...state, dashboardLayouts: action.payload.layouts };
    case 'TOGGLE_WIDGET': {
      const hidden = state.dashboardHiddenWidgets || [];
      if (hidden.includes(action.payload)) {
        return { ...state, dashboardHiddenWidgets: hidden.filter(w => w !== action.payload) };
      }
      return { ...state, dashboardHiddenWidgets: [...hidden, action.payload] };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  addTransactionsBulk: (txns: Omit<Transaction, 'id'>[]) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (a: Account) => void;
  deleteAccount: (id: string) => void;
  addBudgetGoal: (b: Omit<BudgetGoal, 'id'>) => void;
  updateBudgetGoal: (b: BudgetGoal) => void;
  deleteBudgetGoal: (id: string) => void;
  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (r: RecurringTransaction) => void;
  deleteRecurring: (id: string) => void;
  markRecurringPaid: (recurringId: string, transactionId: string, newDueDate: string) => void;
  addDebt: (d: Omit<Debt, 'id'>) => void;
  updateDebt: (d: Debt) => void;
  deleteDebt: (id: string) => void;
  addSavingsGoal: (sg: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (sg: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  toggleTheme: () => void;
  updateDashboardLayout: (layouts: Record<string, any[]>) => void;
  toggleWidget: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, DEFAULT_STATE);
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      let saved = loadState();

      if (user && db) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            saved = docSnap.data().state as AppState;
          } else {
            // First time login, migrate local state to cloud
            saved.categories = [
              { id: 'cat-housing', name: 'Housing', color: '#3b82f6', icon: '🏠', type: 'expense', monthlyBudget: 1500 },
              { id: 'cat-food', name: 'Food & Dining', color: '#f97316', icon: '🍔', type: 'expense', monthlyBudget: 500, budgetRollover: true },
              { id: 'cat-transport', name: 'Transportation', color: '#10b981', icon: '🚗', type: 'expense', monthlyBudget: 300, budgetRollover: true },
              { id: 'cat-shopping', name: 'Shopping', color: '#ec4899', icon: '🛍️', type: 'expense', monthlyBudget: 200, budgetRollover: true },
              { id: 'cat-salary', name: 'Salary', color: '#22c55e', icon: '💼', type: 'income' },
              { id: 'cat-freelance', name: 'Freelance', color: '#a855f7', icon: '💻', type: 'income' }
            ];
            await setDoc(docRef, { state: saved });
          }
        } catch (error) {
          console.error("Firebase load error:", error);
        }
      }

      // Process Recurring
      const todayStr = new Date().toISOString().slice(0, 10);
      const generatedTxns: Transaction[] = [];
      let updatedRecurring = false;
      
      const processedRecurring = saved.recurringTransactions.map(r => {
        if (!r.active || r.nextDueDate > todayStr) return r;
        
        let nextDateObj = new Date(r.nextDueDate);
        const todayObj = new Date();
        
        while (nextDateObj <= todayObj) {
          generatedTxns.push({
            id: `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: r.type,
            amount: r.amount,
            categoryId: r.categoryId,
            accountId: r.accountId,
            toAccountId: r.toAccountId,
            payee: r.payee,
            description: r.description,
            date: nextDateObj.toISOString(),
            notes: 'Auto-generated',
          });
          
          updatedRecurring = true;
          if (r.frequency === 'daily') nextDateObj.setDate(nextDateObj.getDate() + 1);
          else if (r.frequency === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
          else if (r.frequency === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);
          else if (r.frequency === 'yearly') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
        }
        
        return { ...r, nextDueDate: nextDateObj.toISOString().slice(0, 10) };
      });

      if (updatedRecurring) {
        saved.recurringTransactions = processedRecurring;
        saved.transactions = [...generatedTxns, ...saved.transactions];
      }

      dispatch({ type: 'LOAD_STATE', payload: saved });
    }

    loadData();
  }, [user]);

  useEffect(() => {
    saveState(state);
    if (user && db) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, { state }).catch(console.error);
    }
  }, [state, user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Budget Alerts — fire toast when budget hits 80% or 100%
  const alertedRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    state.budgetGoals.forEach(goal => {
      if (goal.goalType === 'save') return; // only alert on spend budgets
      const limit = goal.monthlyLimit;
      if (!limit || limit <= 0) return;
      const spent = state.transactions
        .filter(t => t.type === 'expense' && t.categoryId === goal.categoryId && t.date.startsWith(currentMonth))
        .reduce((s, t) => s + t.amount, 0);
      const pct = (spent / limit) * 100;
      const key100 = `${goal.id}-100`;
      const key80  = `${goal.id}-80`;
      const cat = state.categories.find(c => c.id === goal.categoryId);
      const catName = cat ? `${cat.icon} ${cat.name}` : 'Budget';
      if (pct >= 100 && !alertedRef.current.has(key100)) {
        alertedRef.current.add(key100);
        window.dispatchEvent(new CustomEvent('budget-alert', { detail: { msg: `${catName} budget exceeded! Spent ${formatCurrency(spent, state.currency)} of ${formatCurrency(limit, state.currency)}`, type: 'error' } }));
      } else if (pct >= 80 && !alertedRef.current.has(key80)) {
        alertedRef.current.add(key80);
        window.dispatchEvent(new CustomEvent('budget-alert', { detail: { msg: `${catName} at ${pct.toFixed(0)}% of budget (${formatCurrency(spent, state.currency)} / ${formatCurrency(limit, state.currency)})`, type: 'warning' } }));
      } else if (pct < 80) {
        alertedRef.current.delete(key80);
        alertedRef.current.delete(key100);
      }
    });
  }, [state.transactions, state.budgetGoals, state.categories, state.currency]);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...t, id: uid() } });
  }, []);

  const addTransactionsBulk = useCallback((txns: Omit<Transaction, 'id'>[]) => {
    const payload = txns.map(t => ({ ...t, id: uid() }));
    dispatch({ type: 'ADD_TRANSACTIONS_BULK', payload });
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: t });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  }, []);

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    dispatch({ type: 'ADD_CATEGORY', payload: { ...c, id: uid() } });
  }, []);

  const updateCategory = useCallback((c: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: c });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  }, []);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    dispatch({ type: 'ADD_ACCOUNT', payload: { ...a, id: uid() } });
  }, []);

  const updateAccount = useCallback((a: Account) => {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: a });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ACCOUNT', payload: id });
  }, []);

  const addBudgetGoal = useCallback((b: Omit<BudgetGoal, 'id'>) => {
    dispatch({ type: 'ADD_BUDGET_GOAL', payload: { ...b, id: uid() } });
  }, []);

  const updateBudgetGoal = useCallback((b: BudgetGoal) => {
    dispatch({ type: 'UPDATE_BUDGET_GOAL', payload: b });
  }, []);

  const deleteBudgetGoal = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET_GOAL', payload: id });
  }, []);

  const addRecurring = useCallback((r: Omit<RecurringTransaction, 'id'>) => {
    dispatch({ type: 'ADD_RECURRING', payload: { ...r, id: uid() } });
  }, []);

  const updateRecurring = useCallback((r: RecurringTransaction) => {
    dispatch({ type: 'UPDATE_RECURRING', payload: r });
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RECURRING', payload: id });
  }, []);

  const markRecurringPaid = useCallback((recurringId: string, transactionId: string, newDueDate: string) => {
    dispatch({ type: 'MARK_RECURRING_PAID', payload: { recurringId, transactionId, newDueDate } });
  }, []);

  const addDebt = useCallback((d: Omit<Debt, 'id'>) => {
    dispatch({ type: 'ADD_DEBT', payload: { ...d, id: uid() } });
  }, []);

  const updateDebt = useCallback((d: Debt) => {
    dispatch({ type: 'UPDATE_DEBT', payload: d });
  }, []);

  const deleteDebt = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DEBT', payload: id });
  }, []);

  const addSavingsGoal = useCallback((sg: Omit<SavingsGoal, 'id'>) => {
    dispatch({ type: 'ADD_SAVINGS_GOAL', payload: { ...sg, id: uid() } });
  }, []);

  const updateSavingsGoal = useCallback((sg: SavingsGoal) => {
    dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: sg });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  const updateDashboardLayout = useCallback((layouts: Record<string, any[]>) => {
    dispatch({ type: 'UPDATE_DASHBOARD_LAYOUT', payload: { layouts } });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_WIDGET', payload: id });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addTransaction,
        addTransactionsBulk,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount,
        addBudgetGoal,
        updateBudgetGoal,
        deleteBudgetGoal,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        markRecurringPaid,
        addDebt,
        updateDebt,
        deleteDebt,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        toggleTheme,
        updateDashboardLayout,
        toggleWidget,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined || context === null) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
