'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { AppState, AppAction, Transaction, Category, BudgetGoal, Account, RecurringTransaction, Debt, SavingsGoal, Preferences, RevenueSource, SplitRule } from '@/lib/types';
import { loadState, saveState, DEFAULT_STATE } from '@/lib/storage';
import { DEMO_TRANSACTIONS } from '@/lib/demoData';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { QUESTS } from '@/lib/achievements';
import { LedgerEntry } from '@/lib/types';

function generateLedgerEntries(txn: Transaction): LedgerEntry[] {
  if (!txn.isBusiness) return [];
  
  const entries: LedgerEntry[] = [];
  const baseId = `ledg-${txn.id}`;
  const add = (idSuffix: string, accountId: string, debit: number, credit: number) => {
    if (debit > 0 || credit > 0) {
      entries.push({
        id: `${baseId}-${idSuffix}`,
        transactionId: txn.id,
        accountId,
        debit,
        credit,
        date: txn.date,
        description: txn.description
      });
    }
  };

  const amount = txn.amount;
  const tax = txn.taxAmount || 0;
  const netAmount = amount - tax;

  if (txn.type === 'income') {
    if (txn.linkedDebtId) {
      // Taking on a loan
      add('1', 'Asset', amount, 0);
      add('2', 'Liability', 0, amount);
    } else {
      // Normal Income
      add('1', 'Asset', amount, 0);
      add('2', 'Revenue', 0, netAmount);
      if (tax > 0) add('3', 'Liability', 0, tax); // Tax collected is a liability
    }
  } else if (txn.type === 'expense') {
    if (txn.linkedDebtId) {
      // Paying off debt
      add('1', 'Liability', amount, 0);
      add('2', 'Asset', 0, amount);
    } else if (txn.linkedSavingsGoalId) {
      // Transfer to savings (Asset to Asset transfer)
      // Since GL only tracks "Asset" generally, we can ignore this or add offsetting Asset entries.
      // Ignoring it keeps the GL clean since Asset hasn't left the business.
    } else {
      // Normal Expense
      add('1', 'Expense', netAmount, 0);
      if (tax > 0) add('2', 'Liability', tax, 0); // Tax paid reduces tax liability
      add('3', 'Asset', 0, amount);
    }
  }
  // Transfers within business checking to cash etc don't change global GL Asset sum.

  return entries;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
        debts: action.payload.debts || [],
        savingsGoals: action.payload.savingsGoals || [],
        unlockedAchievements: action.payload.unlockedAchievements || []
      };
    case 'UNLOCK_ACHIEVEMENT': {
      if (state.unlockedAchievements.find(a => a.id === action.payload)) return state;
      return {
        ...state,
        unlockedAchievements: [
          ...state.unlockedAchievements,
          { id: action.payload, unlockedAt: new Date().toISOString() }
        ]
      };
    }
    case 'ADD_TRANSACTION': {
      let newLedger = state.ledger || [];
      if (action.payload.isBusiness) {
        newLedger = [
          ...newLedger,
          ...generateLedgerEntries(action.payload)
        ];
      }

      const newState = { ...state, transactions: [action.payload, ...state.transactions], ledger: newLedger };
      if (action.payload.linkedDebtId) {
        if (action.payload.type === 'expense') {
          newState.debts = newState.debts.map(d => 
            d.id === action.payload.linkedDebtId ? { ...d, balance: Math.max(0, d.balance - action.payload.amount) } : d
          );
        } else if (action.payload.type === 'income') {
          newState.debts = newState.debts.map(d => 
            d.id === action.payload.linkedDebtId ? { ...d, balance: d.balance + action.payload.amount } : d
          );
        }
      }
      if (action.payload.linkedSavingsGoalId) {
        if (action.payload.type === 'transfer' || action.payload.type === 'expense') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === action.payload.linkedSavingsGoalId ? { ...sg, currentAmount: sg.currentAmount + action.payload.amount } : sg
          );
        } else if (action.payload.type === 'income') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === action.payload.linkedSavingsGoalId ? { ...sg, currentAmount: Math.max(0, sg.currentAmount - action.payload.amount) } : sg
          );
        }
      }
      return newState;
    }
    case 'ADD_TRANSACTIONS_BULK':
      return { ...state, transactions: [...action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION': {
      const oldTxn = state.transactions.find(t => t.id === action.payload.id);
      
      let newLedger = state.ledger || [];
      if (oldTxn?.isBusiness || action.payload.isBusiness) {
        // Remove old entries
        newLedger = newLedger.filter(l => l.transactionId !== action.payload.id);
        
        // Add new entries if still business
        if (action.payload.isBusiness) {
          newLedger = [
            ...newLedger,
            ...generateLedgerEntries(action.payload)
          ];
        }
      }

      const newState = {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
        ledger: newLedger
      };
      if (oldTxn?.linkedDebtId) {
        if (oldTxn.type === 'expense') {
          newState.debts = newState.debts.map(d => 
            d.id === oldTxn.linkedDebtId ? { ...d, balance: d.balance + oldTxn.amount } : d
          );
        } else if (oldTxn.type === 'income') {
          newState.debts = newState.debts.map(d => 
            d.id === oldTxn.linkedDebtId ? { ...d, balance: Math.max(0, d.balance - oldTxn.amount) } : d
          );
        }
      }
      if (action.payload.linkedDebtId) {
        if (action.payload.type === 'expense') {
          newState.debts = newState.debts.map(d => 
            d.id === action.payload.linkedDebtId ? { ...d, balance: Math.max(0, d.balance - action.payload.amount) } : d
          );
        } else if (action.payload.type === 'income') {
          newState.debts = newState.debts.map(d => 
            d.id === action.payload.linkedDebtId ? { ...d, balance: d.balance + action.payload.amount } : d
          );
        }
      }
      if (oldTxn?.linkedSavingsGoalId) {
        if (oldTxn.type === 'transfer' || oldTxn.type === 'expense') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === oldTxn.linkedSavingsGoalId ? { ...sg, currentAmount: Math.max(0, sg.currentAmount - oldTxn.amount) } : sg
          );
        } else if (oldTxn.type === 'income') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === oldTxn.linkedSavingsGoalId ? { ...sg, currentAmount: sg.currentAmount + oldTxn.amount } : sg
          );
        }
      }
      if (action.payload.linkedSavingsGoalId) {
        if (action.payload.type === 'transfer' || action.payload.type === 'expense') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === action.payload.linkedSavingsGoalId ? { ...sg, currentAmount: sg.currentAmount + action.payload.amount } : sg
          );
        } else if (action.payload.type === 'income') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === action.payload.linkedSavingsGoalId ? { ...sg, currentAmount: Math.max(0, sg.currentAmount - action.payload.amount) } : sg
          );
        }
      }
      return newState;
    }
    case 'DELETE_TRANSACTION': {
      const txnToDelete = state.transactions.find(t => t.id === action.payload);
      const newState = {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
        ledger: (state.ledger || []).filter(l => l.transactionId !== action.payload),
      };
      if (txnToDelete?.linkedDebtId) {
        if (txnToDelete.type === 'expense') {
          newState.debts = newState.debts.map(d => 
            d.id === txnToDelete.linkedDebtId ? { ...d, balance: d.balance + txnToDelete.amount } : d
          );
        } else if (txnToDelete.type === 'income') {
          newState.debts = newState.debts.map(d => 
            d.id === txnToDelete.linkedDebtId ? { ...d, balance: Math.max(0, d.balance - txnToDelete.amount) } : d
          );
        }
      }
      if (txnToDelete?.linkedSavingsGoalId) {
        if (txnToDelete.type === 'transfer' || txnToDelete.type === 'expense') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === txnToDelete.linkedSavingsGoalId ? { ...sg, currentAmount: Math.max(0, sg.currentAmount - txnToDelete.amount) } : sg
          );
        } else if (txnToDelete.type === 'income') {
          newState.savingsGoals = newState.savingsGoals.map(sg => 
            sg.id === txnToDelete.linkedSavingsGoalId ? { ...sg, currentAmount: sg.currentAmount + txnToDelete.amount } : sg
          );
        }
      }
      if (txnToDelete?.linkedRecurringId) {
        newState.recurringTransactions = newState.recurringTransactions.map(r => {
          if (r.id !== txnToDelete.linkedRecurringId) return r;
          let paidInstallments = r.paidInstallments || 0;
          let active = r.active;
          if (r.isEmi && r.totalInstallments && paidInstallments > 0) {
            paidInstallments -= 1;
            active = true; // resume if it was completed
          }
          return { ...r, paidInstallments, active };
        });
      }
      return newState;
    }
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
        recurringTransactions: state.recurringTransactions.filter(r => r.linkedDebtId !== action.payload),
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
        recurringTransactions: state.recurringTransactions.filter(r => r.linkedSavingsGoalId !== action.payload),
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
      return { 
        ...state, 
        dashboardLayouts: action.payload.layouts,
        dashboardHiddenWidgets: action.payload.resetWidgets ? [] : state.dashboardHiddenWidgets
      };
    case 'TOGGLE_WIDGET': {
      const hidden = state.dashboardHiddenWidgets || [];
      const newHidden = hidden.includes(action.payload)
        ? hidden.filter(w => w !== action.payload)
        : [...hidden, action.payload];
      return { ...state, dashboardHiddenWidgets: newHidden };
    }
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        }
      };
    case 'ADD_REVENUE_SOURCE':
      return { ...state, revenueSources: [...(state.revenueSources || []), action.payload] };
    case 'UPDATE_REVENUE_SOURCE':
      return {
        ...state,
        revenueSources: (state.revenueSources || []).map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_REVENUE_SOURCE':
      return {
        ...state,
        revenueSources: (state.revenueSources || []).filter(r => r.id !== action.payload),
      };
    case 'ADD_SPLIT_RULE':
      return { ...state, splitRules: [...(state.splitRules || []), action.payload] };
    case 'UPDATE_SPLIT_RULE':
      return {
        ...state,
        splitRules: (state.splitRules || []).map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_SPLIT_RULE':
      return {
        ...state,
        splitRules: (state.splitRules || []).filter(r => r.id !== action.payload),
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  personalTransactions: Transaction[];
  businessTransactions: Transaction[];
  personalAccounts: Account[];
  businessAccounts: Account[];
  personalCategories: Category[];
  businessCategories: Category[];
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
  addDebt: (d: Omit<Debt, 'id'> & { id?: string }) => void;
  updateDebt: (d: Debt) => void;
  deleteDebt: (id: string) => void;
  addSavingsGoal: (sg: Omit<SavingsGoal, 'id'> & { id?: string }) => void;
  updateSavingsGoal: (sg: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  toggleTheme: () => void;
  updateDashboardLayout: (layouts: Record<string, any[]>) => void;
  toggleWidget: (id: string) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
  addRevenueSource: (r: Omit<RevenueSource, 'id'>) => void;
  updateRevenueSource: (r: RevenueSource) => void;
  deleteRevenueSource: (id: string) => void;
  addSplitRule: (s: Omit<SplitRule, 'id'>) => void;
  updateSplitRule: (s: SplitRule) => void;
  deleteSplitRule: (id: string) => void;
  exportData: () => string;
  importData: (data: string) => boolean;
  clearData: () => void;
  loadDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, DEFAULT_STATE);
  const { user } = useAuth();

  // Evaluate Achievements
  useEffect(() => {
    // We wait for initial load to finish by checking if transactions exist (or just evaluating whenever state changes)
    if (state.transactions.length === 0 && state.debts.length === 0 && state.savingsGoals.length === 0) return;
    
    QUESTS.forEach(quest => {
      if (!state.unlockedAchievements.find(a => a.id === quest.id)) {
        if (quest.evaluate(state)) {
          dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: quest.id });
          toast.success(`Achievement Unlocked: ${quest.title} ${quest.icon}`, {
            duration: 5000,
            icon: '🏆',
            style: { border: '1px solid var(--accent)', padding: '16px', background: 'var(--bg-card)', color: 'var(--text)' }
          });
        }
      }
    });
  }, [state]);

  useEffect(() => {
    async function loadData() {
      let saved = loadState();

      if (user && db) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            saved = docSnap.data().state as AppState;
            // First time login, migrate local state to cloud. Keep local categories.
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
        
        let paidInstallments = r.paidInstallments || 0;
        let active: boolean = r.active;

        while (active && nextDateObj <= todayObj) {
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
            linkedDebtId: r.linkedDebtId,
            linkedSavingsGoalId: r.linkedSavingsGoalId,
            linkedRecurringId: r.id,
          });
          
          updatedRecurring = true;
          
          if (r.isEmi && r.totalInstallments) {
            paidInstallments += 1;
            if (paidInstallments >= r.totalInstallments) {
              active = false;
            }
          }

          if (r.frequency === 'daily') nextDateObj.setDate(nextDateObj.getDate() + 1);
          else if (r.frequency === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
          else if (r.frequency === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);
          else if (r.frequency === 'yearly') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
        }
        
        return { ...r, nextDueDate: nextDateObj.toISOString().slice(0, 10), paidInstallments, active };
      });

      if (updatedRecurring) {
        saved.recurringTransactions = processedRecurring;
        saved.transactions = [...generatedTxns, ...saved.transactions];
      }

      dispatch({ type: 'LOAD_STATE', payload: saved });
    }

    loadData();
  }, [user]);

  // Cloud Sync Logic
  const initialLoadRef = React.useRef(false);
  useEffect(() => {
    saveState(state); // Always save to local storage
    
    if (initialLoadRef.current && user && db) {
      const syncToCloud = async () => {
        try {
          if (!db) return;
          const docRef = doc(db, 'users', user.uid);
          await setDoc(docRef, { state }, { merge: true });
        } catch (error) {
          console.error("Firebase sync error:", error);
        }
      };
      
      const timeoutId = setTimeout(syncToCloud, 2000);
      return () => clearTimeout(timeoutId);
    }
    
    // Mark initial load as true once state is populated
    if (state.transactions.length > 0 || state.accounts.length > 0) {
      initialLoadRef.current = true;
    }
  }, [state, user]);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          function(err) {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);
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

  const addDebt = useCallback((d: Omit<Debt, 'id'> & { id?: string }) => {
    dispatch({ type: 'ADD_DEBT', payload: { ...d, id: d.id || uid() } });
  }, []);

  const updateDebt = useCallback((d: Debt) => {
    dispatch({ type: 'UPDATE_DEBT', payload: d });
  }, []);

  const deleteDebt = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DEBT', payload: id });
  }, []);

  const addSavingsGoal = useCallback((sg: Omit<SavingsGoal, 'id'> & { id?: string }) => {
    dispatch({ type: 'ADD_SAVINGS_GOAL', payload: { ...sg, id: sg.id || uid() } });
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

  const updatePreferences = useCallback((preferences: Partial<Preferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  const addRevenueSource = useCallback((r: Omit<RevenueSource, 'id'>) => {
    dispatch({ type: 'ADD_REVENUE_SOURCE', payload: { ...r, id: uid() } });
  }, []);

  const updateRevenueSource = useCallback((r: RevenueSource) => {
    dispatch({ type: 'UPDATE_REVENUE_SOURCE', payload: r });
  }, []);

  const deleteRevenueSource = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REVENUE_SOURCE', payload: id });
  }, []);

  const addSplitRule = useCallback((s: Omit<SplitRule, 'id'>) => {
    dispatch({ type: 'ADD_SPLIT_RULE', payload: { ...s, id: uid() } });
  }, []);

  const updateSplitRule = useCallback((s: SplitRule) => {
    dispatch({ type: 'UPDATE_SPLIT_RULE', payload: s });
  }, []);

  const deleteSplitRule = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SPLIT_RULE', payload: id });
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importData = useCallback((dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      dispatch({ type: 'LOAD_STATE', payload: data });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  const clearData = useCallback(() => {
    dispatch({ type: 'LOAD_STATE', payload: DEFAULT_STATE });
  }, []);

  const loadDemoData = useCallback(() => {
    // Basic demo data loader
    const demoState = { ...DEFAULT_STATE, transactions: DEMO_TRANSACTIONS };
    dispatch({ type: 'LOAD_STATE', payload: demoState });
  }, []);

  const personalTransactions = useMemo(() => state.transactions.filter(t => !t.isBusiness), [state.transactions]);
  const businessTransactions = useMemo(() => state.transactions.filter(t => t.isBusiness), [state.transactions]);
  
  const personalAccounts = useMemo(() => state.accounts.filter(a => !a.isBusiness), [state.accounts]);
  const businessAccounts = useMemo(() => state.accounts.filter(a => a.isBusiness), [state.accounts]);

  const personalCategories = useMemo(() => state.categories.filter(c => !c.isBusiness), [state.categories]);
  const businessCategories = useMemo(() => state.categories.filter(c => c.isBusiness), [state.categories]);

  return (
    <AppContext.Provider
      value={{
        state,
        personalTransactions,
        businessTransactions,
        personalAccounts,
        businessAccounts,
        personalCategories,
        businessCategories,
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
        updatePreferences,
        addRevenueSource,
        updateRevenueSource,
        deleteRevenueSource,
        addSplitRule,
        updateSplitRule,
        deleteSplitRule,
        exportData,
        importData,
        clearData,
        loadDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
