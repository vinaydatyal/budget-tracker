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
export async function initOrLoadUser(user: User, localFallbackState?: AppState): Promise<UserInitResult> {
  if (!db || !user?.uid) {
    return { state: localFallbackState || DEFAULT_STATE, isNewUser: false };
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    const hasLocalTransactions = localFallbackState && localFallbackState.transactions && localFallbackState.transactions.length > 0;

    // Check if shared state has transactions to bootstrap from
    let sharedCandidate: AppState | null = null;
    try {
      const sharedSnap = await getDoc(doc(db, 'shared', 'budget_app_state'));
      if (sharedSnap.exists()) {
        const sharedData = sharedSnap.data();
        if (sharedData?.state && Array.isArray(sharedData.state.transactions) && sharedData.state.transactions.length > 0) {
          sharedCandidate = sharedData.state;
        }
      }
    } catch {}

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

      const rawCloudState = data?.state;
      const cloudTxns = rawCloudState?.transactions || [];

      // If cloud already has transactions, use cloud state
      if (cloudTxns.length > 0) {
        const cloudState: AppState = {
          ...DEFAULT_STATE,
          ...rawCloudState,
          transactions: cloudTxns,
          accounts: rawCloudState.accounts && rawCloudState.accounts.length > 0 ? rawCloudState.accounts : DEFAULT_STATE.accounts,
          categories: rawCloudState.categories && rawCloudState.categories.length > 0 ? rawCloudState.categories : DEFAULT_STATE.categories,
          budgetGoals: rawCloudState.budgetGoals || [],
          recurringTransactions: rawCloudState.recurringTransactions || [],
          debts: rawCloudState.debts || [],
          savingsGoals: rawCloudState.savingsGoals || [],
          ledger: rawCloudState.ledger || []
        };
        return { state: cloudState, isNewUser: false };
      }

      // If cloud exists but has 0 transactions, and user has local transactions, MIGRATE local data to cloud!
      if (hasLocalTransactions && localFallbackState) {
        await setDoc(userDocRef, {
          state: localFallbackState,
          updatedAt: Date.now()
        }, { merge: true });
        console.log(`[Firebase] Migrated ${localFallbackState.transactions.length} local transactions to cloud user: ${user.uid}`);
        return { state: localFallbackState, isNewUser: false };
      }

      // If cloud has 0 transactions and local is empty, seed from shared state if available
      if (sharedCandidate && sharedCandidate.transactions && sharedCandidate.transactions.length > 0) {
        await setDoc(userDocRef, {
          state: sharedCandidate,
          updatedAt: Date.now()
        }, { merge: true });
        console.log(`[Firebase] Seeded ${sharedCandidate.transactions.length} shared transactions to returning cloud user: ${user.uid}`);
        return { state: sharedCandidate, isNewUser: false };
      }

      return { state: DEFAULT_STATE, isNewUser: false };
    } else {
      // BRAND NEW USER IN FIREBASE!
      // If user had local data before signing in, migrate it rather than wiping with DEFAULT_STATE!
      const initialCandidate = (hasLocalTransactions && localFallbackState) 
        ? localFallbackState 
        : ((sharedCandidate && sharedCandidate.transactions && sharedCandidate.transactions.length > 0) ? sharedCandidate : DEFAULT_STATE);

      const initialUserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        photoURL: user.photoURL || '',
        authProvider: user.providerData?.[0]?.providerId || 'google.com',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
        state: initialCandidate
      };

      await setDoc(userDocRef, initialUserData);
      console.log(`[Firebase] Initialized new user in Firestore: ${user.uid} with ${initialCandidate.transactions.length} records`);
      return { state: initialCandidate, isNewUser: true };
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
