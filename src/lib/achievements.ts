import { AppState } from './types';

export interface Quest {
  id: string;
  title: string;
  description: string | ((state: AppState) => string);
  icon: string;
  evaluate: (state: AppState) => boolean;
  getProgress?: (state: AppState) => { current: number; max: number; label?: string };
}

const baseQuests: Quest[] = [
  {
    id: 'first_log',
    title: 'First Steps',
    description: 'Log your very first transaction.',
    icon: '🎉',
    evaluate: (state) => state.transactions.length > 0,
    getProgress: (state) => ({ current: state.transactions.length > 0 ? 1 : 0, max: 1 })
  },
  {
    id: 'debt_slayer',
    title: 'Debt Slayer',
    description: 'Pay off a debt completely.',
    icon: '⚔️',
    evaluate: (state) => state.debts.some(d => d.balance === 0),
    getProgress: (state) => ({ current: state.debts.some(d => d.balance === 0) ? 1 : 0, max: 1 })
  },
  {
    id: 'budget_master',
    title: 'Budget Master',
    description: 'Create a monthly budget.',
    icon: '📊',
    evaluate: (state) => state.budgetGoals.length > 0,
    getProgress: (state) => ({ current: state.budgetGoals.length > 0 ? 1 : 0, max: 1 })
  },
  {
    id: 'subscription_auditor',
    title: 'Subscription Auditor',
    description: 'Set up an active recurring transaction.',
    icon: '🔄',
    evaluate: (state) => state.recurringTransactions.length > 0,
    getProgress: (state) => ({ current: state.recurringTransactions.length > 0 ? 1 : 0, max: 1 })
  }
];

// Procedurally generate tiered quests
const logTiers = [
  { count: 5, icon: '📝', title: 'Getting Started' },
  { count: 10, icon: '📓', title: 'Habit Builder' },
  { count: 25, icon: '📚', title: 'Dedicated Tracker' },
  { count: 50, icon: '🔥', title: 'Unstoppable' },
  { count: 100, icon: '💯', title: 'Centurion' },
  { count: 250, icon: '⭐', title: 'Super Tracker' },
  { count: 500, icon: '🌟', title: 'Legendary Tracker' },
  { count: 1000, icon: '👑', title: 'Grandmaster' },
];

const logQuests: Quest[] = logTiers.map(tier => ({
  id: `log_count_${tier.count}`,
  title: tier.title,
  description: `Log ${tier.count} transactions.`,
  icon: tier.icon,
  evaluate: (state) => state.transactions.length >= tier.count,
  getProgress: (state) => ({ current: state.transactions.length, max: tier.count })
}));

const streakTiers = [
  { days: 7, icon: '🥉', title: '1-Week Streak' },
  { days: 14, icon: '🥈', title: '2-Week Streak' },
  { days: 30, icon: '🥇', title: 'Monthly Streak' },
  { days: 60, icon: '💎', title: '2-Month Streak' },
  { days: 100, icon: '🔥', title: '100-Day Streak' },
  { days: 365, icon: '🌍', title: 'A Full Year' },
];

const streakQuests: Quest[] = streakTiers.map(tier => ({
  id: `streak_${tier.days}`,
  title: tier.title,
  description: `Log transactions on ${tier.days} unique days.`,
  icon: tier.icon,
  evaluate: (state) => {
    const uniqueDates = new Set(state.transactions.map(t => t.date.split('T')[0]));
    return uniqueDates.size >= tier.days;
  },
  getProgress: (state) => {
    const uniqueDates = new Set(state.transactions.map(t => t.date.split('T')[0]));
    return { current: uniqueDates.size, max: tier.days };
  }
}));

const wealthTiers = [
  { amt: 1000, icon: '💵', title: 'Thousandaire' },
  { amt: 5000, icon: '💸', title: 'Stacking Bills' },
  { amt: 10000, icon: '💰', title: 'Ten Grand' },
  { amt: 50000, icon: '🏦', title: 'Half a Hundred' },
  { amt: 100000, icon: '🏰', title: 'Six Figures' },
  { amt: 250000, icon: '👑', title: 'Quarter Million' },
  { amt: 500000, icon: '💎', title: 'Half Millionaire' },
  { amt: 1000000, icon: '🚀', title: 'Millionaire' },
];

