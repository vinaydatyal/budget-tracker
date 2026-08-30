'use client';

import { useApp, formatCurrency } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { BookOpen, Search, Download } from 'lucide-react';
import { useState } from 'react';
import { exportTaxPackage } from '@/lib/export';
import { format } from 'date-fns';

export default function LedgerPage() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const ledger = state.ledger || [];

  const filteredLedger = ledger
    .filter(entry => 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      entry.accountId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">General Ledger</h1>
          <p className="page-subtitle">Raw double-entry accounting records for your business</p>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 250 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search ledger by description or account..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 44, width: '100%' }}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => exportTaxPackage(state)}
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Download size={16} style={{ marginRight: 8 }} />
            Export Tax Package (CSV)
          </button>
        </div>

        {filteredLedger.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Account</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Debit</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{entry.transactionId.substring(0, 8)}...</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-modifier-hover)',
                        color: 'var(--text-main)'
                      }}>
                        {entry.accountId}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{entry.description}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: entry.debit > 0 ? 600 : 400, color: entry.debit > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {entry.debit > 0 ? formatCurrency(entry.debit, state.currency) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: entry.credit > 0 ? 600 : 400, color: entry.credit > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {entry.credit > 0 ? formatCurrency(entry.credit, state.currency) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen size={40} style={{ opacity: 0.5 }} /></div>
            <div className="empty-state-title">No Ledger Entries</div>
            <div className="empty-state-text">
              Business transactions will automatically generate balanced debit and credit entries here.
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
