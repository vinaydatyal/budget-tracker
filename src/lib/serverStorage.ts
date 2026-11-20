import fs from 'fs';
import path from 'path';
import { AppState, Transaction, Account, Category, BudgetGoal, RecurringTransaction, Debt, SavingsGoal, LedgerEntry } from './types';
import { DEFAULT_STATE, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './storage';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function getDataFilePath(): string {
  if (process.env.BUDGET_DATA_PATH) {
    return path.resolve(process.env.BUDGET_DATA_PATH);
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'app_state.json');
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

function sanitizeState(parsed: any): AppState {
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
}

export async function readServerState(): Promise<AppState> {
  // 1. Primary Cloud Persistence: Cloud Firestore shared vault
  if (db) {
    try {
      const docRef = doc(db, 'shared', 'budget_app_state');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.state && Array.isArray(data.state.transactions)) {
          return sanitizeState(data.state);
        }
      }
    } catch (err) {
      console.warn('[ServerStorage] Cloud Firestore read error:', err);
    }
  }

  // 2. Secondary: Redis / Upstash KV
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl.replace(/\/$/, '')}/get/budget_app_state`, {
        headers: { Authorization: `Bearer ${kvToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          return sanitizeState(parsed);
        }
      }
    } catch (err) {
      console.warn('KV read error, falling back to disk:', err);
    }
  }

  // 3. Fallback: local or ephemeral /tmp file
  const filePath = getDataFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_STATE };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return { ...DEFAULT_STATE };
    }
    return sanitizeState(JSON.parse(raw));
  } catch (err) {
    console.error('Error reading server state:', err);
    return { ...DEFAULT_STATE };
  }
}

export async function writeServerState(state: AppState, allowEmpty: boolean = false): Promise<void> {
  // Safety guard: If incoming state has 0 transactions and allowEmpty is false, verify existing storage first.
  // NEVER allow an unintentional blank background sync to overwrite an existing populated dataset!
  // Legitimate deletions or explicit reset requests (allowEmpty = true) are permitted.
  if (!allowEmpty && (!state.transactions || state.transactions.length === 0)) {
    try {
      const current = await readServerState();
      if (current.transactions && current.transactions.length > 0) {
        console.warn(`[ServerStorage] Blocked write: incoming state has 0 transactions while storage holds ${current.transactions.length} rows.`);
        return;
      }
    } catch {}
  }

  // 1. Primary Cloud Persistence: Cloud Firestore shared vault
  if (db) {
    try {
      const docRef = doc(db, 'shared', 'budget_app_state');
      await setDoc(docRef, {
        state,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.warn('[ServerStorage] Cloud Firestore write error:', err);
    }
  }

  // 2. Secondary: Redis / Upstash KV
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl.replace(/\/$/, '')}/set/budget_app_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      });
    } catch (err) {
      console.warn('KV write error, falling back to disk:', err);
    }
  }

  // 3. Fallback: local or ephemeral /tmp file
  try {
    const filePath = getDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error('Error writing server state to file:', err);
  }
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
