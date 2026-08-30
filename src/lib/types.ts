export type TransactionType = 'income' | 'expense' | 'transfer';
export type AssetType = 'checking' | 'savings' | 'credit' | 'cash' | 'gold' | 'crypto' | 'real_estate' | 'stocks' | 'other';
export type IncomeSource = 'salary' | 'real_estate' | 'stocks' | 'business' | 'miscellaneous' | 'none';

export interface Account {
  id: string;
  name: string;
  assetType: AssetType;
  incomeSource: IncomeSource;
  color: string;
  isBusiness?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: TransactionType | 'both';
  parentId?: string;
  monthlyBudget?: number;
  budgetRollover?: boolean;
  isBusiness?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // Only used for transfers
  payee?: string;       // Optional merchant/payee name
  tags?: string[];
  splitCategoryIds?: string[];
  splitAmounts?: number[];
  splitWith?: { name: string; amount: number; settledAmount?: number; settled: boolean }[];
  receiptUrl?: string;
  receiptNotes?: string;
  businessData?: {
    clientName: string;
    projectName: string;
    monthName: string;
  };
  description: string;
  date: string; // ISO string
  notes?: string;
  isBusiness?: boolean;
  linkedDebtId?: string;
  linkedSavingsGoalId?: string;
  linkedRecurringId?: string;
  revenueSourceId?: string;
  appliedSplitRuleId?: string;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  taxAmount?: number;
  taxRate?: number;
}

export interface BudgetGoal {
  id: string;
  categoryId: string;
  monthlyLimit: number; // For spend type
  month: string; // YYYY-MM
  rollover?: boolean;
  goalType?: 'spend' | 'save'; // 'spend' = restrict spending, 'save' = target savings amount
  targetAmount?: number; // For save type
  savedAmount?: number; // For save type
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  payee?: string;
  tags?: string[];

  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string; // ISO string (YYYY-MM-DD)
  active: boolean;
  isEmi?: boolean;
  totalInstallments?: number;
  paidInstallments?: number;
  linkedDebtId?: string;
  linkedSavingsGoalId?: string;
  isBusiness?: boolean;
}

export interface Debt {
  id: string;
  name: string;
  type: 'loan' | 'credit_card' | 'mortgage' | 'other';
  balance: number;
  interestRate: number;
  dueDate: string; // ISO string (YYYY-MM-DD)
  minimumPayment: number;
  isBusiness?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO string (YYYY-MM-DD)
  color?: string;
  isBusiness?: boolean;
}

export interface UnlockedAchievement {
  id: string; // The ID of the quest (e.g., 'first_log', 'debt_slayer')
  unlockedAt: string; // ISO string
}

export interface Preferences {
  enableEnvelopeBudgeting: boolean;
  autoCoverOverspending: boolean;
  enableDebtSimulator: boolean;
  enableTaxEstimator: boolean;
  enableBusinessMode: boolean;
  hasCompletedOnboarding?: boolean;
}

export interface RevenueSource {
  id: string;
  name: string;
  type: 'client' | 'platform' | 'product' | 'other';
  color: string;
  notes?: string;
}

export interface SplitRule {
  id: string;
  name: string;
  splits: {
    targetId: string;
    targetType: 'account' | 'category';
    percentage: number;
  }[];
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string; // the specific general ledger account (e.g. Asset, Liability, Revenue, Expense)
  debit: number;
  credit: number;
  date: string;
  description: string;
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  ledger: LedgerEntry[];
  budgetGoals: BudgetGoal[];
  recurringTransactions: RecurringTransaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  revenueSources: RevenueSource[];
  splitRules: SplitRule[];
  unlockedAchievements: UnlockedAchievement[];
  theme: 'dark' | 'light';
  taxRate: number;
  currency: string;
  dashboardLayouts?: Record<string, any[]>;
  dashboardHiddenWidgets?: string[];
  preferences: Preferences;
}

export type AppAction =
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_TRANSACTIONS_BULK'; payload: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_BUDGET_GOAL'; payload: BudgetGoal }
  | { type: 'UPDATE_BUDGET_GOAL'; payload: BudgetGoal }
  | { type: 'DELETE_BUDGET_GOAL'; payload: string }
  | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
  | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
  | { type: 'DELETE_RECURRING'; payload: string }
  | { type: 'MARK_RECURRING_PAID'; payload: { recurringId: string, transactionId: string, newDueDate: string } }
  | { type: 'ADD_DEBT'; payload: Debt }
  | { type: 'UPDATE_DEBT'; payload: Debt }
  | { type: 'DELETE_DEBT'; payload: string }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'IMPORT_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'UPDATE_DASHBOARD_LAYOUT'; payload: { layouts: Record<string, any[]>, resetWidgets?: boolean } }
  | { type: 'TOGGLE_WIDGET'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'ADD_REVENUE_SOURCE'; payload: RevenueSource }
  | { type: 'UPDATE_REVENUE_SOURCE'; payload: RevenueSource }
  | { type: 'DELETE_REVENUE_SOURCE'; payload: string }
  | { type: 'ADD_SPLIT_RULE'; payload: SplitRule }
  | { type: 'UPDATE_SPLIT_RULE'; payload: SplitRule }
  | { type: 'DELETE_SPLIT_RULE'; payload: string }
  | { type: 'LOAD_STATE'; payload: AppState };
