#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to data file
const DATA_FILE = process.env.BUDGET_DATA_PATH 
  ? path.resolve(process.env.BUDGET_DATA_PATH)
  : path.resolve(__dirname, '../data/app_state.json');

const DEFAULT_ACCOUNTS = [
  { id: 'acc-1', name: 'Main Checking', assetType: 'checking', incomeSource: 'salary', color: '#3b82f6' },
  { id: 'acc-2', name: 'Cash Wallet', assetType: 'cash', incomeSource: 'miscellaneous', color: '#22c55e' },
  { id: 'acc-3', name: 'Credit Card', assetType: 'credit', incomeSource: 'none', color: '#a855f7' },
  { id: 'acc-b1', name: 'Business Checking', assetType: 'checking', incomeSource: 'business', color: '#10b981', isBusiness: true },
  { id: 'acc-b2', name: 'Project 1 Fund', assetType: 'checking', incomeSource: 'business', color: '#3b82f6', isBusiness: true },
  { id: 'acc-b3', name: 'Project 2 Fund', assetType: 'checking', incomeSource: 'business', color: '#8b5cf6', isBusiness: true },
  { id: 'acc-b4', name: 'Project 3 Fund', assetType: 'checking', incomeSource: 'business', color: '#f43f5e', isBusiness: true }
];

const DEFAULT_CATEGORIES = [
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
  { id: 'cat-b4', name: 'Business Travel', color: '#f43f5e', icon: '✈️', type: 'expense', isBusiness: true }
];

const DEFAULT_STATE = {
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
  revenueSources: [],
  splitRules: [],
  unlockedAchievements: [],
  theme: 'dark',
  taxRate: 20,
  currency: 'INR',
  preferences: {
    enableEnvelopeBudgeting: true,
    autoCoverOverspending: false,
    enableDebtSimulator: false,
    enableTaxEstimator: false,
    enableBusinessMode: true,
    hasCompletedOnboarding: true
  }
};

const APP_URL = (process.env.BUDGET_APP_URL || 'https://budget-tracker-enterprise.vercel.app').replace(/\/$/, '');

function sanitizeState(parsed) {
  return {
    ...DEFAULT_STATE,
    ...parsed,
    transactions: parsed.transactions || [],
    accounts: parsed.accounts?.length ? parsed.accounts : DEFAULT_ACCOUNTS,
    categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
    budgetGoals: parsed.budgetGoals || [],
    recurringTransactions: parsed.recurringTransactions || [],
    debts: parsed.debts || [],
    savingsGoals: parsed.savingsGoals || [],
    ledger: parsed.ledger || []
  };
}

function readLocalState() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      writeLocalState(DEFAULT_STATE);
      return { ...DEFAULT_STATE };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) {
      writeLocalState(DEFAULT_STATE);
      return { ...DEFAULT_STATE };
    }
    return sanitizeState(JSON.parse(raw));
  } catch (err) {
    return { ...DEFAULT_STATE };
  }
}

function writeLocalState(state) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const temp = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(temp, DATA_FILE);
  } catch (err) {
    console.error('Failed to write local state:', err);
  }
}

async function readState() {
  const localState = readLocalState();
  if (APP_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${APP_URL}/api/sync`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          const serverState = data.state;
          const localTxnIds = new Set((localState.transactions || []).map(t => t.id));
          const serverTxns = serverState.transactions || [];
          const mergedTxns = [...(localState.transactions || [])];

          serverTxns.forEach(t => {
            if (!localTxnIds.has(t.id)) {
              mergedTxns.push(t);
              localTxnIds.add(t.id);
            }
          });

          // Non-destructive union merge for accounts
          const mergedAccounts = [...(localState.accounts || [])];
          const accKey = (a) => `${a.id || ''}:${(a.name || '').trim().toLowerCase()}`;
          const seenAccounts = new Set(mergedAccounts.map(accKey));
          (serverState.accounts || []).forEach(a => {
            const k = accKey(a);
            if (!seenAccounts.has(k)) {
              mergedAccounts.push(a);
              seenAccounts.add(k);
            }
          });

          // Non-destructive union merge for categories
          const mergedCategories = [...(localState.categories || [])];
          const catKey = (c) => `${c.id || ''}:${(c.name || '').trim().toLowerCase()}`;
          const seenCategories = new Set(mergedCategories.map(catKey));
          (serverState.categories || []).forEach(c => {
            const k = catKey(c);
            if (!seenCategories.has(k)) {
              mergedCategories.push(c);
              seenCategories.add(k);
            }
          });

          // Non-destructive union merge for budgets
          const mergedBudgets = [...(localState.budgetGoals || [])];
          const seenBudgets = new Set(mergedBudgets.map(b => b.id));
          (serverState.budgetGoals || []).forEach(b => {
            if (!seenBudgets.has(b.id)) {
              mergedBudgets.push(b);
              seenBudgets.add(b.id);
            }
          });

          // Non-destructive union merge for recurring
          const mergedRecurring = [...(localState.recurringTransactions || [])];
          const seenRecurring = new Set(mergedRecurring.map(r => r.id));
          (serverState.recurringTransactions || []).forEach(r => {
            if (!seenRecurring.has(r.id)) {
              mergedRecurring.push(r);
              seenRecurring.add(r.id);
            }
          });

          const mergedState = {
            ...DEFAULT_STATE,
            ...localState,
            ...serverState,
            transactions: mergedTxns,
            accounts: mergedAccounts.length ? mergedAccounts : DEFAULT_ACCOUNTS,
            categories: mergedCategories.length ? mergedCategories : DEFAULT_CATEGORIES,
            budgetGoals: mergedBudgets,
            recurringTransactions: mergedRecurring,
            debts: (serverState.debts?.length ? serverState.debts : localState.debts) || [],
            savingsGoals: (serverState.savingsGoals?.length ? serverState.savingsGoals : localState.savingsGoals) || [],
          };

          writeLocalState(mergedState);
          return sanitizeState(mergedState);
        }
      }
    } catch (err) {
      // Fall back to local file
    }
  }
  return localState;
}

async function writeState(state) {
  writeLocalState(state);
  if (APP_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch(`${APP_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ state, merge: true })
      });
      clearTimeout(timeoutId);
    } catch (err) {
      // Offline fallback
    }
  }
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveAccount(accounts, query) {
  if (!query || !query.trim()) return accounts[0] || DEFAULT_ACCOUNTS[0];
  const q = query.trim().toLowerCase();
  const direct = accounts.find(a => a.id.toLowerCase() === q || a.name.toLowerCase() === q);
  if (direct) return direct;
  const partial = accounts.find(a => a.name.toLowerCase().includes(q));
  return partial || accounts[0] || DEFAULT_ACCOUNTS[0];
}

