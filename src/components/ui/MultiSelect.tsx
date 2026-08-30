import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: React.ReactNode;
  color?: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ label, options, selectedIds, onChange, placeholder = 'All' }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function handleSelectAll() {
    if (selectedIds.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.id));
    }
  }

  const selectedCount = selectedIds.length;
  let displayText = placeholder;
  if (selectedCount > 0 && selectedCount < options.length) {
    displayText = `${selectedCount} selected`;
  } else if (selectedCount === options.length) {
    displayText = 'All selected';
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', minWidth: 200 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div 
        className="form-input" 
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'var(--bg-input)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedCount > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
          {displayText}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)', 
            transform: isOpen ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.2s ease-in-out' 
          }} 
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 50,
          maxHeight: 300,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 250 }}>
            <div 
              style={{ 
                padding: '10px 12px', 
                borderBottom: '1px solid var(--border)', 
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onClick={handleSelectAll}
            >
              <div style={{ width: 16, height: 16, border: '1px solid var(--border)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedCount === options.length ? 'var(--accent)' : 'transparent' }}>
                {selectedCount === options.length && <Check size={12} color="white" />}
              </div>
              Select All
            </div>
            {options.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <div 
                  key={opt.id}
                  style={{ 
                    padding: '10px 12px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: isSelected ? 'var(--bg-card-hover)' : 'transparent'
                  }}
                  onClick={() => toggleOption(opt.id)}
                >
                  <div style={{ width: 16, height: 16, border: `1px solid ${isSelected ? 'transparent' : 'var(--border)'}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? (opt.color || 'var(--accent)') : 'transparent' }}>
                    {isSelected && <Check size={12} color="white" />}
                  </div>
                  <span>{opt.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid var(--border)', background: 'var(--bg-input)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
