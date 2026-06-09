import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Search, FileText, ArrowLeftRight, CreditCard, LayoutDashboard, Target, Users, LogIn } from 'lucide-react';

export function CommandPalette({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { state } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
  };

  const pages = [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, action: () => router.push('/dashboard') },
    { label: 'Transactions', icon: <ArrowLeftRight size={16} />, action: () => router.push('/transactions') },
    { label: 'Accounts', icon: <CreditCard size={16} />, action: () => router.push('/accounts') },
    { label: 'Shared Expenses', icon: <Users size={16} />, action: () => router.push('/shared') },
    { label: 'Goals', icon: <Target size={16} />, action: () => router.push('/goals') },
    { label: 'Reports', icon: <FileText size={16} />, action: () => router.push('/reports') },
  ];

  const filteredPages = pages.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));
  const filteredTxns = state.transactions
    .filter(t => (t.payee || '').toLowerCase().includes(query.toLowerCase()) || t.notes?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={(e) => {
      if (e.target === e.currentTarget) setOpen(false);
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15 }}
        className="modal"
        style={{ padding: 0, maxWidth: 600, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: 12 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, or transactions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 18, color: 'var(--text-primary)', outline: 'none'
            }}
          />
        </div>
        
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}>
          {query.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pages
            </div>
          )}
          
          {filteredPages.map(page => (
            <div
              key={page.label}
              className="cmd-item"
              onClick={() => handleSelect(page.action)}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px',
                cursor: 'pointer', borderRadius: 8, gap: 12, color: 'var(--text-primary)'
              }}
            >
              <div style={{ color: 'var(--text-muted)' }}>{page.icon}</div>
              <div>{page.label}</div>
            </div>
          ))}

          {query.length > 0 && filteredTxns.length > 0 && (
            <>
              <div style={{ padding: '16px 12px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Transactions
              </div>
              {filteredTxns.map(t => (
                <div
                  key={t.id}
                  className="cmd-item"
                  onClick={() => handleSelect(() => router.push('/transactions'))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', cursor: 'pointer', borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.payee}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(t.date).toLocaleDateString()} • {t.notes}</span>
                  </div>
                  <div style={{ color: t.type === 'income' ? 'var(--income)' : 'var(--text-primary)', fontWeight: 600 }}>
                    {t.type === 'income' ? '+' : '-'}{state.currency}{t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </>
          )}

          {query.length > 0 && filteredPages.length === 0 && filteredTxns.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No results found for "{query}"
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
