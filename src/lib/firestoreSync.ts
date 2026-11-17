import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppState } from './types';
import { DEFAULT_STATE } from './storage';

export async function loadUserCloudState(userId: string): Promise<AppState | null> {
  if (!db || !userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.state) {
        return {
          ...DEFAULT_STATE,
          ...data.state,
          transactions: data.state.transactions || [],
          accounts: data.state.accounts || [],
          categories: data.state.categories || [],
          budgetGoals: data.state.budgetGoals || [],
          recurringTransactions: data.state.recurringTransactions || [],
          debts: data.state.debts || [],
          savingsGoals: data.state.savingsGoals || [],
          ledger: data.state.ledger || []
        };
      }
    }
    return null;
  } catch (err: any) {
    console.error('Failed to load user state from Firestore:', err);
    return null;
  }
}

export async function saveUserCloudState(userId: string, state: AppState): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      state,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err: any) {
    console.error('Failed to save user state to Firestore:', err);
  }
}

export function subscribeToUserCloudState(
  userId: string,
  onUpdate: (state: AppState) => void
): () => void {
  if (!db || !userId) return () => {};
  try {
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.state) {
          onUpdate(data.state as AppState);
        }
      }
    }, (err) => {
      console.warn('Firestore snapshot error:', err);
    });
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to Firestore:', err);
    return () => {};
  }
}
