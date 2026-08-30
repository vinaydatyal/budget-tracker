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
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // If on the landing page, don't render the dashboard shell
  if (pathname === '/') {
    return (
      <>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
            }
          }}
        />
        <FeedbackWidget />
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ background: 'transparent', color: '#fff', fontSize: '12px', fontWeight: 800, width: 32, height: 32, flexShrink: 0, minWidth: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: 'none' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 2px 4px var(--accent-glow))' }}>
              <defs>
                <linearGradient id="heart-grad-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--balance)', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path fill="url(#heart-grad-mobile)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span style={{ position: 'relative', zIndex: 1, marginTop: '-2px', marginLeft: '1px', WebkitTextFillColor: '#fff', letterSpacing: '0.5px' }}>SV</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Solv</div>
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
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
        <FeedbackWidget />
      </div>
    </div>
  );
}
