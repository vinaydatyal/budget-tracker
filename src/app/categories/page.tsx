'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Category } from '@/lib/types';
import { PageWrapper } from '@/components/layout/PageWrapper';

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899',
  '#f43f5e','#84cc16','#10b981','#0ea5e9','#8b5cf6','#6b7280',
];

const PRESET_EMOJIS = [
  '💼','💻','📈','🏠','🚗','🍔','🛍️','🏥','🎮','💡',
  '📚','📦','✈️','🎵','🏋️','💈','🐶','🌿','💊','🎁',
  '🍕','☕','🏦','📱','🔧','🎯','💰','🌐','🎨','📷',
];

type ModeType = 'income' | 'expense' | 'both';

export default function CategoriesPage() {
  const { state, addCategory, updateCategory, deleteCategory } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_EMOJIS[0]);
  const [type, setType] = useState<ModeType>('expense');
  const [parentId, setParentId] = useState<string>('');
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [budgetRollover, setBudgetRollover] = useState<boolean>(false);
  const [error, setError] = useState('');

  function openNew() {
    setEditing(null);
    setName(''); setColor(PRESET_COLORS[0]); setIcon(PRESET_EMOJIS[0]); setType('expense'); setParentId(''); setMonthlyBudget(''); setBudgetRollover(false); setError('');
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name); setColor(cat.color); setIcon(cat.icon); setType(cat.type as ModeType); setParentId(cat.parentId || ''); setMonthlyBudget(cat.monthlyBudget ? String(cat.monthlyBudget) : ''); setBudgetRollover(!!cat.budgetRollover); setError('');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    if (parentId === editing?.id) return setError('Cannot be parent of itself');
    const payload = { 
      name: name.trim(), color, icon, type, 
      parentId: parentId || undefined,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
      budgetRollover
    };
    if (editing) updateCategory({ ...payload, id: editing.id });
    else addCategory(payload);
    setShowForm(false);
  }

  const incomeCategories = state.categories.filter(c => c.type === 'income' || c.type === 'both');
  const expenseCategories = state.categories.filter(c => c.type === 'expense' || c.type === 'both');

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{state.categories.length} categories • customize your tracking</p>
        </div>
        <button id="add-category-btn" className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> New Category
        </button>
      </div>

      {/* Income categories */}
      <div className="section-title" style={{ color: 'var(--income)' }}>
        <span>💼</span> Income Categories
      </div>
      <div className="categories-grid" style={{ marginBottom: 32 }}>
        {incomeCategories.map(cat => (
          <CategoryCard key={cat.id} cat={cat} onEdit={openEdit} onDelete={deleteCategory} />
        ))}
        <button className="category-card" style={{ border: '2px dashed var(--border-strong)', background: 'transparent', cursor: 'pointer' }} onClick={openNew}>
          <div className="category-icon-wrap" style={{ background: 'var(--bg-input)' }}>
            <Plus size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <div className="category-name" style={{ color: 'var(--text-muted)' }}>Add Category</div>
          </div>
        </button>
      </div>

      {/* Expense categories */}
      <div className="section-title" style={{ color: 'var(--expense)' }}>
        <span>💸</span> Expense Categories
      </div>
      <div className="categories-grid">
        {expenseCategories.map(cat => (
          <CategoryCard key={cat.id} cat={cat} onEdit={openEdit} onDelete={deleteCategory} />
        ))}
        <button className="category-card" style={{ border: '2px dashed var(--border-strong)', background: 'transparent', cursor: 'pointer' }} onClick={openNew}>
          <div className="category-icon-wrap" style={{ background: 'var(--bg-input)' }}>
            <Plus size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <div className="category-name" style={{ color: 'var(--text-muted)' }}>Add Category</div>
          </div>
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Category' : 'New Category'}</h2>
              <button className="btn btn-icon" onClick={() => setShowForm(false)} id="close-category-form"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input id="cat-name" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Groceries" />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="type-toggle">
                  {(['income', 'expense', 'both'] as ModeType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`type-toggle-btn ${type === t ? (t === 'income' ? 'active-income' : t === 'expense' ? 'active-expense' : 'active-income') : ''}`}
                      onClick={() => setType(t)}
                      style={{ flex: 1 }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Parent Category (Optional)</label>
                <select className="form-select" value={parentId} onChange={e => setParentId(e.target.value)}>
                  <option value="">None (Top Level)</option>
                  {state.categories
                    .filter(c => !c.parentId && c.id !== editing?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Budget (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>{state.currency}</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={monthlyBudget} 
                    onChange={e => setMonthlyBudget(e.target.value)} 
                    placeholder="e.g. 500" 
                    style={{ paddingLeft: 28 }}
                  />
                </div>
                {monthlyBudget && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={budgetRollover} 
                      onChange={e => setBudgetRollover(e.target.checked)} 
                    />
                    <span style={{ fontSize: 13 }}>Rollover remaining funds to next month</span>
                  </label>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-grid">
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-swatch ${color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Icon</label>
                <div className="emoji-grid">
                  {PRESET_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`emoji-btn ${icon === e ? 'selected' : ''}`}
                      onClick={() => setIcon(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div className="category-icon-wrap" style={{ background: `${color}22`, width: 44, height: 44 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                </div>
                <div>
                  <div className="category-name">{name || 'Category Name'}</div>
                  <div className="category-type">{type}</div>
                </div>
              </div>

              {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" id="save-category-btn" className="btn btn-primary"><Check size={15} /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function CategoryCard({ cat, onEdit, onDelete }: {
  cat: Category;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="category-card" style={{ position: 'relative' }}>
      <div className="category-icon-wrap" style={{ background: `${cat.color}22` }}>
        <span style={{ fontSize: 22 }}>{cat.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="category-name">{cat.name}</div>
        <div className="category-type">
          {cat.type}{cat.parentId ? ' • Subcategory' : ''}
          {cat.monthlyBudget ? ` • Budget: $${cat.monthlyBudget}` : ''}
          {cat.budgetRollover ? ' (Rollover)' : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-icon btn-sm" onClick={() => onEdit(cat)} aria-label="Edit" id={`edit-cat-${cat.id}`}>
          <Pencil size={13} />
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => { if (confirm(`Delete "${cat.name}"?`)) onDelete(cat.id); }}
          aria-label="Delete"
          id={`delete-cat-${cat.id}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
