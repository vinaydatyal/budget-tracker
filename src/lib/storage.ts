import { AppState, Category, Account } from './types';

const STORAGE_KEY = 'budget_tracker_state';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Main Checking', assetType: 'checking', incomeSource: 'salary', color: '#3b82f6' },
  { id: 'acc-2', name: 'Cash Wallet', assetType: 'cash', incomeSource: 'miscellaneous', color: '#22c55e' },
  { id: 'acc-3', name: 'Credit Card', assetType: 'credit', incomeSource: 'none', color: '#a855f7' },
  { id: 'acc-b1', name: 'Business Checking', assetType: 'checking', incomeSource: 'business', color: '#10b981', isBusiness: true },
  { id: 'acc-b2', name: 'Project 1 Fund', assetType: 'checking', incomeSource: 'business', color: '#3b82f6', isBusiness: true },
  { id: 'acc-b3', name: 'Project 2 Fund', assetType: 'checking', incomeSource: 'business', color: '#8b5cf6', isBusiness: true },
  { id: 'acc-b4', name: 'Project 3 Fund', assetType: 'checking', incomeSource: 'business', color: '#f43f5e', isBusiness: true },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Salary', color: '#22c55e', icon: '💼', type: 'income' },
  { id: 'cat-2', name: 'Business', color: '#3b82f6', icon: '💻', type: 'income' },
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
  { id: 'cat-b1', name: 'Consulting', color: '#10b981', icon: '🤝', type: 'income', isBusiness: true },
  { id: 'cat-b2', name: 'Software Subs', color: '#6366f1', icon: '☁️', type: 'expense', isBusiness: true },
  { id: 'cat-b3', name: 'Office Supplies', color: '#a855f7', icon: '🖇️', type: 'expense', isBusiness: true },
  { id: 'cat-b4', name: 'Business Travel', color: '#f43f5e', icon: '✈️', type: 'expense', isBusiness: true },
];

export const DEFAULT_PREFERENCES = {
  enableEnvelopeBudgeting: true,
  autoCoverOverspending: false,
  enableDebtSimulator: false,
  enableTaxEstimator: false,
  enableBusinessMode: true,
  hasCompletedOnboarding: false,
};

export const DEFAULT_REVENUE_SOURCES = [
  { id: 'src-1', name: 'Upwork Clients', type: 'platform', color: '#14a800' },
  { id: 'src-2', name: 'Direct Consulting', type: 'client', color: '#3b82f6' }
] as any[];

export const DEFAULT_SPLIT_RULES = [
  { 
    id: 'rule-1', 
    name: 'Standard 70/30 Split', 
    splits: [
      { targetType: 'account', targetId: 'acc-b1', percentage: 70 },
      { targetType: 'category', targetId: 'cat-b2', percentage: 30 }
    ] 
  }
] as any[];

export const DEFAULT_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  ledger: [],
  budgetGoals: [],
  recurringTransactions: [],
  debts: [],
  savingsGoals: [
    { id: 'sg-b1', name: 'Business Emergency Fund', targetAmount: 10000, currentAmount: 0, color: '#f59e0b', isBusiness: true }
  ],
  revenueSources: DEFAULT_REVENUE_SOURCES,
  splitRules: DEFAULT_SPLIT_RULES,
  unlockedAchievements: [],
  theme: 'dark',
  taxRate: 20, // Default 20% estimated tax
  currency: 'USD',
  preferences: DEFAULT_PREFERENCES,
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
    } else {
      // Inject missing business accounts if user has none
      const hasBusinessAccounts = parsed.accounts.some(a => a.isBusiness);
      if (!hasBusinessAccounts) {
        const businessDefaults = DEFAULT_ACCOUNTS.filter(a => a.isBusiness);
        parsed.accounts = [...parsed.accounts, ...businessDefaults];
      }
    }
    
    // Inject missing business savings goals if user has none
    if (!parsed.savingsGoals) parsed.savingsGoals = [];
    const hasBusinessGoals = parsed.savingsGoals.some(g => g.isBusiness);
    if (!hasBusinessGoals) {
      parsed.savingsGoals.push({ id: 'sg-b1', name: 'Business Emergency Fund', targetAmount: 10000, currentAmount: 0, color: '#f59e0b', isBusiness: true });
    }

    if (!parsed.recurringTransactions) parsed.recurringTransactions = [];
    if (!parsed.ledger) parsed.ledger = [];
    if (!parsed.unlockedAchievements) parsed.unlockedAchievements = [];
    if (!parsed.revenueSources) parsed.revenueSources = [];
    if (!parsed.splitRules) parsed.splitRules = [];
    if (!parsed.debts) parsed.debts = [];
    if (!parsed.budgetGoals) parsed.budgetGoals = [];
    if (!parsed.transactions) parsed.transactions = [];

    if (parsed.taxRate === undefined) parsed.taxRate = 20;
    if (!parsed.preferences) parsed.preferences = DEFAULT_PREFERENCES;

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
