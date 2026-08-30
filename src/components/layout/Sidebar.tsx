'use client';

import { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Building,
  PanelLeftClose,
  Compass,
  Activity,
  Map,
  Folder
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { AppOverviewModal } from './AppOverviewModal';

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: { isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void; }) {
  const pathname = usePathname();
  const { state, toggleTheme } = useApp();
  const { user, signInWithGoogle, signOut, isFirebaseConfigured } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showAppOverview, setShowAppOverview] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const NAV_GROUPS = [
    {
      title: 'Overview',
      groupIcon: Compass,
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/calendar', icon: CalendarIcon, label: 'Calendar' },
        { href: '/reports', icon: BarChart2, label: 'Reports' },
      ]
    },
    {
      title: 'Money Flow',
      groupIcon: Activity,
      items: [
        { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
        { href: '/shared', icon: Users, label: 'Shared Expenses' },
      ]
    },
    {
      title: 'Planning',
      groupIcon: Map,
      items: [
        { href: '/budgets', icon: Target, label: 'Budget Limits' },
        { href: '/recurring', icon: Repeat, label: 'Subscriptions' },
        { href: '/goals', icon: Target, label: 'Goals & Debts' },
      ]
    },
    {
      title: 'Management',
      groupIcon: Folder,
      items: [
        { href: '/accounts', icon: CreditCard, label: 'Assets & Accounts' },
        { href: '/categories', icon: Tag, label: 'Categories' },
      ]
    }
  ];

  if (state.preferences.enableBusinessMode) {
    NAV_GROUPS.push({
      title: 'Business Hub',
      groupIcon: Briefcase,
      items: [
        { href: '/business', icon: Briefcase, label: 'Business Hub' },
        { href: '/invoices', icon: Receipt, label: 'Invoices' },
        { href: '/business/sources', icon: Building, label: 'Revenue & Splits' },
      ]
    });
  }

  // Initialize all groups as expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      initial[g.title] = true;
    });
    return initial;
  });

  // Keep expandedGroups in sync when NAV_GROUPS change (e.g. business mode toggled)
  // meaning if it's undefined, we default to expanded!

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'visible' }}>
      {onToggleCollapse && (
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          style={{
            position: 'absolute',
            right: -14,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 10,
            color: 'var(--text-main)',
          }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
      <div className="sidebar-logo" style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowAppOverview(true)} title="View App Overview">
        <div className="sidebar-logo-icon" style={{ background: 'transparent', color: '#fff', fontSize: '13px', fontWeight: 800, width: 36, height: 36, flexShrink: 0, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: 'none' }}>
          <svg viewBox="0 0 24 24" width="36" height="36" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 4px 8px var(--accent-glow))' }}>
            <defs>
              <linearGradient id="heart-grad-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'var(--balance)', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <path fill="url(#heart-grad-sidebar)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span style={{ position: 'relative', zIndex: 1, marginTop: '-3px', marginLeft: '1px', WebkitTextFillColor: '#fff', letterSpacing: '0.5px' }}>SV</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-logo-text">Solv</div>
          {!isCollapsed && (
            <>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-2px', marginBottom: '2px', fontStyle: 'italic' }}>Two distinct streams, One secure vault</div>
              <div className="sidebar-logo-sub" style={{ fontSize: '10px' }}>Proudly made in India</div>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <div className="quick-add-container" style={{ padding: '0 16px', marginBottom: '16px', flexShrink: 0 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'a' });
            window.dispatchEvent(event);
          }}
        >
          <PlusCircle size={18} />
          <span className="nav-label">Quick Add (A)</span>
        </button>
      </div>

      <nav className="sidebar-nav" style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        {NAV_GROUPS.map((group, i) => {
          const isExpanded = expandedGroups[group.title] !== false; // Default to true if undefined
          const GroupIcon = group.groupIcon;

          return (
            <div key={i} style={{ marginBottom: 16 }}>
              <div 
                className={`sidebar-label`} 
                onClick={() => toggleGroup(group.title)}
                style={{ 
                  paddingLeft: 12, 
                  paddingRight: 12,
                  marginBottom: 8, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  letterSpacing: '0.05em', 
                  color: 'var(--text-muted)', 
                  textTransform: 'uppercase',
                  display: isCollapsed ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="nav-label">{group.title}</span>
                </div>
                {!isCollapsed && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </div>
              
              {(isExpanded || isCollapsed) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`nav-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon className="nav-icon" size={18} />
                        <span className="nav-label">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 0 }}>
        <Link
          href="/settings"
          className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}
          style={{ marginBottom: '8px' }}
        >
          <SettingsIcon className="nav-icon" size={18} />
          <span className="nav-label">Settings</span>
        </Link>

        
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
          onClick={toggleTheme}
        >
          {mounted ? (state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} style={{ opacity: 0 }} />}
          <span className="nav-label">Theme {mounted ? `(${state.theme})` : ''}</span>
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
              <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sign Out</span>
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--income)' }}
              onClick={signInWithGoogle}
            >
              <LogIn size={18} />
              <span className="nav-label">Cloud Sync</span>
            </button>
          )
        )}
      </div>

      <AppOverviewModal isOpen={showAppOverview} onClose={() => setShowAppOverview(false)} />
    </aside>
  );
}
