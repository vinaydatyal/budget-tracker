import { NextResponse } from 'next/server';
import { readServerState, writeServerState } from '@/lib/serverStorage';
import { AppState, Transaction } from '@/lib/types';
import { DEFAULT_STATE } from '@/lib/storage';

export async function GET() {
  try {
    const state = await readServerState();
    return NextResponse.json({ success: true, state, timestamp: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incomingState: AppState = body.state;
    const merge: boolean = !!body.merge;
    const allowEmpty: boolean = !!body.allowEmpty;

    if (!incomingState) {
      return NextResponse.json({ success: false, error: 'No state provided' }, { status: 400 });
    }

    const current = await readServerState();
    const incomingTxnsCount = incomingState.transactions?.length || 0;
    const currentTxnsCount = current.transactions?.length || 0;

    // Safety guard: If incoming state is empty/zero transactions and NOT explicitly flagged as allowEmpty,
    // NEVER wipe existing server data (protects against background refresh clobbering)
    if (!allowEmpty && incomingTxnsCount === 0 && currentTxnsCount > 0) {
      return NextResponse.json({
        success: true,
        state: current,
        message: 'Preserved existing cloud dataset against empty payload'
      });
    }

    if (!merge) {
      await writeServerState(incomingState, allowEmpty);
      return NextResponse.json({ success: true, state: incomingState });
    }

    // Merge logic
    // 1. Transactions: Union by ID
    const existingTxnIds = new Set((current.transactions || []).map(t => t.id));
    const mergedTxns: Transaction[] = [...(current.transactions || [])];

    (incomingState.transactions || []).forEach(t => {
      if (!existingTxnIds.has(t.id)) {
        mergedTxns.push(t);
        existingTxnIds.add(t.id);
      }
    });

    // 2. Accounts: Non-destructive union by ID / lowercase name
    const mergedAccounts = [...(current.accounts || [])];
    const accountKey = (a: any) => `${a.id || ''}:${(a.name || '').trim().toLowerCase()}`;
    const seenAccounts = new Set(mergedAccounts.map(accountKey));

    (incomingState.accounts || []).forEach(a => {
      const key = accountKey(a);
      if (!seenAccounts.has(key)) {
        mergedAccounts.push(a);
        seenAccounts.add(key);
      }
    });

    // 3. Categories: Non-destructive union by ID / lowercase name
    const mergedCategories = [...(current.categories || [])];
    const categoryKey = (c: any) => `${c.id || ''}:${(c.name || '').trim().toLowerCase()}`;
    const seenCategories = new Set(mergedCategories.map(categoryKey));

    (incomingState.categories || []).forEach(c => {
      const key = categoryKey(c);
      if (!seenCategories.has(key)) {
        mergedCategories.push(c);
        seenCategories.add(key);
      }
    });

    // 4. Budget Goals: Union by ID
    const mergedBudgets = [...(current.budgetGoals || [])];
    const seenBudgets = new Set(mergedBudgets.map(b => b.id));
    (incomingState.budgetGoals || []).forEach(b => {
      if (!seenBudgets.has(b.id)) {
        mergedBudgets.push(b);
        seenBudgets.add(b.id);
      }
    });

    // 5. Recurring Transactions: Union by ID
    const mergedRecurring = [...(current.recurringTransactions || [])];
    const seenRecurring = new Set(mergedRecurring.map(r => r.id));
    (incomingState.recurringTransactions || []).forEach(r => {
      if (!seenRecurring.has(r.id)) {
        mergedRecurring.push(r);
        seenRecurring.add(r.id);
      }
    });

    // 6. Debts: Union by ID
    const mergedDebts = [...(current.debts || [])];
    const seenDebts = new Set(mergedDebts.map(d => d.id));
    (incomingState.debts || []).forEach(d => {
      if (!seenDebts.has(d.id)) {
        mergedDebts.push(d);
        seenDebts.add(d.id);
      }
    });

    // 7. Savings Goals: Union by ID
    const mergedSavings = [...(current.savingsGoals || [])];
    const seenSavings = new Set(mergedSavings.map(s => s.id));
    (incomingState.savingsGoals || []).forEach(s => {
      if (!seenSavings.has(s.id)) {
        mergedSavings.push(s);
        seenSavings.add(s.id);
      }
    });

    const mergedState: AppState = {
      ...DEFAULT_STATE,
      ...current,
      ...incomingState,
      transactions: mergedTxns,
      accounts: mergedAccounts.length > 0 ? mergedAccounts : current.accounts,
      categories: mergedCategories.length > 0 ? mergedCategories : current.categories,
      budgetGoals: mergedBudgets.length > 0 ? mergedBudgets : current.budgetGoals,
      recurringTransactions: mergedRecurring.length > 0 ? mergedRecurring : current.recurringTransactions,
      debts: mergedDebts.length > 0 ? mergedDebts : current.debts,
      savingsGoals: mergedSavings.length > 0 ? mergedSavings : current.savingsGoals,
      preferences: incomingState.preferences?.hasCompletedOnboarding ? incomingState.preferences : (current.preferences || incomingState.preferences),
      currency: (current.currency && current.currency !== 'USD') ? current.currency : (incomingState.currency || current.currency || 'USD'),
    };

    await writeServerState(mergedState);
    return NextResponse.json({ success: true, state: mergedState });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const current = await readServerState();
    const beforeCount = (current.transactions || []).length;
    current.transactions = (current.transactions || []).filter(t => t.id !== id);
    current.ledger = (current.ledger || []).filter(l => l.transactionId !== id);

    // Explicit deletion permits ledger to reach 0 rows
    await writeServerState(current, true /* allowEmpty */);

    return NextResponse.json({
      success: true,
      deletedId: id,
      removed: beforeCount > current.transactions.length,
      remaining: current.transactions.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