function resolveCategory(categories, query, type = 'expense') {
  if (!query || !query.trim()) {
    const fallback = categories.find(c => c.name.toLowerCase() === 'other') || categories[0] || DEFAULT_CATEGORIES[0];
    return fallback;
  }
  const q = query.trim().toLowerCase();
  const direct = categories.find(c => c.id.toLowerCase() === q || c.name.toLowerCase() === q);
  if (direct) return direct;
  const partial = categories.find(c => c.name.toLowerCase().includes(q));
  if (partial) return partial;
  if (type) {
    const byType = categories.find(c => c.type === type || c.type === 'both');
    if (byType) return byType;
  }
  return categories.find(c => c.name.toLowerCase() === 'other') || categories[0] || DEFAULT_CATEGORIES[0];
}

function calculateAccountBalances(state) {
  const map = {};
  state.accounts.forEach(a => {
    map[a.id] = { ...a, balance: 0, income: 0, expense: 0 };
  });

  state.transactions.forEach(t => {
    if (map[t.accountId]) {
      if (t.type === 'income') {
        map[t.accountId].balance += t.amount;
        map[t.accountId].income += t.amount;
      } else if (t.type === 'expense') {
        map[t.accountId].balance -= t.amount;
        map[t.accountId].expense += t.amount;
      } else if (t.type === 'transfer') {
        map[t.accountId].balance -= t.amount;
      }
    }
    if (t.type === 'transfer' && t.toAccountId && map[t.toAccountId]) {
      map[t.toAccountId].balance += t.amount;
    }
  });

  return Object.values(map);
}

