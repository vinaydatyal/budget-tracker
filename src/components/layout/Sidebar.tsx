'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  Target,
  Sun,
  Moon,
  Wallet,
  CreditCard,
  Repeat,
  BarChart2,
  LogIn,
  LogOut,
  PlusCircle,
  Receipt,
  Settings as SettingsIcon,
  Calendar as CalendarIcon,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { state, toggleTheme } = useApp();
  const { user, signInWithGoogle, signOut, isFirebaseConfigured } = useAuth();

  const NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { href: '/shared', icon: Users, label: 'Shared Expenses' },
    { href: '/goals', icon: Target, label: 'Goals & Debts' },
    { href: '/accounts', icon: CreditCard, label: 'Assets & Accounts' },
    { href: '/categories', icon: Tag, label: 'Categories' },
    { href: '/budgets', icon: Target, label: 'Budget Limits' },
    { href: '/recurring', icon: Repeat, label: 'Subscriptions' },
    { href: '/invoices', icon: Receipt, label: 'Invoices' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
    { href: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wallet size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">BudgetPro</div>
          <div className="sidebar-logo-sub">Finance Tracker</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'a' });
            window.dispatchEvent(event);
          }}
        >
          <PlusCircle size={18} />
          <span>Quick Add (A)</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
          onClick={() => toggleTheme()}
        >
          {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {isFirebaseConfigured && (
          user ? (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--expense)' }}
              onClick={signOut}
              title={`Logged in as ${user.email}`}
            >
              <LogOut size={18} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sign Out</span>
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--income)' }}
              onClick={signInWithGoogle}
            >
              <LogIn size={18} />
              <span>Cloud Sync</span>
            </button>
          )
        )}
      </div>
    </aside>
  );
}
