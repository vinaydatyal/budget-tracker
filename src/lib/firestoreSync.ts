import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { AppState } from './types';
import { DEFAULT_STATE } from './storage';

export interface UserInitResult {
  state: AppState;
  isNewUser: boolean;
}

/**
 * Initializes a new user document in Firestore if they are logging in for the first time,
 * or loads their existing cloud state if they are a returning user.
 */
export async function initOrLoadUser(user: User): Promise<UserInitResult> {
  if (!db || !user?.uid) {
    return { state: DEFAULT_STATE, isNewUser: false };
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data();
      // Update last active metadata for returning user
      await setDoc(userDocRef, {
        lastLoginAt: Date.now(),
        displayName: user.displayName || data?.displayName || '',
        photoURL: user.photoURL || data?.photoURL || '',
        email: user.email || data?.email || '',
        authProvider: user.providerData?.[0]?.providerId || data?.authProvider || 'google.com'
      }, { merge: true });

      const cloudState: AppState = data?.state ? {
        ...DEFAULT_STATE,
        ...data.state,
        transactions: data.state.transactions || [],
        accounts: data.state.accounts && data.state.accounts.length > 0 ? data.state.accounts : DEFAULT_STATE.accounts,
        categories: data.state.categories && data.state.categories.length > 0 ? data.state.categories : DEFAULT_STATE.categories,
        budgetGoals: data.state.budgetGoals || [],
        recurringTransactions: data.state.recurringTransactions || [],
        debts: data.state.debts || [],
        savingsGoals: data.state.savingsGoals || [],
        ledger: data.state.ledger || []
      } : DEFAULT_STATE;

      return { state: cloudState, isNewUser: false };
    } else {
      // BRAND NEW USER IN FIREBASE!
      const initialUserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        photoURL: user.photoURL || '',
        authProvider: user.providerData?.[0]?.providerId || 'google.com',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
        state: DEFAULT_STATE // Clean initial state for new user
      };

      await setDoc(userDocRef, initialUserData);
      console.log(`[Firebase] Initialized new user in Firestore: ${user.uid} (${user.email})`);
      return { state: DEFAULT_STATE, isNewUser: true };
    }
  } catch (err: any) {
    console.error('Failed to init/load user from Firestore:', err);
    throw err;
  }
}

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

export async function saveUserCloudState(
  userOrId: User | string,
  state: AppState
): Promise<void> {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.uid;
  if (!db || !userId) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    const payload: any = {
      state,
      updatedAt: Date.now()
    };

    if (typeof userOrId !== 'string') {
      if (userOrId.email) payload.email = userOrId.email;
      if (userOrId.displayName) payload.displayName = userOrId.displayName;
      if (userOrId.photoURL) payload.photoURL = userOrId.photoURL;
      if (userOrId.providerData?.[0]?.providerId) {
        payload.authProvider = userOrId.providerData[0].providerId;
      }
    }

    await setDoc(userDocRef, payload, { merge: true });
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
