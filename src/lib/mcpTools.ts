import { AppState, Transaction, Account, Category, LedgerEntry } from './types';
import { readServerState, writeServerState, resolveAccount, resolveCategory, generateLedgerEntries } from './serverStorage';

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  return `${sym}${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function calculateAccountBalances(state: AppState) {
  const map: Record<string, any> = {};
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

export const MCP_TOOLS = [
  {
    name: 'add_transaction',
    description: 'Add a single financial transaction (expense, income, or transfer) to the budget tracker.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'The transaction amount (e.g. 500, 1250.50)' },
        type: { type: 'string', enum: ['expense', 'income', 'transfer'], default: 'expense', description: 'Type of transaction: expense, income, or transfer' },
        description: { type: 'string', description: 'Description or note of the transaction' },
        category: { type: 'string', description: 'Category name or ID (e.g. "Food & Dining", "Groceries", "Salary")' },
        account: { type: 'string', description: 'Source account name or ID (e.g. "Main Checking", "Credit Card", "Cash Wallet")' },
        toAccount: { type: 'string', description: 'Destination account name or ID (required for transfers)' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD or ISO string format (defaults to today)' },
        payee: { type: 'string', description: 'Merchant or recipient name' },
        notes: { type: 'string', description: 'Additional notes' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
        isBusiness: { type: 'boolean', description: 'Whether this is a business/freelance transaction' }
      },
      required: ['amount', 'description']
    }
  },
  {
    name: 'add_transactions_bulk',
    description: 'Add multiple transactions in a single batch (e.g. from bank statements, SMS logs, or expense lists).',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              type: { type: 'string', enum: ['expense', 'income', 'transfer'], default: 'expense' },
              description: { type: 'string' },
              category: { type: 'string' },
              account: { type: 'string' },
              toAccount: { type: 'string' },
              date: { type: 'string' },
              payee: { type: 'string' },
              notes: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              isBusiness: { type: 'boolean' }
            },
            required: ['amount', 'description']
          },
          description: 'List of transactions to add'
        }
      },
      required: ['transactions']
    }
  },
  {
    name: 'get_transactions',
    description: 'Query and filter transactions from the budget tracker.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 30, description: 'Max number of transactions to return' },
        startDate: { type: 'string', description: 'Filter transactions on or after this date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'Filter transactions on or before this date (YYYY-MM-DD)' },
        type: { type: 'string', enum: ['expense', 'income', 'transfer', 'all'], default: 'all' },
        account: { type: 'string', description: 'Filter by account name or ID' },
        category: { type: 'string', description: 'Filter by category name or ID' },
        search: { type: 'string', description: 'Keyword search in description, payee, or notes' },
        isBusiness: { type: 'boolean', description: 'Filter by personal vs business' }
      }
    }
  },
  {
    name: 'update_transaction',
    description: 'Update details of an existing transaction by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The transaction ID to update' },
        amount: { type: 'number' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['expense', 'income', 'transfer'] },
        category: { type: 'string' },
        account: { type: 'string' },
        toAccount: { type: 'string' },
        date: { type: 'string' },
        payee: { type: 'string' },
        notes: { type: 'string' },
        isBusiness: { type: 'boolean' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_transaction',
    description: 'Delete a transaction by ID (automatically rolls back any linked debts or savings goal adjustments).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The transaction ID to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'list_accounts',
    description: 'List all financial accounts and assets with their current calculated balances.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_account',
    description: 'Create a new bank account, credit card, cash wallet, or asset.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of account' },
        assetType: { type: 'string', enum: ['checking', 'savings', 'credit', 'cash', 'gold', 'crypto', 'real_estate', 'stocks', 'other'], default: 'checking' },
        incomeSource: { type: 'string', enum: ['salary', 'real_estate', 'stocks', 'business', 'miscellaneous', 'none'], default: 'salary' },
        color: { type: 'string', default: '#3b82f6' },
        isBusiness: { type: 'boolean', default: false },
        initialBalance: { type: 'number', description: 'Optional starting balance' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_account',
    description: 'Update account details.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        assetType: { type: 'string' },
        incomeSource: { type: 'string' },
        color: { type: 'string' },
        isBusiness: { type: 'boolean' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_account',
    description: 'Delete an account by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'list_categories',
    description: 'List all expense and income categories, including icons and monthly budget limits.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_category',
    description: 'Add a new expense or income category.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['expense', 'income', 'both'], default: 'expense' },
        icon: { type: 'string', default: '📁' },
        color: { type: 'string', default: '#3b82f6' },
        monthlyBudget: { type: 'number' },
        isBusiness: { type: 'boolean', default: false }
      },
      required: ['name']
    }
  },
  {
    name: 'update_category',
    description: 'Update category name, monthly budget, or icon.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        icon: { type: 'string' },
        monthlyBudget: { type: 'number' },
        color: { type: 'string' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_category',
    description: 'Delete a category by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'list_budget_goals',
    description: 'View monthly budget limits and current month spending progress per category.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Target month in YYYY-MM format' }
      }
    }
  },
  {
    name: 'set_budget_goal',
    description: 'Set or update a monthly spending budget for a specific category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category name or ID' },
        monthlyLimit: { type: 'number', description: 'Maximum spending limit' },
        month: { type: 'string', description: 'Target month YYYY-MM' }
      },
      required: ['category', 'monthlyLimit']
    }
  },
  {
    name: 'delete_budget_goal',
    description: 'Delete a specific budget goal by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'list_recurring',
    description: 'List all recurring bills, subscriptions, EMIs, and SIP investments.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_recurring',
    description: 'Add a recurring subscription, bill, salary, or loan EMI.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        amount: { type: 'number' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' },
        nextDueDate: { type: 'string', description: 'YYYY-MM-DD' },
        type: { type: 'string', enum: ['expense', 'income'], default: 'expense' },
        category: { type: 'string' },
        account: { type: 'string' },
        isEmi: { type: 'boolean', default: false },
        totalInstallments: { type: 'number' },
        isBusiness: { type: 'boolean', default: false }
      },
      required: ['description', 'amount', 'nextDueDate']
    }
  },
  {
    name: 'mark_recurring_paid',
    description: 'Mark a recurring bill or EMI as paid for the current cycle: creates the expense transaction and advances next due date.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recurring transaction ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_recurring',
    description: 'Delete a recurring bill or subscription by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'list_debts',
    description: 'List all loans, mortgages, and credit card debts.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_debt',
    description: 'Add a new debt, loan, or credit card balance.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        balance: { type: 'number' },
        interestRate: { type: 'number' },
        minimumPayment: { type: 'number' },
        dueDate: { type: 'string' },
        type: { type: 'string', enum: ['loan', 'credit_card', 'mortgage', 'other'], default: 'loan' },
        isBusiness: { type: 'boolean', default: false }
      },
      required: ['name', 'balance', 'interestRate', 'minimumPayment']
    }
  },
  {
    name: 'record_debt_payment',
    description: 'Record a payment towards a debt or loan, reducing its balance and logging the transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        debtId: { type: 'string' },
        amount: { type: 'number' },
        account: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['debtId', 'amount']
    }
  },
  {
    name: 'delete_debt',
    description: 'Delete a debt entry by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'list_savings_goals',
    description: 'List all savings and investment goals with current progress and targets.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_savings_goal',
    description: 'Create a new savings or investment goal.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        targetAmount: { type: 'number' },
        currentAmount: { type: 'number', default: 0 },
        deadline: { type: 'string' },
        color: { type: 'string', default: '#22c55e' },
        isBusiness: { type: 'boolean', default: false }
      },
      required: ['name', 'targetAmount']
    }
  },
  {
    name: 'contribute_savings_goal',
    description: 'Deposit money into a savings goal, increasing its progress and recording the transfer/expense.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string' },
        amount: { type: 'number' },
        account: { type: 'string' }
      },
      required: ['goalId', 'amount']
    }
  },
  {
    name: 'delete_savings_goal',
    description: 'Delete a savings goal by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'get_financial_overview',
    description: 'Get a complete snapshot of total net worth, liquid cash, monthly income/expenses, debts, and upcoming bills.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_category_spending',
    description: 'Get breakdown of expenses grouped by category for a specific month.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Target month YYYY-MM' }
      }
    }
  }
];

export async function executeMcpTool(name: string, args: any): Promise<string> {
  const state = await readServerState();

  switch (name) {
    case 'add_transaction': {
      const account = resolveAccount(state.accounts, args.account);
      const toAccount = args.toAccount ? resolveAccount(state.accounts, args.toAccount) : undefined;
      const category = resolveCategory(state.categories, args.category, args.type);

      let dateStr = new Date().toISOString();
      if (args.date) {
        const d = new Date(args.date);
        if (!isNaN(d.getTime())) dateStr = d.toISOString();
      }

      const txn: Transaction = {
        id: uid('txn'),
        type: args.type || 'expense',
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

      state.transactions = [txn, ...(state.transactions || [])];
      if (txn.isBusiness) {
        state.ledger = [...(state.ledger || []), ...generateLedgerEntries(txn, state.accounts)];
      }

      await writeServerState(state);
      const balances = calculateAccountBalances(state);
      const updatedAcc = balances.find(a => a.id === account.id);

      return `✅ Added ${txn.type.toUpperCase()} of ${formatMoney(args.amount, state.currency)}: "${args.description}"\n` +
             `• Total in ledger: ${state.transactions.length} rows\n` +
             `• Category: ${category.name} ${category.icon || ''}\n` +
             `• Account: ${account.name} (New balance: ${formatMoney(updatedAcc?.balance || 0, state.currency)})\n` +
             `• Date: ${dateStr.slice(0, 10)}\n` +
             `• ID: ${txn.id}`;
    }

    case 'add_transactions_bulk': {
      const list = args.transactions || [];
      if (!list.length) return 'No transactions provided.';
      let totalIncome = 0;
      let totalExpense = 0;

      const existingSignatures = new Set((state.transactions || []).map(t =>
        `${t.date?.slice(0, 10)}_${t.amount}_${(t.description || '').trim().toLowerCase()}`
      ));

      const newTxns: Transaction[] = [];
      const newLedgerEntries: LedgerEntry[] = [];

      for (const item of list) {
        const account = resolveAccount(state.accounts, item.account);
        const toAccount = item.toAccount ? resolveAccount(state.accounts, item.toAccount) : undefined;
        const category = resolveCategory(state.categories, item.category, item.type);

        let dateStr = new Date().toISOString();
        if (item.date) {
          const d = new Date(item.date);
          if (!isNaN(d.getTime())) dateStr = d.toISOString();
        }

        const sig = `${dateStr.slice(0, 10)}_${item.amount}_${(item.description || '').trim().toLowerCase()}`;
        if (!existingSignatures.has(sig)) {
          const txn: Transaction = {
            id: uid('txn'),
            type: item.type || 'expense',
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

          if (txn.type === 'income') totalIncome += txn.amount;
          if (txn.type === 'expense') totalExpense += txn.amount;

          newTxns.push(txn);
          existingSignatures.add(sig);

          if (txn.isBusiness) {
            newLedgerEntries.push(...generateLedgerEntries(txn, state.accounts));
          }
        }
      }

      state.transactions = [...newTxns, ...(state.transactions || [])];
      if (newLedgerEntries.length > 0) {
        state.ledger = [...(state.ledger || []), ...newLedgerEntries];
      }

      await writeServerState(state);
      return `✅ Successfully added ${newTxns.length} new transaction(s) in bulk! Cumulative Total in Ledger: ${state.transactions.length} rows\n` +
             `• Total Income Added: ${formatMoney(totalIncome, state.currency)}\n` +
             `• Total Expenses Added: ${formatMoney(totalExpense, state.currency)}`;
    }

    case 'get_transactions': {
      let txns = [...state.transactions];
      if (args.type && args.type !== 'all') txns = txns.filter(t => t.type === args.type);
      if (args.startDate) txns = txns.filter(t => new Date(t.date).getTime() >= new Date(args.startDate).getTime());
      if (args.endDate) txns = txns.filter(t => new Date(t.date).getTime() <= new Date(args.endDate + 'T23:59:59.999Z').getTime());
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
        txns = txns.filter(t => (t.description && t.description.toLowerCase().includes(q)) || (t.payee && t.payee.toLowerCase().includes(q)));
      }
      if (args.isBusiness !== undefined) txns = txns.filter(t => !!t.isBusiness === args.isBusiness);

      txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const sliced = txns.slice(0, args.limit || 30);
      const accMap = Object.fromEntries(state.accounts.map(a => [a.id, a.name]));
      const catMap = Object.fromEntries(state.categories.map(c => [c.id, `${c.name} ${c.icon || ''}`]));

      const formatted = sliced.map(t => `• [${t.date.slice(0, 10)}] ${t.type.toUpperCase()}: ${formatMoney(t.amount, state.currency)} | "${t.description}" | Category: ${catMap[t.categoryId] || 'Other'} | Account: ${accMap[t.accountId] || 'Account'} (ID: ${t.id})`);
      return `Found ${txns.length} matching transaction(s) (showing ${sliced.length}):\n\n` + (formatted.length ? formatted.join('\n') : 'No transactions found.');
    }

    case 'update_transaction': {
      const idx = state.transactions.findIndex(t => t.id === args.id);
      if (idx === -1) return `❌ Transaction with ID "${args.id}" not found.`;
      const current = state.transactions[idx];
      if (args.amount !== undefined) current.amount = args.amount;
      if (args.description !== undefined) current.description = args.description;
      if (args.type !== undefined) current.type = args.type;
      if (args.date !== undefined) current.date = new Date(args.date).toISOString();
      if (args.account !== undefined) current.accountId = resolveAccount(state.accounts, args.account).id;
      if (args.category !== undefined) current.categoryId = resolveCategory(state.categories, args.category, current.type).id;
      state.transactions[idx] = current;
      await writeServerState(state);
      return `✅ Updated transaction ${args.id}: "${current.description}" (${formatMoney(current.amount, state.currency)})`;
    }

    case 'delete_transaction': {
      const txn = state.transactions.find(t => t.id === args.id);
      if (!txn) return `❌ Transaction with ID "${args.id}" not found.`;
      state.transactions = state.transactions.filter(t => t.id !== args.id);
      state.ledger = (state.ledger || []).filter(l => l.transactionId !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted transaction "${txn.description}" (${formatMoney(txn.amount, state.currency)}).`;
    }

    case 'list_accounts': {
      const balances = calculateAccountBalances(state);
      let totalLiquid = 0;
      const lines = balances.map(a => {
        totalLiquid += a.balance;
        return `• ${a.name} [${a.assetType}] ${a.isBusiness ? '(Business)' : '(Personal)'}\n` +
               `  Balance: ${formatMoney(a.balance, state.currency)} | Inflow: ${formatMoney(a.income, state.currency)} | Outflow: ${formatMoney(a.expense, state.currency)} | ID: ${a.id}`;
      });
      return `📊 Total Liquid Assets: ${formatMoney(totalLiquid, state.currency)}\n\nAccounts:\n` + lines.join('\n\n');
    }

    case 'add_account': {
      const newAcc: Account = {
        id: uid('acc'),
        name: args.name,
        assetType: args.assetType || 'checking',
        incomeSource: args.incomeSource || 'salary',
        color: args.color || '#3b82f6',
        isBusiness: args.isBusiness || false
      };
      state.accounts.push(newAcc);
      if (args.initialBalance) {
        state.transactions.unshift({
          id: uid('txn'),
          type: args.initialBalance > 0 ? 'income' : 'expense',
          amount: Math.abs(args.initialBalance),
          accountId: newAcc.id,
          categoryId: resolveCategory(state.categories, 'Salary', 'income').id,
          description: 'Initial Balance',
          date: new Date().toISOString()
        });
      }
      await writeServerState(state);
      return `✅ Created account "${newAcc.name}" [${newAcc.assetType}] (ID: ${newAcc.id})`;
    }

    case 'update_account': {
      const acc = state.accounts.find(a => a.id === args.id);
      if (!acc) return `❌ Account "${args.id}" not found.`;
      if (args.name !== undefined) acc.name = args.name;
      if (args.assetType !== undefined) acc.assetType = args.assetType;
      if (args.color !== undefined) acc.color = args.color;
      if (args.isBusiness !== undefined) acc.isBusiness = args.isBusiness;
      await writeServerState(state);
      return `✅ Updated account "${acc.name}".`;
    }

    case 'delete_account': {
      state.accounts = state.accounts.filter(a => a.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted account "${args.id}".`;
    }

    case 'list_categories': {
      const formatCat = (c: Category) => `• ${c.icon || '📁'} ${c.name} ${c.monthlyBudget ? `(Budget: ${formatMoney(c.monthlyBudget, state.currency)})` : ''} [ID: ${c.id}]`;
      const exp = state.categories.filter(c => c.type === 'expense' || c.type === 'both');
      const inc = state.categories.filter(c => c.type === 'income' || c.type === 'both');
      return `📂 EXPENSE CATEGORIES:\n${exp.map(formatCat).join('\n')}\n\n💼 INCOME CATEGORIES:\n${inc.map(formatCat).join('\n')}`;
    }

    case 'add_category': {
      const newCat: Category = {
        id: uid('cat'),
        name: args.name,
        type: args.type || 'expense',
        icon: args.icon || '📁',
        color: args.color || '#3b82f6',
        monthlyBudget: args.monthlyBudget,
        isBusiness: args.isBusiness || false
      };
      state.categories.push(newCat);
      await writeServerState(state);
      return `✅ Added category ${newCat.icon} ${newCat.name} (ID: ${newCat.id})`;
    }

    case 'update_category': {
      const cat = state.categories.find(c => c.id === args.id);
      if (!cat) return `❌ Category "${args.id}" not found.`;
      if (args.name !== undefined) cat.name = args.name;
      if (args.icon !== undefined) cat.icon = args.icon;
      if (args.monthlyBudget !== undefined) cat.monthlyBudget = args.monthlyBudget;
      await writeServerState(state);
      return `✅ Updated category "${cat.name}".`;
    }

    case 'delete_category': {
      state.categories = state.categories.filter(c => c.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted category "${args.id}".`;
    }

    case 'list_budget_goals': {
      const targetMonth = args.month || new Date().toISOString().slice(0, 7);
      const spendMap: Record<string, number> = {};
      state.transactions.forEach(t => {
        if (t.type === 'expense' && t.date.slice(0, 7) === targetMonth) {
          spendMap[t.categoryId] = (spendMap[t.categoryId] || 0) + t.amount;
        }
      });
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
      return `🎯 Budget Report for ${targetMonth}:\n\n` + (lines.length ? lines.join('\n') : 'No budget limits set.');
    }

    case 'set_budget_goal': {
      const cat = resolveCategory(state.categories, args.category, 'expense');
      const month = args.month || new Date().toISOString().slice(0, 7);
      cat.monthlyBudget = args.monthlyLimit;
      const idx = state.budgetGoals.findIndex(g => g.categoryId === cat.id && g.month === month);
      if (idx !== -1) {
        state.budgetGoals[idx].monthlyLimit = args.monthlyLimit;
      } else {
        state.budgetGoals.push({
          id: uid('goal'),
          categoryId: cat.id,
          monthlyLimit: args.monthlyLimit,
          month,
          goalType: 'spend'
        });
      }
      await writeServerState(state);
      return `✅ Set budget limit for "${cat.name}" to ${formatMoney(args.monthlyLimit, state.currency)} for ${month}.`;
    }

    case 'delete_budget_goal': {
      state.budgetGoals = (state.budgetGoals || []).filter(g => g.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted budget goal "${args.id}".`;
    }

    case 'list_recurring': {
      const items = state.recurringTransactions || [];
      if (!items.length) return 'No recurring bills or subscriptions set up.';
      const lines = items.map(r => `• ${r.description} (${r.frequency}) - ${formatMoney(r.amount, state.currency)} | Next Due: ${r.nextDueDate} | Status: ${r.active ? '🟢 ACTIVE' : '⚪ PAUSED'} | ID: ${r.id}`);
      return `📅 Recurring Subscriptions & Bills:\n\n${lines.join('\n')}`;
    }

    case 'add_recurring': {
      const account = resolveAccount(state.accounts, args.account);
      const category = resolveCategory(state.categories, args.category, args.type);
      const rec = {
        id: uid('rec'),
        description: args.description,
        amount: args.amount,
        frequency: args.frequency || 'monthly',
        nextDueDate: args.nextDueDate,
        type: args.type || 'expense',
        accountId: account.id,
        categoryId: category.id,
        active: true,
        isEmi: args.isEmi || false,
        totalInstallments: args.totalInstallments,
        paidInstallments: 0,
        isBusiness: args.isBusiness || false
      };
      state.recurringTransactions.push(rec as any);
      await writeServerState(state);
      return `✅ Created recurring ${rec.type}: "${rec.description}" of ${formatMoney(rec.amount, state.currency)} (${rec.frequency}) | Next Due: ${rec.nextDueDate}`;
    }

    case 'mark_recurring_paid': {
      const r = state.recurringTransactions.find(item => item.id === args.id);
      if (!r) return `❌ Recurring transaction with ID "${args.id}" not found.`;
      state.transactions.unshift({
        id: uid('txn'),
        type: r.type,
        amount: r.amount,
        accountId: r.accountId,
        categoryId: r.categoryId,
        description: `${r.description} (Recurring)`,
        date: new Date().toISOString(),
        linkedRecurringId: r.id
      });
      const d = new Date(r.nextDueDate);
      if (r.frequency === 'daily') d.setDate(d.getDate() + 1);
      else if (r.frequency === 'weekly') d.setDate(d.getDate() + 7);
      else if (r.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (r.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
      r.nextDueDate = d.toISOString().slice(0, 10);
      await writeServerState(state);
      return `✅ Marked "${r.description}" as PAID! Advanced next due date to ${r.nextDueDate}.`;
    }

    case 'delete_recurring': {
      state.recurringTransactions = (state.recurringTransactions || []).filter(item => item.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted recurring item "${args.id}".`;
    }

    case 'list_debts': {
      const debts = state.debts || [];
      if (!debts.length) return '🎉 No outstanding debts recorded!';
      let totalDebt = 0;
      const lines = debts.map(d => {
        totalDebt += d.balance;
        return `• ${d.name} [${d.type}] - Outstanding: ${formatMoney(d.balance, state.currency)} | Interest: ${d.interestRate}% | ID: ${d.id}`;
      });
      return `💳 Total Outstanding Debt: ${formatMoney(totalDebt, state.currency)}\n\n${lines.join('\n')}`;
    }

    case 'add_debt': {
      const debt = {
        id: uid('debt'),
        name: args.name,
        balance: args.balance,
        interestRate: args.interestRate,
        minimumPayment: args.minimumPayment,
        dueDate: args.dueDate || new Date().toISOString().slice(0, 10),
        type: args.type || 'loan',
        isBusiness: args.isBusiness || false
      };
      state.debts = [...(state.debts || []), debt as any];
      await writeServerState(state);
      return `✅ Added debt "${debt.name}" with balance ${formatMoney(debt.balance, state.currency)} (ID: ${debt.id}).`;
    }

    case 'record_debt_payment': {
      const debt = state.debts.find(d => d.id === args.debtId);
      if (!debt) return `❌ Debt with ID "${args.debtId}" not found.`;
      const account = resolveAccount(state.accounts, args.account);
      debt.balance = Math.max(0, debt.balance - args.amount);
      state.transactions.unshift({
        id: uid('txn'),
        type: 'expense',
        amount: args.amount,
        accountId: account.id,
        categoryId: resolveCategory(state.categories, 'Debt Payment', 'expense').id,
        description: `Debt Payment: ${debt.name}`,
        date: new Date().toISOString(),
        linkedDebtId: debt.id
      });
      await writeServerState(state);
      return `✅ Recorded ${formatMoney(args.amount, state.currency)} payment towards "${debt.name}". Remaining Balance: ${formatMoney(debt.balance, state.currency)}`;
    }

    case 'delete_debt': {
      state.debts = (state.debts || []).filter(item => item.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted debt "${args.id}".`;
    }

    case 'list_savings_goals': {
      const goals = state.savingsGoals || [];
      if (!goals.length) return 'No savings goals found.';
      const lines = goals.map(g => {
        const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
        return `• 🏆 ${g.name}: ${formatMoney(g.currentAmount, state.currency)} / ${formatMoney(g.targetAmount, state.currency)} (${pct}%) | ID: ${g.id}`;
      });
      return `🎯 Savings Goals:\n\n${lines.join('\n')}`;
    }

    case 'add_savings_goal': {
      const goal = {
        id: uid('goal'),
        name: args.name,
        targetAmount: args.targetAmount,
        currentAmount: args.currentAmount || 0,
        deadline: args.deadline,
        color: args.color || '#22c55e',
        isBusiness: args.isBusiness || false
      };
      state.savingsGoals = [...(state.savingsGoals || []), goal as any];
      await writeServerState(state);
      return `✅ Created savings goal "${goal.name}" with target ${formatMoney(goal.targetAmount, state.currency)} (ID: ${goal.id}).`;
    }

    case 'contribute_savings_goal': {
      const goal = state.savingsGoals.find(g => g.id === args.goalId);
      if (!goal) return `❌ Savings goal with ID "${args.goalId}" not found.`;
      const account = resolveAccount(state.accounts, args.account);
      goal.currentAmount += args.amount;
      state.transactions.unshift({
        id: uid('txn'),
        type: 'expense',
        amount: args.amount,
        accountId: account.id,
        categoryId: resolveCategory(state.categories, 'Investments', 'expense').id,
        description: `Savings Contribution: ${goal.name}`,
        date: new Date().toISOString(),
        linkedSavingsGoalId: goal.id
      });
      await writeServerState(state);
      const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
      return `✅ Added ${formatMoney(args.amount, state.currency)} to "${goal.name}". Progress: ${formatMoney(goal.currentAmount, state.currency)} / ${formatMoney(goal.targetAmount, state.currency)} (${pct}%)`;
    }

    case 'delete_savings_goal': {
      state.savingsGoals = (state.savingsGoals || []).filter(item => item.id !== args.id);
      await writeServerState(state);
      return `🗑️ Deleted savings goal "${args.id}".`;
    }

    case 'get_financial_overview': {
      const balances = calculateAccountBalances(state);
      let liquidCash = 0;
      balances.forEach(a => { liquidCash += a.balance; });
      let totalDebts = 0;
      (state.debts || []).forEach(d => { totalDebts += d.balance; });
      let totalSaved = 0;
      (state.savingsGoals || []).forEach(g => { totalSaved += g.currentAmount; });
      const totalNetWorth = liquidCash + totalSaved - totalDebts;

      const curMonth = new Date().toISOString().slice(0, 7);
      let monthIncome = 0;
      let monthExpense = 0;
      state.transactions.forEach(t => {
        if (t.date.slice(0, 7) === curMonth) {
          if (t.type === 'income') monthIncome += t.amount;
          if (t.type === 'expense') monthExpense += t.amount;
        }
      });

      const accSummary = balances.map(a => `  • ${a.name}: ${formatMoney(a.balance, state.currency)}`);
      return `👑 SOLV FINANCIAL OVERVIEW (${curMonth})\n\n` +
             `💰 NET WORTH: ${formatMoney(totalNetWorth, state.currency)}\n` +
             `• Liquid Cash in Accounts: ${formatMoney(liquidCash, state.currency)}\n` +
             `• Total Investments & Savings: ${formatMoney(totalSaved, state.currency)}\n` +
             `• Total Outstanding Debts: ${formatMoney(totalDebts, state.currency)}\n\n` +
             `📈 THIS MONTH'S CASH FLOW:\n` +
             `• Income: ${formatMoney(monthIncome, state.currency)}\n` +
             `• Expenses: ${formatMoney(monthExpense, state.currency)}\n` +
             `• Net Savings: ${formatMoney(monthIncome - monthExpense, state.currency)}\n\n` +
             `🏦 ACCOUNTS BREAKDOWN:\n${accSummary.join('\n')}`;
    }

    case 'get_category_spending': {
      const targetMonth = args.month || new Date().toISOString().slice(0, 7);
      let totalExpense = 0;
      const catSpend: Record<string, number> = {};
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
      return `📊 SPENDING BREAKDOWN FOR ${targetMonth}:\nTotal Expenses: ${formatMoney(totalExpense, state.currency)}\n\n` + (lines.length ? lines.join('\n') : 'No expenses recorded.');
    }

    default:
      return `❌ Unknown tool "${name}"`;
  }
}
