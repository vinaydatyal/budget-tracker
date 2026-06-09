'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { bg: 'var(--income-subtle)', border: 'var(--income)', color: 'var(--income)' },
  warning: { bg: 'var(--warning-subtle)', border: 'var(--warning)', color: 'var(--warning)' },
  error:   { bg: 'var(--expense-subtle)', border: 'var(--expense)', color: 'var(--expense)' },
  info:    { bg: 'var(--accent-subtle)',  border: 'var(--accent)',  color: 'var(--accent)'  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  // Listen for budget alerts fired from AppContext
  useEffect(() => {
    function handler(e: Event) {
      const { msg, type } = (e as CustomEvent).detail;
      toast(msg, type);
    }
    window.addEventListener('budget-alert', handler);
    return () => window.removeEventListener('budget-alert', handler);
  }, [toast]);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12, minWidth: 280, maxWidth: 380,
              background: 'var(--bg-card)', border: `1px solid ${c.border}`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px ${c.border}22`,
              pointerEvents: 'all',
              animation: 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={c.color} />
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.4 }}>{t.message}</div>
              <button onClick={() => remove(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
