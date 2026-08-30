'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Simple markdown link parser
const renderContent = (content: string) => {
  const parts = content.split(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (parts.length === 1) return content;

  const elements = [];
  for (let i = 0; i < parts.length; i += 3) {
    elements.push(<span key={i}>{parts[i]}</span>);
    if (i + 1 < parts.length && i + 2 < parts.length) {
      elements.push(
        <Link 
          key={i + 1} 
          href={parts[i + 2]} 
          style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}
        >
          {parts[i + 1]}
        </Link>
      );
    }
  }
  return elements;
};

export function AiAdvisorChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state } = useApp();
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hi! I'm Kubera, the God of Wealth and your personal AI Financial Advisor. Ask me anything about your spending, budgets, or how to grow your wealth!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Build a minified context to save tokens
      const minifiedContext = {
        currency: state.currency,
        netWorth: state.transactions.reduce((acc, t) => {
          if (t.type === 'income') return acc + t.amount;
          if (t.type === 'expense') return acc - t.amount;
          return acc;
        }, 0),
        recentTransactions: state.transactions.slice(0, 50).map(t => ({
          date: t.date,
          amount: t.amount,
          type: t.type,
          desc: t.description,
          category: state.categories.find(c => c.id === t.categoryId)?.name || 'Unknown'
        })),
        budgets: state.budgetGoals.map(b => ({
          amount: b.monthlyLimit,
          category: state.categories.find(c => c.id === b.categoryId)?.name || 'Unknown'
        })),
        debts: state.debts.map(d => ({ name: d.name, balance: d.balance, rate: d.interestRate }))
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: minifiedContext })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I had trouble connecting to the intelligence server. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'var(--accent)', padding: 8, borderRadius: 8 }}>
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Kubera</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your AI Wealth Advisor</span>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-icon" style={{ padding: 6 }}>
              <X size={18} />
            </button>
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: m.role === 'user' ? 'var(--bg-elevated)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'user' ? <User size={16} color="var(--text-main)" /> : <Bot size={16} color="#fff" />}
                </div>
                <div style={{ 
                  background: m.role === 'user' ? 'var(--bg-modifier-hover)' : 'rgba(168, 85, 247, 0.1)', 
                  padding: '12px 16px', 
                  borderRadius: 12, 
                  borderTopRightRadius: m.role === 'user' ? 4 : 12,
                  borderTopLeftRadius: m.role === 'user' ? 12 : 4,
                  maxWidth: '85%',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={16} color="#fff" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168, 85, 247, 0.1)' }}>
                  <Loader2 size={16} className="animate-spin" color="var(--accent)" />
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-input)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Ask about your finances..."
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 12px', fontSize: 14, color: 'var(--text-main)', outline: 'none' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{ padding: '8px 12px', borderRadius: 8 }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