const wealthQuests: Quest[] = wealthTiers.map(tier => ({
  id: `wealth_${tier.amt}`,
  title: tier.title,
  description: (state) => `Reach a Net Worth of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency || 'USD', maximumFractionDigits: 0 }).format(tier.amt)}.`,
  icon: tier.icon,
  evaluate: (state) => {
    const income = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return (income - expenses) >= tier.amt;
  },
  getProgress: (state) => {
    const income = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { current: Math.max(0, income - expenses), max: tier.amt, label: 'currency' };
  }
}));

const savingsTiers = [
  { amt: 100, icon: '🐖', title: 'Piggy Bank' },
  { amt: 500, icon: ' jar', title: 'Savings Jar' },
  { amt: 1000, icon: '📈', title: 'Serious Saver' },
  { amt: 5000, icon: '🛡️', title: 'Safety Net' },
  { amt: 10000, icon: '🏆', title: 'Savings Champion' },
  { amt: 50000, icon: '🌟', title: 'Vault Keeper' },
];

const savingsQuests: Quest[] = savingsTiers.map(tier => ({
  id: `savings_${tier.amt}`,
  title: tier.title,
  description: (state) => `Accumulate ${new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency || 'USD', maximumFractionDigits: 0 }).format(tier.amt)} across your Savings Goals.`,
  icon: tier.icon,
  evaluate: (state) => {
    const totalSaved = state.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    return totalSaved >= tier.amt;
  },
  getProgress: (state) => {
    const totalSaved = state.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    return { current: totalSaved, max: tier.amt, label: 'currency' };
  }
}));

const createCategoryQuest = (id: string, title: string, categoryNames: string[], count: number, icon: string): Quest => ({
  id: `cat_${id}_${count}`,
  title,
  description: `Log ${count} ${categoryNames[0]} expenses.`,
  icon,
  evaluate: (s) => s.transactions.filter(t => t.type === 'expense' && categoryNames.some(name => s.categories.find(c => c.id === t.categoryId)?.name.includes(name))).length >= count,
  getProgress: (s) => {
    const current = s.transactions.filter(t => t.type === 'expense' && categoryNames.some(name => s.categories.find(c => c.id === t.categoryId)?.name.includes(name))).length;
    return { current, max: count };
  }
});

const categoryQuests: Quest[] = [
  createCategoryQuest('food', 'Foodie', ['Food'], 10, '🍔'),
  createCategoryQuest('food', 'Gourmet', ['Food'], 50, '🍕'),
  createCategoryQuest('transport', 'Commuter', ['Transport'], 10, '🚗'),
  createCategoryQuest('transport', 'Road Warrior', ['Transport'], 50, '✈️'),
  createCategoryQuest('shopping', 'Shopper', ['Shopping'], 10, '🛍️'),
  createCategoryQuest('shopping', 'Shopaholic', ['Shopping'], 50, '🎁'),
  createCategoryQuest('entertainment', 'Fun Seeker', ['Entertainment'], 10, '🎮'),
  createCategoryQuest('entertainment', 'Life of the Party', ['Entertainment'], 50, '🎫'),
  createCategoryQuest('housing', 'Homebody', ['Housing'], 10, '🏠'),
  createCategoryQuest('housing', 'Interior Designer', ['Housing'], 50, '🛋️'),
  createCategoryQuest('health', 'Health Conscious', ['Health'], 10, '🏥'),
  createCategoryQuest('health', 'Biohacker', ['Health'], 50, '⚕️'),
];

const debtTiers = [
  { count: 1, icon: '⚔️', title: 'First Victory' },
  { count: 3, icon: '🛡️', title: 'Debt Defender' },
  { count: 5, icon: '🗡️', title: 'Debt Slayer' },
  { count: 10, icon: '💣', title: 'Debt Destroyer' },
];

const debtQuests: Quest[] = debtTiers.map(tier => ({
  id: `debt_count_${tier.count}`,
  title: tier.title,
  description: `Fully pay off ${tier.count} debts.`,
  icon: tier.icon,
  evaluate: (state) => state.debts.filter(d => d.balance === 0).length >= tier.count,
  getProgress: (state) => ({ current: state.debts.filter(d => d.balance === 0).length, max: tier.count })
}));

export const QUESTS: Quest[] = [
  ...baseQuests,
  ...logQuests,
  ...streakQuests,
  ...wealthQuests,
  ...savingsQuests,
  ...categoryQuests,
  ...debtQuests
];
