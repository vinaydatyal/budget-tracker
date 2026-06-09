'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Download, Upload, Trash2, Database, Settings as SettingsIcon } from 'lucide-react';
import { AppState } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/storage';

export default function SettingsPage() {
  const { state, dispatch, toggleTheme } = useApp();
  const [importStatus, setImportStatus] = useState<string>('');

  const currencies = [
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'INR', label: 'Indian Rupee (₹)' },
    { code: 'AUD', label: 'Australian Dollar (A$)' },
    { code: 'CAD', label: 'Canadian Dollar (C$)' },
    { code: 'JPY', label: 'Japanese Yen (¥)' },
  ];

  function handleCurrencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'SET_CURRENCY', payload: e.target.value });
  }

  function handleExport() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgetpro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsedState = JSON.parse(json) as AppState;
        if (parsedState && parsedState.transactions) {
          dispatch({ type: 'LOAD_STATE', payload: parsedState });
          setImportStatus('Data successfully imported!');
          setTimeout(() => setImportStatus(''), 3000);
        } else {
          setImportStatus('Error: Invalid backup file structure.');
        }
      } catch (err) {
        setImportStatus('Error parsing file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }

  function handleClearData() {
    if (confirm('Are you absolutely sure you want to delete all data? This cannot be undone unless you have a backup.')) {
      if (confirm('Final warning: All transactions, budgets, and categories will be permanently deleted!')) {
          const emptyState: AppState = {
            transactions: [],
            categories: [...DEFAULT_CATEGORIES],
            accounts: [],
            budgetGoals: [],
            recurringTransactions: [],
            debts: [],
            savingsGoals: [],
            theme: state.theme,
            taxRate: state.taxRate,
            currency: state.currency,
          };
        dispatch({ type: 'LOAD_STATE', payload: emptyState });
        alert('All data has been cleared.');
      }
    }
  }

  function handleLoadDemo() {
    if (confirm('This will replace your current data with a demo dataset. Continue?')) {
      const demoAccounts = [
        { id: '1', name: 'Main Checking', type: 'checking', color: '#3b82f6' },
        { id: '2', name: 'Savings', type: 'savings', color: '#10b981' },
        { id: '3', name: 'Credit Card', type: 'credit', color: '#f59e0b' },
      ];
      const demoCategories = [
        { id: '1', name: 'Salary', type: 'income', icon: '💰', color: '#10b981' },
        { id: '2', name: 'Freelance', type: 'income', icon: '💻', color: '#8b5cf6' },
        { id: '3', name: 'Groceries', type: 'expense', icon: '🛒', color: '#3b82f6' },
        { id: '4', name: 'Rent', type: 'expense', icon: '🏠', color: '#ef4444' },
        { id: '5', name: 'Dining Out', type: 'expense', icon: '🍔', color: '#f97316' },
        { id: '6', name: 'Utilities', type: 'expense', icon: '⚡', color: '#06b6d4' },
        { id: '7', name: 'Entertainment', type: 'expense', icon: '🎬', color: '#ec4899' },
      ];

      const demoTransactions: any[] = [];
      const now = new Date();
      
      // Generate 6 months of data
      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const yyyy = monthDate.getFullYear();
        const mm = String(monthDate.getMonth() + 1).padStart(2, '0');
        
        // Income
        demoTransactions.push({ id: `inc-${i}-1`, type: 'income', amount: 4500, categoryId: '1', accountId: '1', date: `${yyyy}-${mm}-01`, description: 'Monthly Salary' });
        if (Math.random() > 0.5) {
          demoTransactions.push({ id: `inc-${i}-2`, type: 'income', amount: 1200 + Math.random() * 800, categoryId: '2', accountId: '1', date: `${yyyy}-${mm}-15`, description: 'Freelance Project', freelanceData: { clientName: 'Acme Corp', projectName: 'Website Redesign', monthName: `${yyyy}-${mm}` } });
        }

        // Fixed Expenses
        demoTransactions.push({ id: `exp-${i}-1`, type: 'expense', amount: 1500, categoryId: '4', accountId: '1', date: `${yyyy}-${mm}-02`, description: 'Rent' });
        demoTransactions.push({ id: `exp-${i}-2`, type: 'expense', amount: 150, categoryId: '6', accountId: '1', date: `${yyyy}-${mm}-05`, description: 'Electric Bill' });

        // Variable Expenses (10-15 random per month)
        const numTxns = 10 + Math.floor(Math.random() * 5);
        for (let j = 0; j < numTxns; j++) {
          const dd = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
          const isGroceries = Math.random() > 0.5;
          const catId = isGroceries ? '3' : (Math.random() > 0.5 ? '5' : '7');
          const amt = 20 + Math.random() * 80;
          demoTransactions.push({ id: `var-${i}-${j}`, type: 'expense', amount: amt, categoryId: catId, accountId: '3', date: `${yyyy}-${mm}-${dd}`, description: isGroceries ? 'Whole Foods' : 'Restaurant/Movie' });
        }
      }

      const demoState: AppState = {
        transactions: demoTransactions as any,
        categories: demoCategories as any,
        accounts: demoAccounts as any,
        budgetGoals: [],
        recurringTransactions: [],
        debts: [],
        savingsGoals: [],
        theme: state.theme,
        taxRate: state.taxRate,
        currency: state.currency,
      };
      dispatch({ type: 'LOAD_STATE', payload: demoState });
      alert('Demo data loaded!');
    }
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage preferences and data backups</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 800 }}>
        
        {/* Preferences Section */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SettingsIcon size={18} /> Preferences
            </span>
          </div>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label className="form-label">Currency Symbol</label>
            <select className="form-select" value={state.currency || 'USD'} onChange={handleCurrencyChange}>
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} /> Data Management
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Export Backup */}
            <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Export Backup</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Download your complete data as a secure JSON file.</p>
              <button className="btn btn-secondary" onClick={handleExport} style={{ width: '100%', justifyContent: 'center' }}>
                <Download size={16} /> Export JSON
              </button>
            </div>

            {/* Import Backup */}
            <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Restore Backup</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Import a previous JSON backup to restore your state.</p>
              <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                <Upload size={16} /> Import JSON
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
              {importStatus && <div style={{ fontSize: 12, color: 'var(--income)', marginTop: 8 }}>{importStatus}</div>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)', margin: '24px 0' }} />

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-danger" onClick={handleClearData}>
              <Trash2 size={16} /> Delete All Data
            </button>
            <button className="btn btn-secondary" onClick={handleLoadDemo}>
              Load Demo Data
            </button>
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
