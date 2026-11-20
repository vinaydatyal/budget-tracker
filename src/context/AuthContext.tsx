'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  completeMagicLinkSignIn: (emailParam?: string, linkUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
  googleToken: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirebaseConfigured = !!auth;
  const isProcessingLinkRef = React.useRef(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      toast.error('Firebase is not configured! Please check your Firebase config.', { duration: 6000 });
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully! Real-time cloud storage active.', { icon: '☁️' });
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      toast.error(error.message || 'Failed to sign in with Google.');
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) {
      toast.error('Firebase is not configured!', { duration: 6000 });
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success('Welcome back! Signed in successfully.', { icon: '☁️' });
    } catch (error: any) {
      console.error('Error signing in with email', error);
      let msg = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      toast.error(msg);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!auth) {
      toast.error('Firebase is not configured!', { duration: 6000 });
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast.success('Account created! Your private cloud vault is ready.', { icon: '🎉' });
    } catch (error: any) {
      console.error('Error creating account', error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in instead.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      toast.error(msg);
      throw error;
    }
  };

  const sendMagicLink = async (email: string) => {
    if (!auth) {
      toast.error('Firebase is not configured!', { duration: 6000 });
      return;
    }
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://budget-tracker-enterprise.vercel.app/login';
      const actionCodeSettings = {
        url: redirectUrl,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', email);
      }
      toast.success('Magic sign-in link sent to your email! Please check your inbox.', { icon: '✉️', duration: 7000 });
    } catch (error: any) {
      console.error('Error sending magic link', error);
      toast.error(error.message || 'Failed to send sign-in link.');
      throw error;
    }
  };

  const completeMagicLinkSignIn = async (emailParam?: string, linkUrl?: string) => {
    if (!auth) return;
    if (isProcessingLinkRef.current || auth.currentUser) return;

    const url = linkUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!url || !isSignInWithEmailLink(auth, url)) return;

    let email = emailParam;
    if (!email && typeof window !== 'undefined') {
      email = window.localStorage.getItem('emailForSignIn') || '';
    }
    if (!email && typeof window !== 'undefined') {
      email = window.prompt('Please confirm your email address to complete sign in') || '';
    }
    if (!email) {
      toast.error('Email address required to finish sign in.');
      return;
    }

    isProcessingLinkRef.current = true;

    try {
      await signInWithEmailLink(auth, email, url);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('emailForSignIn');
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }
      toast.success('Signed in successfully via email link!', { icon: '🎉' });
    } catch (error: any) {
      // If code was already consumed (e.g. React 18 strict mode double-mount or duplicate click), ignore gracefully
      if (error?.code === 'auth/invalid-action-code') {
        console.warn('Action code already consumed or invalid; ignoring duplicate error.');
        return;
      }
      console.error('Error signing in with email link', error);
      toast.error(error.message || 'Failed to complete sign in with link.');
      throw error;
    } finally {
      setTimeout(() => {
        isProcessingLinkRef.current = false;
      }, 3000);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await fbSignOut(auth);
      toast.success('Signed out.');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      sendMagicLink,
      completeMagicLinkSignIn,
      signOut, 
      isFirebaseConfigured, 
      googleToken: null 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
