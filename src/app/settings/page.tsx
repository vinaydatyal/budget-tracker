'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Brain, 
  PieChart, 
  Database, 
  Globe, 
  Download, 
  Upload, 
  Trash2,
  ChevronRight,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { BankLinkButton } from '@/components/settings/BankLinkButton';

const currencies = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
];

const TABS = [
  { id: 'core', label: 'Core Engines', icon: Brain, desc: 'Budgeting & Automation' },
  { id: 'addons', label: 'Optional Add-Ons', icon: PieChart, desc: 'Simulators & Estimators' },
  { id: 'general', label: 'General Preferences', icon: Globe, desc: 'Currency & Display' },
  { id: 'account', label: 'Cloud Account', icon: UserIcon, desc: 'Google Backup & Sync' },
  { id: 'data', label: 'Data Management', icon: Database, desc: 'Backups & Wipes' },
];

export default function SettingsPage() {
  const { state, updatePreferences, dispatch, exportData, importData, clearData, loadDemoData } = useApp();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { preferences } = state;
  const [activeTab, setActiveTab] = useState('core');
  const [importStatus, setImportStatus] = useState('');

  function handleCurrencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'SET_CURRENCY', payload: e.target.value });
  }

  function handleExport() {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `budget-backup-${new Date().toISOString().slice(0,10)}.json`;
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const success = importData(event.target?.result as string);
        if (success) {
          setImportStatus('Data restored successfully!');
          setTimeout(() => setImportStatus(''), 3000);
        } else {
          setImportStatus('Invalid backup file');
        }
      } catch (err) {
        setImportStatus('Error importing file');
      }
    };
    reader.readAsText(file);
  }

  function handleClearData() {
    if (confirm('Are you absolutely sure you want to delete ALL your data? This action cannot be undone!')) {
      clearData();
    }
  }

  function handleLoadDemo() {
    if (confirm('This will replace your current data with demo data. Do you want to continue?')) {
      loadDemoData();
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'core':
        return (
          <div className="settings-section">
            <div className="settings-header">
              <div className="settings-icon-wrapper" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
                <Brain size={24} />
              </div>
              <div>
                <h2>Core Logic Engines</h2>
                <p>Manage the fundamental automation engines of the app.</p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-item">
                <div className="settings-item-info">
                  <h3>Envelope Budgeting</h3>
                  <p>Enable dynamic month-to-month budget rollover. Unspent funds carry over to the next month.</p>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={!!preferences.enableEnvelopeBudgeting} onChange={e => updatePreferences({ enableEnvelopeBudgeting: e.target.checked })} />
                  <span className="ios-slider"></span>
                </label>
              </div>
              
              <div className="settings-divider" />

              <div className="settings-item">
                <div className="settings-item-info">
                  <h3>Auto-Cover Overspending</h3>
                  <p>Automatically pool surplus budget from underspent categories to cover deficits in others.</p>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={!!preferences.autoCoverOverspending} onChange={e => updatePreferences({ autoCoverOverspending: e.target.checked })} />
                  <span className="ios-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );
      
      case 'addons':
        return (
          <div className="settings-section">
            <div className="settings-header">
              <div className="settings-icon-wrapper" style={{ background: 'var(--expense-subtle)', color: 'var(--expense)' }}>
                <PieChart size={24} />
              </div>
              <div>
                <h2>Optional Add-Ons</h2>
                <p>Toggle advanced calculators and simulators.</p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-item">
                <div className="settings-item-info">
                  <h3>Debt Payoff Simulator</h3>
                  <p>Adds an advanced mathematical simulator to the Debts page to test Snowball and Avalanche payoff methods.</p>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={!!preferences.enableDebtSimulator} onChange={e => updatePreferences({ enableDebtSimulator: e.target.checked })} />
                  <span className="ios-slider"></span>
                </label>
              </div>
              
              <div className="settings-divider" />

              <div className="settings-item">
                <div className="settings-item-info">
                  <h3>Business Mode</h3>
                  <p>Enables advanced tools like Revenue Sources (Clients) and automated Percentage Income Splitting.</p>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={!!preferences.enableBusinessMode} onChange={e => updatePreferences({ enableBusinessMode: e.target.checked })} />
                  <span className="ios-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="settings-section">
            <div className="settings-header">
              <div className="settings-icon-wrapper" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
                <Globe size={24} />
              </div>
              <div>
                <h2>General Preferences</h2>
                <p>Configure localization and display settings.</p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-item">
                <div className="settings-item-info">
                  <h3>Base Currency</h3>
                  <p>Select the primary currency symbol used across the dashboard.</p>
                </div>
                <select className="form-select" value={state.currency || 'USD'} onChange={handleCurrencyChange} style={{ width: 180 }}>
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="settings-section">
            <div className="settings-header">
              <div className="settings-icon-wrapper" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
                <UserIcon size={24} />
              </div>
              <div>
                <h2>Cloud Account</h2>
                <p>Manage your Google authentication and data sync.</p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                {user ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-modifier-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {user.photoURL ? <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={24} />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{user.displayName || 'Google User'}</h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: 8, fontSize: 13, width: '100%' }}>
                      ✓ Your data is actively syncing to your personal Google Drive.
                    </div>
                    <button className="btn btn-secondary" onClick={signOut} style={{ alignSelf: 'flex-start' }}>
                      <LogOut size={16} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Not Signed In</h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Sign in with Google to automatically backup your data and access it across devices. 
                        Without signing in, your data remains safely in your browser but could be lost if you clear your cache.
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={signInWithGoogle} style={{ alignSelf: 'flex-start' }}>
                      <LogIn size={16} /> Sign in with Google
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <BankLinkButton />
          </div>
        );

      case 'data':
        return (
          <div className="settings-section">
            <div className="settings-header">
              <div className="settings-icon-wrapper" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
                <Database size={24} />
              </div>
              <div>
                <h2>Data Management</h2>
                <p>Export backups, restore data, or securely wipe your local database.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <button className="settings-action-card" onClick={handleExport}>
                <div className="action-icon" style={{ color: 'var(--income)' }}><Download size={20} /></div>
                <div className="action-text">
                  <h4>Export Backup</h4>
                  <p>Download a secure JSON file.</p>
                </div>
              </button>

              <label className="settings-action-card" style={{ cursor: 'pointer' }}>
                <div className="action-icon" style={{ color: 'var(--info)' }}><Upload size={20} /></div>
                <div className="action-text">
                  <h4>Restore Backup</h4>
                  <p>Import a previous JSON backup.</p>
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </div>
              </label>

              <button className="settings-action-card" onClick={handleLoadDemo}>
                <div className="action-icon" style={{ color: 'var(--warning)' }}><SettingsIcon size={20} /></div>
                <div className="action-text">
                  <h4>Load Demo Data</h4>
                  <p>Fill the app with sample data.</p>
                </div>
              </button>

              <button className="settings-action-card danger" onClick={handleClearData}>
                <div className="action-icon"><Trash2 size={20} /></div>
                <div className="action-text">
                  <h4>Wipe Database</h4>
                  <p>Permanently delete all data.</p>
                </div>
              </button>
            </div>
            
            {importStatus && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--income-subtle)', color: 'var(--income)', borderRadius: 8, fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
                {importStatus}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="page-body">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Personalize your Solv experience</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <nav className="settings-nav">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`settings-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="settings-nav-icon">
                  <Icon size={18} />
                </div>
                <div className="settings-nav-text">
                  <div className="settings-nav-label">{tab.label}</div>
                  <div className="settings-nav-desc">{tab.desc}</div>
                </div>
                {isActive && <ChevronRight size={16} className="settings-nav-arrow" />}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <main className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Settings Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .settings-layout {
          display: flex;
          gap: 40px;
          align-items: flex-start;
          max-width: 1000px;
        }

        .settings-nav {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .settings-nav-item:hover {
          background: var(--bg-card-hover);
        }

        .settings-nav-item.active {
          background: var(--bg-card);
          border-color: var(--border);
          box-shadow: var(--shadow-sm);
        }

        .settings-nav-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          color: var(--text-muted);
          transition: all 0.2s ease;
        }

        .settings-nav-item.active .settings-nav-icon {
          background: var(--text-primary);
          color: var(--bg-card);
        }

        .settings-nav-text {
          flex: 1;
        }

        .settings-nav-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .settings-nav-desc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .settings-nav-arrow {
          color: var(--text-muted);
        }

        .settings-content {
          flex: 1;
          min-width: 0;
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .settings-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .settings-header p {
          font-size: 14px;
          color: var(--text-muted);
        }

        .settings-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 8px 24px;
          box-shadow: var(--shadow-sm);
        }

        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
          gap: 24px;
        }

        .settings-item-info h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .settings-item-info p {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .settings-divider {
          height: 1px;
          background: var(--border);
        }

        .settings-action-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text-primary);
        }

        .settings-action-card:hover {
          border-color: var(--border-strong);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .settings-action-card.danger {
          background: var(--expense-subtle);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .settings-action-card.danger:hover {
          border-color: var(--expense);
        }

        .settings-action-card.danger .action-icon {
          color: var(--expense);
        }

        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg-input);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-action-card.danger .action-icon {
          background: #fff;
        }

        .action-text h4 {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .action-text p {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* iOS Toggle Switch */
        .ios-toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 30px;
          flex-shrink: 0;
        }

        .ios-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .ios-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--border-strong);
          transition: .3s;
          border-radius: 30px;
        }

        .ios-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        input:checked + .ios-slider {
          background-color: var(--income);
        }

        input:checked + .ios-slider:before {
          transform: translateX(20px);
        }

        @media (max-width: 768px) {
          .settings-layout {
            flex-direction: column;
          }
          .settings-nav {
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
