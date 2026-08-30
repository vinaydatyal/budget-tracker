const fs = require('fs');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const transactions = [];

const personalCategories = [
  'cat-1', // Salary
  'cat-2', // Freelance
  'cat-4a', // Groceries
  'cat-4b', // Restaurants
  'cat-5a', // Rent
  'cat-5b', // Maintenance
  'cat-6', // Transport
  'cat-7', // Shopping
  'cat-8', // Healthcare
  'cat-9', // Entertainment
  'cat-10', // Utilities
];

const businessCategories = [
  'cat-b1', // Consulting
  'cat-b2', // Software Subs
  'cat-b3', // Office Supplies
  'cat-b4', // Business Travel
];

// Generate last 6 months of data
const now = new Date();
for (let m = 5; m >= 0; m--) {
  const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();

  // --- PERSONAL DATA ---
  // Salary
  transactions.push({
    id: `demo-${uid()}`,
    type: 'income',
    amount: 5000,
    categoryId: 'cat-1',
    accountId: 'acc-1',
    description: 'Monthly Salary',
    date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString(),
    isBusiness: false,
  });

  // Rent
  transactions.push({
    id: `demo-${uid()}`,
    type: 'expense',
    amount: 1500,
    categoryId: 'cat-5a',
    accountId: 'acc-1',
    description: 'Apartment Rent',
    date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 2).toISOString(),
    isBusiness: false,
  });

  // Random personal expenses
  for (let i = 0; i < 15; i++) {
    const day = randomInt(1, daysInMonth);
    const cat = ['cat-4a', 'cat-4b', 'cat-6', 'cat-7', 'cat-9', 'cat-10'][randomInt(0, 5)];
    transactions.push({
      id: `demo-${uid()}`,
      type: 'expense',
      amount: randomInt(15, 120),
      categoryId: cat,
      accountId: 'acc-3', // Credit Card
      description: 'Misc Expense',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toISOString(),
      isBusiness: false,
    });
  }

  // --- BUSINESS DATA ---
  // Consulting Income
  for (let i = 0; i < randomInt(2, 4); i++) {
    const day = randomInt(1, daysInMonth);
    transactions.push({
      id: `demo-${uid()}`,
      type: 'income',
      amount: randomInt(800, 3500),
      categoryId: 'cat-b1',
      accountId: 'acc-b1',
      description: 'Client Payment',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toISOString(),
      isBusiness: true,
      revenueSourceId: randomInt(0, 1) === 0 ? 'src-1' : 'src-2',
    });
  }

  // Business Expenses
  for (let i = 0; i < randomInt(3, 8); i++) {
    const day = randomInt(1, daysInMonth);
    const cat = ['cat-b2', 'cat-b3', 'cat-b4'][randomInt(0, 2)];
    transactions.push({
      id: `demo-${uid()}`,
      type: 'expense',
      amount: randomInt(20, 300),
      categoryId: cat,
      accountId: 'acc-b1',
      description: 'Business Expense',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toISOString(),
      isBusiness: true,
    });
  }
}

fs.writeFileSync('./src/lib/demoData.ts', `import { Transaction } from './types';\n\nexport const DEMO_TRANSACTIONS: Transaction[] = ${JSON.stringify(transactions, null, 2)};\n`);
console.log('Done generating demo data TS');
