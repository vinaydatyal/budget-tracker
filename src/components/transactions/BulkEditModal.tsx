'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X } from 'lucide-react';

interface Props {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkEditModal({ selectedIds, onClose, onSuccess }: Props) {
  const { state, dispatch } = useApp();
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [addTag, setAddTag] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId && !accountId && !addTag.trim()) {
      return setError('Please select at least one field to update.');
    }

    selectedIds.forEach(id => {
      const txn = state.transactions.find(t => t.id === id);
      if (txn) {
        const updated = { ...txn };
        if (categoryId) updated.categoryId = categoryId;
        if (accountId) updated.accountId = accountId;
        if (addTag.trim()) {
          const newTags = addTag.split(',').map(t => t.trim()).filter(Boolean);
          updated.tags = Array.from(new Set([...(updated.tags || []), ...newTags]));
        }
        dispatch({ type: 'UPDATE_TRANSACTION', payload: updated });
      }
    });

    onSuccess();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Edit ({selectedIds.length} items)</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Change Category to:</label>
            <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">-- No change --</option>
              {state.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Change Account to:</label>
            <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">-- No change --</option>
              {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Add Tags (comma separated):</label>
            <input
              type="text"
              className="form-input"
              value={addTag}
              onChange={e => setAddTag(e.target.value)}
              placeholder="e.g. vacation, reviewed"
            />
          </div>

          {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Apply Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
