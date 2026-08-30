'use client';

import { useApp, formatCurrency } from '@/context/AppContext';
import { QUESTS } from '@/lib/achievements';
import { motion } from 'framer-motion';
import { Trophy, Lock, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function AchievementsShowcase() {
  const { state } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { recentUnlocked, nextLocked } = useMemo(() => {
    const unlocked = [...state.unlockedAchievements].sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
    const unlockedIds = new Set(unlocked.map(u => u.id));
    const locked = QUESTS.filter(q => !unlockedIds.has(q.id));
    return { recentUnlocked: unlocked.slice(0, 3), nextLocked: locked.slice(0, 3) };
  }, [state.unlockedAchievements]);

  const displayQuests = [...recentUnlocked.map(u => QUESTS.find(q => q.id === u.id)!), ...nextLocked];

  const QuestCard = ({ quest, isModal = false }: { quest: typeof QUESTS[0], isModal?: boolean }) => {
    const unlocked = state.unlockedAchievements.find(a => a.id === quest.id);
    return (
      <motion.div 
        key={quest.id}
        whileHover={{ y: -4, scale: 1.02 }}
        style={{
          background: unlocked ? 'var(--bg-card-hover)' : 'var(--bg-base)',
          border: unlocked ? '1px solid var(--border)' : '1px dashed var(--border)',
          borderRadius: 16,
          padding: 16,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          opacity: unlocked ? 1 : 0.6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {unlocked && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 60,
              height: 60,
              background: 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, transparent 70%)',
              zIndex: 0
            }}
          />
        )}
        
        <div style={{ fontSize: 32, marginBottom: 8, position: 'relative', zIndex: 1, filter: unlocked ? 'none' : 'grayscale(100%) blur(1px)' }}>
          {quest.icon}
        </div>
        
        <div style={{ fontSize: 13, fontWeight: 600, color: unlocked ? 'var(--text-main)' : 'var(--text-muted)', marginBottom: 4, position: 'relative', zIndex: 1 }}>
          {quest.title}
        </div>
        
        {isModal && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, position: 'relative', zIndex: 1 }}>{typeof quest.description === 'function' ? quest.description(state) : quest.description}</div>}

        {!unlocked && quest.getProgress && (
          <div style={{ width: '100%', padding: '0 8px', marginTop: 4, marginBottom: 8, position: 'relative', zIndex: 1 }}>
            {(() => {
              const prog = quest.getProgress(state);
              const pct = Math.min(100, Math.max(0, (prog.current / prog.max) * 100));
              const displayCurrent = prog.label === 'currency' ? formatCurrency(prog.current, state.currency) : Math.floor(prog.current);
              const displayMax = prog.label === 'currency' ? formatCurrency(prog.max, state.currency) : prog.max;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{displayCurrent}</span>
                    <span>{displayMax}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {unlocked ? (
          <div style={{ fontSize: 11, color: '#eab308', position: 'relative', zIndex: 1 }}>
            Unlocked {format(new Date(unlocked.unlockedAt), 'MMM d, yyyy')}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
            <Lock size={10} /> Locked
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(234, 179, 8, 0.2)', padding: 10, borderRadius: 12 }}>
            <Trophy size={20} color="#eab308" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Quests & Achievements</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Unlocked {state.unlockedAchievements.length} of {QUESTS.length}
            </p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>
          View All <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16, flex: 1, alignContent: 'start' }}>
        {displayQuests.map(quest => <QuestCard key={quest.id} quest={quest} />)}
      </div>

      {showModal && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setShowModal(false)}>
          <div style={{ 
            background: 'var(--bg-surface)', 
            borderRadius: 16,
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            maxWidth: 800, 
            width: '90%', 
            maxHeight: '85vh', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 0 
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Trophy size={24} color="#eab308" />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>All Quests ({state.unlockedAchievements.length}/{QUESTS.length})</h2>
              </div>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {QUESTS.map(quest => <QuestCard key={quest.id} quest={quest} isModal={true} />)}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
