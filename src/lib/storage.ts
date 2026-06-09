import { AppState, Category, Account } from './types';

const STORAGE_KEY = 'budget_tracker_state';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Main Checking', assetType: 'checking', incomeSource: 'salary', color: '#3b82f6' },
  { id: 'acc-2', name: 'Cash Wallet', assetType: 'cash', incomeSource: 'miscellaneous', color: '#22c55e' },
  { id: 'acc-3', name: 'Credit Card', assetType: 'credit', incomeSource: 'none', color: '#a855f7' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Salary', color: '#22c55e', icon: '💼', type: 'income' },
  { id: 'cat-2', name: 'Freelance', color: '#3b82f6', icon: '💻', type: 'income' },
  { id: 'cat-3', name: 'Investments', color: '#a855f7', icon: '📈', type: 'income' },
  { id: 'cat-4', name: 'Food & Dining', color: '#f97316', icon: '🍔', type: 'expense' },
  { id: 'cat-4a', name: 'Groceries', color: '#f97316', icon: '🛒', type: 'expense', parentId: 'cat-4' },
  { id: 'cat-4b', name: 'Restaurants', color: '#f97316', icon: '🍽️', type: 'expense', parentId: 'cat-4' },
  { id: 'cat-5', name: 'Housing', color: '#ef4444', icon: '🏠', type: 'expense' },
  { id: 'cat-5a', name: 'Rent', color: '#ef4444', icon: '🏢', type: 'expense', parentId: 'cat-5' },
  { id: 'cat-5b', name: 'Maintenance', color: '#ef4444', icon: '🔧', type: 'expense', parentId: 'cat-5' },
  { id: 'cat-6', name: 'Transport', color: '#eab308', icon: '🚗', type: 'expense' },
  { id: 'cat-7', name: 'Shopping', color: '#ec4899', icon: '🛍️', type: 'expense' },
  { id: 'cat-8', name: 'Healthcare', color: '#14b8a6', icon: '🏥', type: 'expense' },
  { id: 'cat-9', name: 'Entertainment', color: '#8b5cf6', icon: '🎮', type: 'expense' },
  { id: 'cat-10', name: 'Utilities', color: '#06b6d4', icon: '💡', type: 'expense' },
  { id: 'cat-11', name: 'Education', color: '#f59e0b', icon: '📚', type: 'expense' },
  { id: 'cat-12', name: 'Other', color: '#6b7280', icon: '📦', type: 'both' },
];

export const DEFAULT_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  budgetGoals: [],
  recurringTransactions: [],
  debts: [],
  savingsGoals: [],
  theme: 'dark',
  taxRate: 20, // Default 20% estimated tax
  currency: 'USD',
};

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    
    // Backwards compatibility for existing transactions missing accountId
    if (parsed.transactions) {
      parsed.transactions = parsed.transactions.map(t => ({
        ...t,
        accountId: t.accountId || 'acc-1'
      }));
    }
    
    // Backwards compatibility for existing state missing accounts array
    if (!parsed.accounts || parsed.accounts.length === 0) {
      parsed.accounts = DEFAULT_ACCOUNTS;
    }

    if (!parsed.recurringTransactions) {
      parsed.recurringTransactions = [];
    }

    if (parsed.taxRate === undefined) parsed.taxRate = 20;

    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error('Failed to save state to localStorage');
  }
}
