import fs from 'fs';
import path from 'path';
import { AppState, Transaction, Account, Category, BudgetGoal, RecurringTransaction, Debt, SavingsGoal, LedgerEntry } from './types';
import { DEFAULT_STATE, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './storage';

export function getDataFilePath(): string {
  if (process.env.BUDGET_DATA_PATH) {
    return path.resolve(process.env.BUDGET_DATA_PATH);
  }
  return path.join(process.cwd(), 'data', 'app_state.json');
}

export function generateLedgerEntries(txn: Transaction, accounts: Account[]): LedgerEntry[] {
  if (!txn.isBusiness) return [];
  
  const account = accounts.find(a => a.id === txn.accountId);
  const isExpenseAccount = account?.isExpenseAccount;
  const toAccount = txn.toAccountId ? accounts.find(a => a.id === txn.toAccountId) : null;
  const isToExpenseAccount = toAccount?.isExpenseAccount;
  
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
      add('1', 'Asset', amount, 0);
      add('2', 'Liability', 0, amount);
    } else {
      add('1', 'Asset', amount, 0);
      add('2', 'Revenue', 0, netAmount);
      if (tax > 0) add('3', 'Liability', 0, tax);
    }
  } else if (txn.type === 'expense') {
    if (txn.linkedDebtId) {
      add('1', 'Liability', amount, 0);
      add('2', 'Asset', 0, amount);
    } else if (!txn.linkedSavingsGoalId) {
      if (isExpenseAccount) {
        add('1', 'Asset', netAmount, 0);
        add('2', 'Expense', 0, amount);
      } else {
        add('1', 'Expense', netAmount, 0);
        add('2', 'Asset', 0, amount);
      }
      if (tax > 0) add('3', 'Liability', tax, 0);
    }
  } else if (txn.type === 'transfer') {
    if (isExpenseAccount && !isToExpenseAccount) {
      add('1', 'Asset', amount, 0);
      add('2', 'Expense', 0, amount);
    } else if (!isExpenseAccount && isToExpenseAccount) {
      add('1', 'Expense', amount, 0);
      add('2', 'Asset', 0, amount);
    }
  }

  return entries;
}

export function readServerState(): AppState {
  const filePath = getDataFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_STATE };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      transactions: parsed.transactions || [],
      categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
      accounts: parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : DEFAULT_ACCOUNTS,
      ledger: parsed.ledger || [],
      budgetGoals: parsed.budgetGoals || [],
      recurringTransactions: parsed.recurringTransactions || [],
      debts: parsed.debts || [],
      savingsGoals: parsed.savingsGoals || [],
      revenueSources: parsed.revenueSources || [],
      splitRules: parsed.splitRules || [],
      unlockedAchievements: parsed.unlockedAchievements || []
    };
  } catch (err) {
    console.error('Error reading server state:', err);
    return { ...DEFAULT_STATE };
  }
}

export function writeServerState(state: AppState): void {
  const filePath = getDataFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

export function resolveAccount(accounts: Account[], accountQuery?: string): Account {
  if (!accountQuery || !accountQuery.trim()) {
    return accounts[0] || DEFAULT_ACCOUNTS[0];
  }
  const q = accountQuery.trim().toLowerCase();
  const found = accounts.find(a => a.id.toLowerCase() === q || a.name.toLowerCase() === q);
  if (found) return found;
  
  // Partial substring match
  const partial = accounts.find(a => a.name.toLowerCase().includes(q));
  return partial || accounts[0] || DEFAULT_ACCOUNTS[0];
}

export function resolveCategory(categories: Category[], categoryQuery?: string, type?: string): Category {
  if (!categoryQuery || !categoryQuery.trim()) {
    const fallback = categories.find(c => c.name.toLowerCase() === 'other') || categories[0] || DEFAULT_CATEGORIES[0];
    return fallback;
  }
  const q = categoryQuery.trim().toLowerCase();
  const found = categories.find(c => c.id.toLowerCase() === q || c.name.toLowerCase() === q);
  if (found) return found;

  // Substring match
  const partial = categories.find(c => c.name.toLowerCase().includes(q));
  if (partial) return partial;

  // Match by type
  if (type) {
    const byType = categories.find(c => c.type === type);
    if (byType) return byType;
  }

  return categories.find(c => c.name.toLowerCase() === 'other') || categories[0] || DEFAULT_CATEGORIES[0];
}
