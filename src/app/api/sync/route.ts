import { NextResponse } from 'next/server';
import { readServerState, writeServerState } from '@/lib/serverStorage';
import { AppState, Transaction } from '@/lib/types';

export async function GET() {
  try {
    const state = readServerState();
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

    if (!incomingState) {
      return NextResponse.json({ success: false, error: 'No state provided' }, { status: 400 });
    }

    if (!merge) {
      writeServerState(incomingState);
      return NextResponse.json({ success: true, state: incomingState });
    }

    // Merge logic
    const current = readServerState();
    const existingTxnIds = new Set(current.transactions.map(t => t.id));
    const mergedTxns: Transaction[] = [...current.transactions];

    (incomingState.transactions || []).forEach(t => {
      if (!existingTxnIds.has(t.id)) {
        mergedTxns.push(t);
        existingTxnIds.add(t.id);
      }
    });

    const mergedState: AppState = {
      ...current,
      ...incomingState,
      transactions: mergedTxns,
      accounts: incomingState.accounts?.length ? incomingState.accounts : current.accounts,
      categories: incomingState.categories?.length ? incomingState.categories : current.categories,
      budgetGoals: incomingState.budgetGoals?.length ? incomingState.budgetGoals : current.budgetGoals,
      recurringTransactions: incomingState.recurringTransactions?.length ? incomingState.recurringTransactions : current.recurringTransactions,
      debts: incomingState.debts?.length ? incomingState.debts : current.debts,
      savingsGoals: incomingState.savingsGoals?.length ? incomingState.savingsGoals : current.savingsGoals,
    };

    writeServerState(mergedState);
    return NextResponse.json({ success: true, state: mergedState });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