function generateLedgerEntries(txn, accounts) {
  if (!txn.isBusiness) return [];
  const account = accounts.find(a => a.id === txn.accountId);
  const isExpenseAccount = account?.isExpenseAccount;
  const toAccount = txn.toAccountId ? accounts.find(a => a.id === txn.toAccountId) : null;
  const isToExpenseAccount = toAccount?.isExpenseAccount;
  const entries = [];
  const baseId = `ledg-${txn.id}`;
  const add = (idSuffix, accId, debit, credit) => {
    if (debit > 0 || credit > 0) {
      entries.push({
        id: `${baseId}-${idSuffix}`,
        transactionId: txn.id,
        accountId: accId,
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

function formatMoney(amount, currency = 'INR') {
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  return `${sym}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Initialize MCP Server
const server = new McpServer({
  name: 'budget-tracker',
  version: '1.0.0'
});

// -------------------------------------------------------------
// 1. ADD TRANSACTION
// -------------------------------------------------------------
server.tool(
  'add_transaction',
  'Add a single financial transaction (expense, income, or transfer) to the budget tracker.',
  {
    amount: z.number().positive().describe('The transaction amount (e.g. 500, 1250.50)'),
    type: z.enum(['expense', 'income', 'transfer']).default('expense').describe('Type of transaction: expense, income, or transfer'),
    description: z.string().describe('Description or note of the transaction (e.g. "Dinner at Barbeque Nation", "Consulting invoice #102")'),
    category: z.string().optional().describe('Category name or ID (e.g. "Food & Dining", "Groceries", "Salary", "Transport")'),
    account: z.string().optional().describe('Source account name or ID (e.g. "Main Checking", "Credit Card", "Cash Wallet")'),
    toAccount: z.string().optional().describe('Destination account name or ID (required if type is transfer)'),
    date: z.string().optional().describe('Date in YYYY-MM-DD or ISO string format (defaults to today)'),
    payee: z.string().optional().describe('Merchant or recipient name (e.g. "Swiggy", "Amazon", "Client Name")'),
    notes: z.string().optional().describe('Additional notes or reference details'),
    tags: z.array(z.string()).optional().describe('Optional tags for filtering (e.g. ["travel", "tax-deductible"])'),
    isBusiness: z.boolean().optional().describe('Whether this is a business/freelance transaction')
  },
  async (args) => {
    const state = await readState();
    const account = resolveAccount(state.accounts, args.account);
    const toAccount = args.toAccount ? resolveAccount(state.accounts, args.toAccount) : undefined;
    const category = resolveCategory(state.categories, args.category, args.type);

    let dateStr = new Date().toISOString();
    if (args.date) {
      const d = new Date(args.date);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString();
      }
    }

    const txn = {
      id: uid('txn'),
      type: args.type,
      amount: args.amount,
      accountId: account.id,
      toAccountId: toAccount?.id,
      categoryId: category.id,
      description: args.description,
      date: dateStr,
      payee: args.payee,
      notes: args.notes,
      tags: args.tags || [],
      isBusiness: args.isBusiness ?? account.isBusiness ?? false
    };

    state.transactions.unshift(txn);

    // Ledger entries if business
    if (txn.isBusiness) {
      const newEntries = generateLedgerEntries(txn, state.accounts);
      state.ledger = [...(state.ledger || []), ...newEntries];
    }

    await writeState(state);

    const balances = calculateAccountBalances(state);
    const updatedAcc = balances.find(a => a.id === account.id);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added ${args.type.toUpperCase()} of ${formatMoney(args.amount, state.currency)}: "${args.description}"\n` +
                `• Category: ${category.name} ${category.icon || ''}\n` +
                `• Account: ${account.name} (New balance: ${formatMoney(updatedAcc?.balance || 0, state.currency)})\n` +
                (toAccount ? `• Destination Account: ${toAccount.name}\n` : '') +
                `• Date: ${dateStr.slice(0, 10)}\n` +
                `• ID: ${txn.id}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 2. ADD TRANSACTIONS BULK
// -------------------------------------------------------------
server.tool(
  'add_transactions_bulk',
  'Add multiple transactions in a single batch (e.g. from bank statements, SMS logs, or expense lists).',
  {
    transactions: z.array(
      z.object({
        amount: z.number().positive(),
        type: z.enum(['expense', 'income', 'transfer']).default('expense'),
        description: z.string(),
        category: z.string().optional(),
        account: z.string().optional(),
        toAccount: z.string().optional(),
        date: z.string().optional(),
        payee: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isBusiness: z.boolean().optional()
      })
    ).describe('List of transactions to add')
  },
  async ({ transactions }) => {
    if (!transactions.length) {
      return { content: [{ type: 'text', text: 'No transactions provided.' }] };
    }

    const state = await readState();
    let totalIncome = 0;
    let totalExpense = 0;
    const addedList = [];

    for (const item of transactions) {
      const account = resolveAccount(state.accounts, item.account);
      const toAccount = item.toAccount ? resolveAccount(state.accounts, item.toAccount) : undefined;
      const category = resolveCategory(state.categories, item.category, item.type);

      let dateStr = new Date().toISOString();
      if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) dateStr = d.toISOString();
      }

      const txn = {
        id: uid('txn'),
        type: item.type,
        amount: item.amount,
        accountId: account.id,
        toAccountId: toAccount?.id,
        categoryId: category.id,
        description: item.description,
        date: dateStr,
        payee: item.payee,
        notes: item.notes,
        tags: item.tags || [],
        isBusiness: item.isBusiness ?? account.isBusiness ?? false
      };

      if (item.type === 'income') totalIncome += item.amount;
      if (item.type === 'expense') totalExpense += item.amount;

      state.transactions.unshift(txn);
      if (txn.isBusiness) {
        const newEntries = generateLedgerEntries(txn, state.accounts);
        state.ledger = [...(state.ledger || []), ...newEntries];
      }

      addedList.push(`${dateStr.slice(0, 10)} | ${item.type.toUpperCase()} | ${formatMoney(item.amount, state.currency)} | ${item.description} (${category.name})`);
    }

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully added ${transactions.length} transaction(s) in bulk!\n` +
                `• Total Income Added: ${formatMoney(totalIncome, state.currency)}\n` +
                `• Total Expenses Added: ${formatMoney(totalExpense, state.currency)}\n\n` +
                `Summary of imported transactions:\n` +
                addedList.slice(0, 20).map(l => `• ${l}`).join('\n') +
                (addedList.length > 20 ? `\n• ...and ${addedList.length - 20} more.` : '')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 3. GET TRANSACTIONS
// -------------------------------------------------------------
server.tool(
  'get_transactions',
  'Query and filter transactions from the budget tracker.',
  {
    limit: z.number().optional().default(30).describe('Max number of transactions to return (default 30)'),
    startDate: z.string().optional().describe('Filter transactions on or after this date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('Filter transactions on or before this date (YYYY-MM-DD)'),
    type: z.enum(['expense', 'income', 'transfer', 'all']).optional().default('all'),
    account: z.string().optional().describe('Filter by account name or ID'),
    category: z.string().optional().describe('Filter by category name or ID'),
    search: z.string().optional().describe('Keyword search in description, payee, or notes'),
    isBusiness: z.boolean().optional().describe('Filter by personal vs business')
  },
  async (args) => {
    const state = await readState();
    let txns = [...state.transactions];

    if (args.type && args.type !== 'all') {
      txns = txns.filter(t => t.type === args.type);
    }
    if (args.startDate) {
      const s = new Date(args.startDate).getTime();
      txns = txns.filter(t => new Date(t.date).getTime() >= s);
    }
    if (args.endDate) {
      const e = new Date(args.endDate + 'T23:59:59.999Z').getTime();
      txns = txns.filter(t => new Date(t.date).getTime() <= e);
    }
    if (args.account) {
      const acc = resolveAccount(state.accounts, args.account);
      txns = txns.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
    }
    if (args.category) {
      const cat = resolveCategory(state.categories, args.category);
      txns = txns.filter(t => t.categoryId === cat.id);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      txns = txns.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.payee && t.payee.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }
    if (args.isBusiness !== undefined) {
      txns = txns.filter(t => !!t.isBusiness === args.isBusiness);
    }

    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sliced = txns.slice(0, args.limit);

    const accMap = Object.fromEntries(state.accounts.map(a => [a.id, a.name]));
    const catMap = Object.fromEntries(state.categories.map(c => [c.id, `${c.name} ${c.icon || ''}`]));

    const formatted = sliced.map(t => {
      const dt = t.date.slice(0, 10);
      const acc = accMap[t.accountId] || 'Unknown Account';
      const cat = catMap[t.categoryId] || 'Other';
      return `• [${dt}] ${t.type.toUpperCase()}: ${formatMoney(t.amount, state.currency)} | "${t.description}" | Category: ${cat} | Account: ${acc} (ID: ${t.id})`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `Found ${txns.length} matching transaction(s) (showing ${sliced.length}):\n\n` +
                (formatted.length ? formatted.join('\n') : 'No transactions found matching your criteria.')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 4. UPDATE TRANSACTION
// -------------------------------------------------------------
server.tool(
  'update_transaction',
  'Update details of an existing transaction by ID.',
  {
    id: z.string().describe('The transaction ID to update'),
    amount: z.number().positive().optional(),
    description: z.string().optional(),
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    category: z.string().optional(),
    account: z.string().optional(),
    toAccount: z.string().optional(),
    date: z.string().optional(),
    payee: z.string().optional(),
    notes: z.string().optional(),
    isBusiness: z.boolean().optional()
  },
  async ({ id, ...updates }) => {
    const state = await readState();
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx === -1) {
      return { content: [{ type: 'text', text: `❌ Transaction with ID "${id}" was not found.` }] };
    }

    const current = state.transactions[idx];
    if (updates.amount !== undefined) current.amount = updates.amount;
    if (updates.description !== undefined) current.description = updates.description;
    if (updates.type !== undefined) current.type = updates.type;
    if (updates.payee !== undefined) current.payee = updates.payee;
    if (updates.notes !== undefined) current.notes = updates.notes;
    if (updates.isBusiness !== undefined) current.isBusiness = updates.isBusiness;
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      if (!isNaN(d.getTime())) current.date = d.toISOString();
    }
    if (updates.account !== undefined) {
      current.accountId = resolveAccount(state.accounts, updates.account).id;
    }
    if (updates.toAccount !== undefined) {
      current.toAccountId = resolveAccount(state.accounts, updates.toAccount).id;
    }
    if (updates.category !== undefined) {
      current.categoryId = resolveCategory(state.categories, updates.category, current.type).id;
    }

    state.transactions[idx] = current;
    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated transaction ${id}:\n` +
                `• Description: "${current.description}"\n` +
                `• Amount: ${formatMoney(current.amount, state.currency)}\n` +
                `• Type: ${current.type}\n` +
                `• Date: ${current.date.slice(0, 10)}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 5. DELETE TRANSACTION
// -------------------------------------------------------------
server.tool(
  'delete_transaction',
  'Delete a transaction by ID (automatically rolls back any linked debts or savings goal adjustments).',
  {
    id: z.string().describe('The transaction ID to delete')
  },
  async ({ id }) => {
    const state = await readState();
    const txn = state.transactions.find(t => t.id === id);
    if (!txn) {
      return { content: [{ type: 'text', text: `❌ Transaction with ID "${id}" not found.` }] };
    }

    // Rollback linked debt
    if (txn.linkedDebtId) {
      state.debts = state.debts.map(d => {
        if (d.id !== txn.linkedDebtId) return d;
        return {
          ...d,
          balance: txn.type === 'expense' ? d.balance + txn.amount : Math.max(0, d.balance - txn.amount)
        };
      });
    }

    // Rollback linked savings goal
    if (txn.linkedSavingsGoalId) {
      state.savingsGoals = state.savingsGoals.map(sg => {
        if (sg.id !== txn.linkedSavingsGoalId) return sg;
        return {
          ...sg,
          currentAmount: txn.type === 'income' ? sg.currentAmount + txn.amount : Math.max(0, sg.currentAmount - txn.amount)
        };
      });
    }

    state.transactions = state.transactions.filter(t => t.id !== id);
    state.ledger = (state.ledger || []).filter(l => l.transactionId !== id);

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Deleted transaction "${txn.description}" (${formatMoney(txn.amount, state.currency)}).`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 6. LIST ACCOUNTS
// -------------------------------------------------------------
server.tool(
  'list_accounts',
  'List all financial accounts and assets with their current calculated balances.',
  {},
  async () => {
    const state = await readState();
    const balances = calculateAccountBalances(state);

    let totalLiquid = 0;
    const lines = balances.map(a => {
      totalLiquid += a.balance;
      return `• ${a.name} [${a.assetType}] ${a.isBusiness ? '(Business)' : '(Personal)'}\n` +
             `  Balance: ${formatMoney(a.balance, state.currency)} | Inflow: ${formatMoney(a.income, state.currency)} | Outflow: ${formatMoney(a.expense, state.currency)} | ID: ${a.id}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `📊 Total Liquid Assets: ${formatMoney(totalLiquid, state.currency)}\n\n` +
                `Accounts:\n` + lines.join('\n\n')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 7. ADD ACCOUNT
// -------------------------------------------------------------
server.tool(
  'add_account',
  'Create a new bank account, credit card, cash wallet, or asset.',
  {
    name: z.string().describe('Name of account (e.g. "HDFC Salary Account", "Amex Platinum", "Cash Pocket")'),
    assetType: z.enum(['checking', 'savings', 'credit', 'cash', 'gold', 'crypto', 'real_estate', 'stocks', 'other']).default('checking'),
    incomeSource: z.enum(['salary', 'real_estate', 'stocks', 'business', 'miscellaneous', 'none']).default('salary'),
    color: z.string().optional().default('#3b82f6'),
    isBusiness: z.boolean().optional().default(false),
    initialBalance: z.number().optional().describe('Optional starting balance for this account')
  },
  async (args) => {
    const state = await readState();
    const newAcc = {
      id: uid('acc'),
      name: args.name,
      assetType: args.assetType,
      incomeSource: args.incomeSource,
      color: args.color,
      isBusiness: args.isBusiness
    };

    state.accounts.push(newAcc);

    if (args.initialBalance && args.initialBalance !== 0) {
      const isPositive = args.initialBalance > 0;
      state.transactions.unshift({
        id: uid('txn'),
        type: isPositive ? 'income' : 'expense',
        amount: Math.abs(args.initialBalance),
        accountId: newAcc.id,
        categoryId: resolveCategory(state.categories, 'Salary', 'income').id,
        description: 'Initial Balance',
        date: new Date().toISOString(),
        isBusiness: args.isBusiness
      });
    }

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created account "${newAcc.name}" [${newAcc.assetType}] (ID: ${newAcc.id})\n` +
                (args.initialBalance ? `• Initial Balance: ${formatMoney(args.initialBalance, state.currency)}` : '')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 8. LIST CATEGORIES
// -------------------------------------------------------------
server.tool(
  'list_categories',
  'List all expense and income categories, including icons and monthly budget limits.',
  {},
  async () => {
    const state = await readState();
    const incomeCats = state.categories.filter(c => c.type === 'income' || c.type === 'both');
    const expenseCats = state.categories.filter(c => c.type === 'expense' || c.type === 'both');

    const formatCat = c => `• ${c.icon || '📁'} ${c.name} ${c.monthlyBudget ? `(Budget: ${formatMoney(c.monthlyBudget, state.currency)})` : ''} [ID: ${c.id}]`;

    return {
      content: [
        {
          type: 'text',
          text: `📂 EXPENSE CATEGORIES:\n${expenseCats.map(formatCat).join('\n')}\n\n` +
                `💼 INCOME CATEGORIES:\n${incomeCats.map(formatCat).join('\n')}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 9. ADD CATEGORY
// -------------------------------------------------------------
server.tool(
  'add_category',
  'Add a new expense or income category.',
  {
    name: z.string().describe('Category name (e.g. "Fitness & Gym", "Coffee & Snacks")'),
    type: z.enum(['expense', 'income', 'both']).default('expense'),
    icon: z.string().optional().default('📁').describe('Emoji icon for category (e.g. "🏋️", "☕", "🎮")'),
    color: z.string().optional().default('#3b82f6'),
    monthlyBudget: z.number().optional().describe('Optional monthly spending limit'),
    isBusiness: z.boolean().optional().default(false)
  },
  async (args) => {
    const state = await readState();
    const newCat = {
      id: uid('cat'),
      name: args.name,
      type: args.type,
      icon: args.icon,
      color: args.color,
      monthlyBudget: args.monthlyBudget,
      isBusiness: args.isBusiness
    };

    state.categories.push(newCat);
    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added category ${newCat.icon} ${newCat.name} (${newCat.type}) with ID: ${newCat.id}` +
                (newCat.monthlyBudget ? ` and monthly budget ${formatMoney(newCat.monthlyBudget, state.currency)}` : '')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 10. LIST BUDGETS & SPENDING
// -------------------------------------------------------------
server.tool(
  'list_budget_goals',
  'View monthly budget limits and current month spending progress per category.',
  {
    month: z.string().optional().describe('Target month in YYYY-MM format (defaults to current month)')
  },
  async (args) => {
    const state = await readState();
    const targetMonth = args.month || new Date().toISOString().slice(0, 7);

    // Calculate spend per category for this month
    const spendMap = {};
    state.transactions.forEach(t => {
      if (t.type === 'expense' && t.date.slice(0, 7) === targetMonth) {
        spendMap[t.categoryId] = (spendMap[t.categoryId] || 0) + t.amount;
      }
    });

    // Check both category-level monthlyBudget and explicit budgetGoals
    const rows = state.categories
      .filter(c => c.type === 'expense' || c.type === 'both')
      .map(c => {
        const goal = state.budgetGoals.find(g => g.categoryId === c.id && g.month === targetMonth);
        const limit = goal ? goal.monthlyLimit : (c.monthlyBudget || 0);
        const spent = spendMap[c.id] || 0;
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        return { name: c.name, icon: c.icon, limit, spent, pct, hasBudget: limit > 0 };
      })
      .filter(r => r.hasBudget || r.spent > 0);

    const lines = rows.map(r => {
      const status = r.limit > 0 && r.spent > r.limit ? '⚠️ OVER BUDGET' : r.limit > 0 && r.pct >= 85 ? '⚡ NEAR LIMIT' : '✅ ON TRACK';
      return `• ${r.icon || '📁'} ${r.name}: Spent ${formatMoney(r.spent, state.currency)} of ${r.limit > 0 ? formatMoney(r.limit, state.currency) : 'No Limit'} (${r.pct}%) - ${status}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎯 Budget Report for ${targetMonth}:\n\n` +
                (lines.length ? lines.join('\n') : 'No budget limits or spending recorded for this month.')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 11. SET BUDGET GOAL
// -------------------------------------------------------------
server.tool(
  'set_budget_goal',
  'Set or update a monthly spending budget for a specific category.',
  {
    category: z.string().describe('Category name or ID (e.g. "Food & Dining", "Entertainment")'),
    monthlyLimit: z.number().positive().describe('The maximum spending limit for the month'),
    month: z.string().optional().describe('Target month YYYY-MM (defaults to current month)')
  },
  async (args) => {
    const state = await readState();
    const cat = resolveCategory(state.categories, args.category, 'expense');
    const month = args.month || new Date().toISOString().slice(0, 7);

    // Update category default budget
    cat.monthlyBudget = args.monthlyLimit;

    // Also update or insert in budgetGoals
    const existingIdx = state.budgetGoals.findIndex(g => g.categoryId === cat.id && g.month === month);
    if (existingIdx !== -1) {
      state.budgetGoals[existingIdx].monthlyLimit = args.monthlyLimit;
    } else {
      state.budgetGoals.push({
        id: uid('goal'),
        categoryId: cat.id,
        monthlyLimit: args.monthlyLimit,
        month,
        goalType: 'spend'
      });
    }

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Set budget limit for "${cat.name}" to ${formatMoney(args.monthlyLimit, state.currency)} for ${month}.`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 12. LIST RECURRING TRANSACTIONS & BILLS
// -------------------------------------------------------------
server.tool(
  'list_recurring',
  'List all recurring bills, subscriptions, EMIs, and SIP investments.',
  {},
  async () => {
    const state = await readState();
    const items = state.recurringTransactions || [];

    if (!items.length) {
      return { content: [{ type: 'text', text: 'No recurring bills or subscriptions set up.' }] };
    }

    const lines = items.map(r => {
      const activeStr = r.active ? '🟢 ACTIVE' : '⚪ PAUSED';
      const emiStr = r.isEmi ? ` [EMI: ${r.paidInstallments || 0}/${r.totalInstallments || '∞'} paid]` : '';
      return `• ${r.description} (${r.frequency}) - ${formatMoney(r.amount, state.currency)}\n` +
             `  Next Due: ${r.nextDueDate} | Status: ${activeStr}${emiStr} | ID: ${r.id}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `📅 Recurring Subscriptions & Bills:\n\n${lines.join('\n\n')}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 13. ADD RECURRING BILL
// -------------------------------------------------------------
server.tool(
  'add_recurring',
  'Add a recurring subscription, bill, salary, or loan EMI.',
  {
    description: z.string().describe('Name of bill or subscription (e.g. "Netflix", "Rent", "Car Loan EMI")'),
    amount: z.number().positive(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
    nextDueDate: z.string().describe('Next payment due date (YYYY-MM-DD)'),
    type: z.enum(['expense', 'income']).default('expense'),
    category: z.string().optional(),
    account: z.string().optional(),
    isEmi: z.boolean().optional().default(false),
    totalInstallments: z.number().optional().describe('Total installments if this is an EMI or loan'),
    isBusiness: z.boolean().optional().default(false)
  },
  async (args) => {
    const state = await readState();
    const account = resolveAccount(state.accounts, args.account);
    const category = resolveCategory(state.categories, args.category, args.type);

    const recurring = {
      id: uid('rec'),
      description: args.description,
      amount: args.amount,
      frequency: args.frequency,
      nextDueDate: args.nextDueDate,
      type: args.type,
      accountId: account.id,
      categoryId: category.id,
      active: true,
      isEmi: args.isEmi,
      totalInstallments: args.totalInstallments,
      paidInstallments: 0,
      isBusiness: args.isBusiness
    };

    state.recurringTransactions.push(recurring);
    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created recurring ${args.type}: "${args.description}" of ${formatMoney(args.amount, state.currency)} (${args.frequency})\n` +
                `• Next Due Date: ${args.nextDueDate}\n` +
                `• Account: ${account.name} | Category: ${category.name}\n` +
                `• ID: ${recurring.id}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 14. MARK RECURRING BILL AS PAID
// -------------------------------------------------------------
server.tool(
  'mark_recurring_paid',
  'Mark a recurring bill or EMI as paid for the current cycle: creates the expense transaction and advances next due date.',
  {
    id: z.string().describe('ID of the recurring transaction to mark as paid')
  },
  async ({ id }) => {
    const state = await readState();
    const r = state.recurringTransactions.find(item => item.id === id);
    if (!r) {
      return { content: [{ type: 'text', text: `❌ Recurring transaction with ID "${id}" not found.` }] };
    }

    const todayStr = new Date().toISOString();
    // Create transaction
    const txn = {
      id: uid('txn'),
      type: r.type,
      amount: r.amount,
      accountId: r.accountId,
      categoryId: r.categoryId,
      description: `${r.description} (Recurring)`,
      date: todayStr,
      linkedRecurringId: r.id,
      isBusiness: r.isBusiness
    };
    state.transactions.unshift(txn);

    // Advance nextDueDate
    const d = new Date(r.nextDueDate);
    if (r.frequency === 'daily') d.setDate(d.getDate() + 1);
    else if (r.frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (r.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (r.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);

    r.nextDueDate = d.toISOString().slice(0, 10);
    if (r.isEmi && r.totalInstallments) {
      r.paidInstallments = (r.paidInstallments || 0) + 1;
      if (r.paidInstallments >= r.totalInstallments) {
        r.active = false;
      }
    }

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Marked "${r.description}" as PAID!\n` +
                `• Logged transaction: ${formatMoney(r.amount, state.currency)}\n` +
                `• Next Due Date advanced to: ${r.nextDueDate}` +
                (r.isEmi ? `\n• EMI Progress: ${r.paidInstallments}/${r.totalInstallments} paid` : '')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 15. LIST & MANAGE DEBTS
// -------------------------------------------------------------
server.tool(
  'list_debts',
  'List all loans, mortgages, and credit card debts.',
  {},
  async () => {
    const state = await readState();
    const debts = state.debts || [];
    if (!debts.length) {
      return { content: [{ type: 'text', text: '🎉 No outstanding debts recorded!' }] };
    }

    let totalDebt = 0;
    const lines = debts.map(d => {
      totalDebt += d.balance;
      return `• ${d.name} [${d.type}] - Outstanding: ${formatMoney(d.balance, state.currency)}\n` +
             `  Interest: ${d.interestRate}% | Min Payment: ${formatMoney(d.minimumPayment, state.currency)} | Due: ${d.dueDate || 'N/A'} | ID: ${d.id}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `💳 Total Outstanding Debt: ${formatMoney(totalDebt, state.currency)}\n\n${lines.join('\n\n')}`
        }
      ]
    };
  }
);

server.tool(
  'record_debt_payment',
  'Record a payment towards a debt or loan, reducing its balance and logging the transaction.',
  {
    debtId: z.string().describe('ID of the debt'),
    amount: z.number().positive().describe('Payment amount'),
    account: z.string().optional().describe('Account used for payment'),
    notes: z.string().optional()
  },
  async (args) => {
    const state = await readState();
    const debt = state.debts.find(d => d.id === args.debtId);
    if (!debt) {
      return { content: [{ type: 'text', text: `❌ Debt with ID "${args.debtId}" not found.` }] };
    }

    const account = resolveAccount(state.accounts, args.account);
    const category = resolveCategory(state.categories, 'Debt Payment', 'expense');

    debt.balance = Math.max(0, debt.balance - args.amount);

    const txn = {
      id: uid('txn'),
      type: 'expense',
      amount: args.amount,
      accountId: account.id,
      categoryId: category.id,
      description: `Debt Payment: ${debt.name}`,
      date: new Date().toISOString(),
      linkedDebtId: debt.id,
      notes: args.notes
    };
    state.transactions.unshift(txn);

    await writeState(state);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Recorded ${formatMoney(args.amount, state.currency)} payment towards "${debt.name}".\n` +
                `• Remaining Debt Balance: ${formatMoney(debt.balance, state.currency)}\n` +
                `• Paid from: ${account.name}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 16. LIST & MANAGE SAVINGS GOALS
// -------------------------------------------------------------
server.tool(
  'list_savings_goals',
  'List all savings and investment goals with current progress and targets.',
  {},
  async () => {
    const state = await readState();
    const goals = state.savingsGoals || [];
    if (!goals.length) {
      return { content: [{ type: 'text', text: 'No savings goals found.' }] };
    }

    const lines = goals.map(g => {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      return `• 🏆 ${g.name}: ${formatMoney(g.currentAmount, state.currency)} / ${formatMoney(g.targetAmount, state.currency)} (${pct}% achieved)\n` +
             `  Deadline: ${g.deadline || 'No deadline'} | ID: ${g.id}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎯 Savings Goals:\n\n${lines.join('\n\n')}`
        }
      ]
    };
  }
);

server.tool(
  'contribute_savings_goal',
  'Deposit money into a savings goal, increasing its progress and recording the transfer/expense.',
  {
    goalId: z.string().describe('ID of the savings goal'),
    amount: z.number().positive().describe('Contribution amount'),
    account: z.string().optional().describe('Account used for funding')
  },
  async (args) => {
    const state = await readState();
    const goal = state.savingsGoals.find(g => g.id === args.goalId);
    if (!goal) {
      return { content: [{ type: 'text', text: `❌ Savings goal with ID "${args.goalId}" not found.` }] };
    }

    const account = resolveAccount(state.accounts, args.account);
    const category = resolveCategory(state.categories, 'Investments', 'expense');

    goal.currentAmount += args.amount;

    const txn = {
      id: uid('txn'),
      type: 'expense',
      amount: args.amount,
      accountId: account.id,
      categoryId: category.id,
      description: `Savings Contribution: ${goal.name}`,
      date: new Date().toISOString(),
      linkedSavingsGoalId: goal.id
    };
    state.transactions.unshift(txn);

    await writeState(state);

    const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added ${formatMoney(args.amount, state.currency)} to "${goal.name}".\n` +
                `• Current Progress: ${formatMoney(goal.currentAmount, state.currency)} / ${formatMoney(goal.targetAmount, state.currency)} (${pct}%)\n` +
                `• Funded from: ${account.name}`
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 17. GET FINANCIAL OVERVIEW (EXECUTIVE DASHBOARD)
// -------------------------------------------------------------
server.tool(
  'get_financial_overview',
  'Get a complete snapshot of total net worth, liquid cash, monthly income/expenses, debts, and upcoming bills.',
  {},
  async () => {
    const state = await readState();
    const balances = calculateAccountBalances(state);

    let liquidCash = 0;
    balances.forEach(a => { liquidCash += a.balance; });

    let totalDebts = 0;
    (state.debts || []).forEach(d => { totalDebts += d.balance; });

    let totalSaved = 0;
    (state.savingsGoals || []).forEach(g => { totalSaved += g.currentAmount; });

    const totalNetWorth = liquidCash + totalSaved - totalDebts;

    // Current month calculations
    const curMonth = new Date().toISOString().slice(0, 7);
    let monthIncome = 0;
    let monthExpense = 0;
    state.transactions.forEach(t => {
      if (t.date.slice(0, 7) === curMonth) {
        if (t.type === 'income') monthIncome += t.amount;
        if (t.type === 'expense') monthExpense += t.amount;
      }
    });

    // Upcoming bills in next 14 days
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const todayStr = today.toISOString().slice(0, 10);
    const twoWeeksStr = twoWeeks.toISOString().slice(0, 10);

    const upcoming = (state.recurringTransactions || [])
      .filter(r => r.active && r.nextDueDate >= todayStr && r.nextDueDate <= twoWeeksStr)
      .map(r => `  • ${r.description}: ${formatMoney(r.amount, state.currency)} (Due: ${r.nextDueDate})`);

    const accSummary = balances.map(a => `  • ${a.name}: ${formatMoney(a.balance, state.currency)}`);

    return {
      content: [
        {
          type: 'text',
          text: `👑 SOLV FINANCIAL OVERVIEW (${curMonth})\n\n` +
                `💰 NET WORTH: ${formatMoney(totalNetWorth, state.currency)}\n` +
                `• Liquid Cash in Accounts: ${formatMoney(liquidCash, state.currency)}\n` +
                `• Total Investments & Savings: ${formatMoney(totalSaved, state.currency)}\n` +
                `• Total Outstanding Debts: ${formatMoney(totalDebts, state.currency)}\n\n` +
                `📈 THIS MONTH'S CASH FLOW:\n` +
                `• Income: ${formatMoney(monthIncome, state.currency)}\n` +
                `• Expenses: ${formatMoney(monthExpense, state.currency)}\n` +
                `• Net Savings: ${formatMoney(monthIncome - monthExpense, state.currency)} (${monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0}% savings rate)\n\n` +
                `🏦 ACCOUNTS BREAKDOWN:\n${accSummary.join('\n')}\n\n` +
                `🔔 UPCOMING BILLS (NEXT 14 DAYS):\n` +
                (upcoming.length ? upcoming.join('\n') : '  • No bills due in next 14 days.')
        }
      ]
    };
  }
);

// -------------------------------------------------------------
// 18. UPDATE & DELETE ACCOUNT
// -------------------------------------------------------------
server.tool(
  'update_account',
  'Update an existing account name, type, color, or business flag.',
  {
    id: z.string().describe('ID of account to update'),
    name: z.string().optional(),
    assetType: z.enum(['checking', 'savings', 'credit', 'cash', 'gold', 'crypto', 'real_estate', 'stocks', 'other']).optional(),
    incomeSource: z.enum(['salary', 'real_estate', 'stocks', 'business', 'miscellaneous', 'none']).optional(),
    color: z.string().optional(),
    isBusiness: z.boolean().optional()
  },
  async ({ id, ...updates }) => {
    const state = await readState();
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return { content: [{ type: 'text', text: `❌ Account "${id}" not found.` }] };
    if (updates.name !== undefined) acc.name = updates.name;
    if (updates.assetType !== undefined) acc.assetType = updates.assetType;
    if (updates.incomeSource !== undefined) acc.incomeSource = updates.incomeSource;
    if (updates.color !== undefined) acc.color = updates.color;
    if (updates.isBusiness !== undefined) acc.isBusiness = updates.isBusiness;
    await writeState(state);
    return { content: [{ type: 'text', text: `✅ Updated account "${acc.name}".` }] };
  }
);

server.tool(
  'delete_account',
  'Delete an account by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return { content: [{ type: 'text', text: `❌ Account "${id}" not found.` }] };
    state.accounts = state.accounts.filter(a => a.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted account "${acc.name}".` }] };
  }
);

// -------------------------------------------------------------
// 19. UPDATE & DELETE CATEGORY
// -------------------------------------------------------------
server.tool(
  'update_category',
  'Update category name, monthly budget, or icon.',
  {
    id: z.string(),
    name: z.string().optional(),
    icon: z.string().optional(),
    monthlyBudget: z.number().optional(),
    color: z.string().optional()
  },
  async ({ id, ...updates }) => {
    const state = await readState();
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return { content: [{ type: 'text', text: `❌ Category "${id}" not found.` }] };
    if (updates.name !== undefined) cat.name = updates.name;
    if (updates.icon !== undefined) cat.icon = updates.icon;
    if (updates.monthlyBudget !== undefined) cat.monthlyBudget = updates.monthlyBudget;
    if (updates.color !== undefined) cat.color = updates.color;
    await writeState(state);
    return { content: [{ type: 'text', text: `✅ Updated category "${cat.name}".` }] };
  }
);

server.tool(
  'delete_category',
  'Delete a category by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return { content: [{ type: 'text', text: `❌ Category "${id}" not found.` }] };
    state.categories = state.categories.filter(c => c.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted category "${cat.name}".` }] };
  }
);

// -------------------------------------------------------------
// 20. DELETE BUDGET GOAL & RECURRING
// -------------------------------------------------------------
server.tool(
  'delete_budget_goal',
  'Delete a specific budget goal by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    state.budgetGoals = (state.budgetGoals || []).filter(g => g.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted budget goal "${id}".` }] };
  }
);

server.tool(
  'delete_recurring',
  'Delete a recurring bill or subscription by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    const r = state.recurringTransactions.find(item => item.id === id);
    state.recurringTransactions = state.recurringTransactions.filter(item => item.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted recurring item "${r?.description || id}".` }] };
  }
);

// -------------------------------------------------------------
// 21. ADD & DELETE DEBT
// -------------------------------------------------------------
server.tool(
  'add_debt',
  'Add a new debt, loan, or credit card balance.',
  {
    name: z.string().describe('Name of the loan or creditor (e.g. "HDFC Car Loan", "Student Loan")'),
    balance: z.number().positive(),
    interestRate: z.number().min(0).describe('Annual interest rate in %'),
    minimumPayment: z.number().min(0).describe('Minimum monthly payment'),
    dueDate: z.string().optional().describe('Payment due day/date'),
    type: z.enum(['loan', 'credit_card', 'mortgage', 'other']).default('loan'),
    isBusiness: z.boolean().optional().default(false)
  },
  async (args) => {
    const state = await readState();
    const debt = {
      id: uid('debt'),
      name: args.name,
      balance: args.balance,
      interestRate: args.interestRate,
      minimumPayment: args.minimumPayment,
      dueDate: args.dueDate || new Date().toISOString().slice(0, 10),
      type: args.type,
      isBusiness: args.isBusiness
    };
    state.debts = [...(state.debts || []), debt];
    await writeState(state);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Added debt "${debt.name}" [${debt.type}] with balance ${formatMoney(debt.balance, state.currency)} (ID: ${debt.id}).`
        }
      ]
    };
  }
);

server.tool(
  'delete_debt',
  'Delete a debt entry by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    const d = (state.debts || []).find(item => item.id === id);
    state.debts = (state.debts || []).filter(item => item.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted debt "${d?.name || id}".` }] };
  }
);

// -------------------------------------------------------------
// 22. ADD & DELETE SAVINGS GOALS
// -------------------------------------------------------------
server.tool(
  'add_savings_goal',
  'Create a new savings or investment goal.',
  {
    name: z.string().describe('Goal name (e.g. "Emergency Fund", "New Laptop", "Trip to Japan")'),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).default(0),
    deadline: z.string().optional().describe('Target completion date (YYYY-MM-DD)'),
    color: z.string().optional().default('#22c55e'),
    isBusiness: z.boolean().optional().default(false)
  },
  async (args) => {
    const state = await readState();
    const goal = {
      id: uid('goal'),
      name: args.name,
      targetAmount: args.targetAmount,
      currentAmount: args.currentAmount,
      deadline: args.deadline,
      color: args.color,
      isBusiness: args.isBusiness
    };
    state.savingsGoals = [...(state.savingsGoals || []), goal];
    await writeState(state);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Created savings goal "${goal.name}" with target ${formatMoney(goal.targetAmount, state.currency)} (ID: ${goal.id}).`
        }
      ]
    };
  }
);

server.tool(
  'delete_savings_goal',
  'Delete a savings goal by ID.',
  { id: z.string() },
  async ({ id }) => {
    const state = await readState();
    const g = (state.savingsGoals || []).find(item => item.id === id);
    state.savingsGoals = (state.savingsGoals || []).filter(item => item.id !== id);
    await writeState(state);
    return { content: [{ type: 'text', text: `🗑️ Deleted savings goal "${g?.name || id}".` }] };
  }
);

// -------------------------------------------------------------
// 23. GET CATEGORY SPENDING BREAKDOWN
// -------------------------------------------------------------
server.tool(
  'get_category_spending',
  'Get breakdown of expenses grouped by category for a specific month.',
  {
    month: z.string().optional().describe('Target month YYYY-MM (defaults to current month)')
  },
  async (args) => {
    const state = await readState();
    const targetMonth = args.month || new Date().toISOString().slice(0, 7);

    let totalExpense = 0;
    const catSpend = {};

    state.transactions.forEach(t => {
      if (t.type === 'expense' && t.date.slice(0, 7) === targetMonth) {
        totalExpense += t.amount;
        catSpend[t.categoryId] = (catSpend[t.categoryId] || 0) + t.amount;
      }
    });

    const sorted = Object.entries(catSpend)
      .map(([catId, amount]) => {
        const cat = state.categories.find(c => c.id === catId);
        const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        return { name: cat?.name || 'Other', icon: cat?.icon || '📁', amount, pct };
      })
      .sort((a, b) => b.amount - a.amount);

    const lines = sorted.map(s => `• ${s.icon} ${s.name}: ${formatMoney(s.amount, state.currency)} (${s.pct}%)`);

    return {
      content: [
        {
          type: 'text',
          text: `📊 SPENDING BREAKDOWN FOR ${targetMonth}:\n` +
                `Total Expenses: ${formatMoney(totalExpense, state.currency)}\n\n` +
                (lines.length ? lines.join('\n') : 'No expenses recorded for this month.')
        }
      ]
    };
  }
);

// Connect Stdio Transport
const transport = new StdioServerTransport();
await server.connect(transport);
