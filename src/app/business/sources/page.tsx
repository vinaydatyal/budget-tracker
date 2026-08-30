'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RevenueSource, SplitRule } from '@/lib/types';
import { Building, SplitSquareHorizontal, Plus, Trash2, Edit2, Info, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BusinessSourcesPage() {
  const { state, addRevenueSource, updateRevenueSource, deleteRevenueSource, addSplitRule, updateSplitRule, deleteSplitRule } = useApp();
  
  const [activeTab, setActiveTab] = useState<'sources'|'splits'>('sources');

  if (!state.preferences.enableBusinessMode) {
    return (
      <div className="page-container">
        <h2>Business Mode Disabled</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue & Splits</h1>
          <p className="page-subtitle">Manage your income sources and automated percentage splits</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className={`btn ${activeTab === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sources')}
          >
            <Building size={18} /> Sources
          </button>
          <button 
            className={`btn ${activeTab === 'splits' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('splits')}
          >
            <SplitSquareHorizontal size={18} /> Split Rules
          </button>
        </div>
      </div>

      {activeTab === 'sources' && <SourcesManager />}
      {activeTab === 'splits' && <SplitsManager />}
    </div>
  );
}

function SourcesManager() {
  const { state, addRevenueSource, deleteRevenueSource } = useApp();
  
  const handleAdd = () => {
    const name = prompt('Enter Source Name (e.g. Upwork, Client A):');
    if (!name) return;
    
    addRevenueSource({
      name,
      type: 'client',
      color: '#3b82f6',
    });
    toast.success('Revenue Source added');
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3>Revenue Sources</h3>
        <button className="btn btn-primary" onClick={handleAdd}>
          <Plus size={16} /> Add Source
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {state.revenueSources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No revenue sources created yet.</p>
        ) : (
          state.revenueSources.map(source => (
            <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{source.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Type: {source.type}</div>
              </div>
              <button className="btn-icon" style={{ color: 'var(--expense)' }} onClick={() => {
                if(confirm('Delete this source?')) deleteRevenueSource(source.id);
              }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SplitsManager() {
  const { state, addSplitRule, deleteSplitRule, updateSplitRule } = useApp();
  const [editingRule, setEditingRule] = useState<SplitRule | null>(null);
  
  const handleAdd = () => {
    const newRule: SplitRule = {
      id: `rule-${Date.now()}`,
      name: 'New Split Rule',
      splits: []
    };
    setEditingRule(newRule);
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3>Automated Split Rules</h3>
        <button className="btn btn-primary" onClick={handleAdd}>
          <Plus size={16} /> Create Rule
        </button>
      </div>

      <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24, display: 'flex', gap: 12 }}>
        <Info size={20} color="var(--accent)" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          When you log income and apply a split rule, the total amount will be divided into separate transactions based on your percentages.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {state.splitRules.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No split rules created yet.</p>
        ) : (
          state.splitRules.map(rule => (
            <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{rule.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {rule.splits.length === 0 ? 'No percentages configured.' : `${rule.splits.length} split targets (${rule.splits.reduce((sum, s) => sum + s.percentage, 0)}% total).`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={() => setEditingRule(rule)}>
                  <Edit2 size={18} />
                </button>
                <button className="btn-icon" style={{ color: 'var(--expense)' }} onClick={() => {
                  if(confirm('Delete this rule?')) deleteSplitRule(rule.id);
                }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingRule && (
        <SplitRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={(updatedRule) => {
            if (state.splitRules.some(r => r.id === updatedRule.id)) {
              updateSplitRule(updatedRule);
            } else {
              addSplitRule(updatedRule);
            }
            setEditingRule(null);
            toast.success('Split rule saved!');
          }}
        />
      )}
    </div>
  );
}

function SplitRuleModal({ rule, onClose, onSave }: { rule: SplitRule, onClose: () => void, onSave: (rule: SplitRule) => void }) {
  const { state } = useApp();
  const [name, setName] = useState(rule.name);
  const [splits, setSplits] = useState(rule.splits);

  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

  const handleSave = () => {
    if (!name.trim()) return toast.error('Name is required');
    if (splits.length === 0) return toast.error('At least one split target is required');
    if (totalPercentage !== 100) return toast.error(`Total percentage must be exactly 100%. Currently at ${totalPercentage}%`);
    
    onSave({ ...rule, name, splits });
  };

  const addSplit = () => {
    setSplits([...splits, { targetId: '', targetType: 'account', percentage: 0 }]);
  };

  const updateSplit = (index: number, key: string, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [key]: value };
    setSplits(newSplits);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 600 }}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Split Rule</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Rule Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tax & Operations Split" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Split Targets</label>
            <div style={{ fontSize: 13, color: totalPercentage === 100 ? 'var(--income)' : 'var(--expense)' }}>
              Total: {totalPercentage}% (Needs to be 100%)
            </div>
          </div>

          {splits.map((split, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select 
                  className="form-select" 
                  value={split.targetType} 
                  onChange={e => updateSplit(i, 'targetType', e.target.value)}
                  style={{ width: 120 }}
                >
                  <option value="account">Account</option>
                  <option value="category">Category</option>
                </select>

                <select 
                  className="form-select" 
                  value={split.targetId} 
                  onChange={e => updateSplit(i, 'targetId', e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="" disabled>Select Target</option>
                  {split.targetType === 'account' ? (
                    state.accounts.filter(a => a.isBusiness).map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                  ) : (
                    state.categories.filter(c => c.isBusiness).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)
                  )}
                </select>

                <div style={{ position: 'relative', width: 80 }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={split.percentage || ''} 
                    onChange={e => updateSplit(i, 'percentage', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, color: 'var(--text-muted)' }}>%</span>
                </div>

                <button className="btn-icon" style={{ color: 'var(--expense)' }} onClick={() => removeSplit(i)}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                <input 
                  type="checkbox" 
                  checked={!!split.isExpense} 
                  onChange={e => updateSplit(i, 'isExpense', e.target.checked)} 
                />
                <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Treat this split as a business expense (e.g. platform fees)</label>
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={addSplit}>
            <Plus size={16} /> Add Split Target
          </button>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSave}>
            Save Split Rule
          </button>
        </div>
      </div>
    </div>
  );
}
