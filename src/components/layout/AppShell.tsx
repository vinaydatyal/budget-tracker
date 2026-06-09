'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { GlobalQuickAdd } from './GlobalQuickAdd';
import { Menu, Wallet } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { CommandPalette } from './CommandPalette';
import { Toaster } from 'react-hot-toast';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on route change
  useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).isContentEditable;

      if (e.key === 'a' && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setQuickAddOpen(true);
      }
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        const searchEl = document.querySelector<HTMLInputElement>('input[data-search]');
        searchEl?.focus();
      }
      if (e.key === 'd' && !isTyping) router.push('/dashboard');
      if (e.key === 't' && !isTyping) router.push('/transactions');
      if (e.key === 'r' && !isTyping) router.push('/reports');
      if (e.key === 'Escape') setQuickAddOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32 }}>
            <Wallet size={16} color="#fff" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>BudgetPro</div>
        </div>
        <button className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="main-content">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
        <GlobalQuickAdd externalOpen={quickAddOpen} onExternalClose={() => setQuickAddOpen(false)} />
        <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
        <OnboardingWizard />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            },
          }}
        />
      </div>
    </div>
  );
}
