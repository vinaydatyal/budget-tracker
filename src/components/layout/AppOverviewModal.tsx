import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, SplitSquareHorizontal, Brain, Lock, MapPin, Heart } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AppOverviewModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={onClose}
        >
          <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 20, right: 20,
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'var(--text-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100
            }}
          >
            <X size={16} />
          </button>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Hero Header */}
          <div style={{
            padding: '48px 32px 32px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Glows */}
            <div style={{ position: 'absolute', top: -100, left: -50, width: 300, height: 300, background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: -50, right: -50, width: 250, height: 250, background: 'var(--balance)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ 
                  background: 'transparent', color: '#fff', fontSize: '24px', fontWeight: 800, 
                  width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  position: 'relative' 
                }}>
                  <svg viewBox="0 0 24 24" width="80" height="80" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 8px 16px var(--accent-glow))' }}>
                    <defs>
                      <linearGradient id="heart-grad-overview" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--balance)', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path fill="url(#heart-grad-overview)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span style={{ position: 'relative', zIndex: 1, marginTop: '-6px', marginLeft: '2px', WebkitTextFillColor: '#fff', letterSpacing: '1px' }}>SV</span>
                </div>
              </div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ 
                  fontSize: 48, 
                  fontWeight: 900, 
                  margin: '0 0 12px 0', 
                  letterSpacing: '-0.03em', 
                  background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #818cf8 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>
                SolV
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 18, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
                Two distinct streams, one secure vault.
              </motion.p>
            </div>
          </div>

          {/* Feature Grid */}
          <div style={{ padding: '0 32px 32px', position: 'relative', zIndex: 2 }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
            >
              {[
                {
                  icon: SplitSquareHorizontal,
                  color: 'var(--income)',
                  bg: 'rgba(52, 211, 153, 0.1)',
                  glow: 'rgba(52, 211, 153, 0.2)',
                  title: 'Dual-Hub Architecture',
                  desc: 'Cleanly silo your personal wealth tracking from your business revenue.'
                },
                {
                  icon: Shield,
                  color: 'var(--accent)',
                  bg: 'rgba(99, 102, 241, 0.1)',
                  glow: 'rgba(99, 102, 241, 0.2)',
                  title: 'Bank-Grade Security',
                  desc: 'Your complete general ledger and net worth history stored fully local or synced securely.'
                },
                {
                  icon: Brain,
                  color: 'var(--balance)',
                  bg: 'rgba(236, 72, 153, 0.1)',
                  glow: 'rgba(236, 72, 153, 0.2)',
                  title: 'Smart Ledger Engine',
                  desc: 'True double-entry accounting operating invisibly under a beautiful, simple UI.'
                },
                {
                  icon: Lock,
                  color: 'var(--warning)',
                  bg: 'rgba(234, 179, 8, 0.1)',
                  glow: 'rgba(234, 179, 8, 0.2)',
                  title: 'Total Ownership',
                  desc: 'No subscriptions, no data mining. You control your financial data forever.'
                }
              ].map((f, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -4, scale: 1.02 }}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    padding: 24, 
                    borderRadius: 20, 
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default'
                  }}
                >
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: f.glow, filter: 'blur(30px)' }} />
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: `1px solid ${f.glow}` }}>
                    <f.icon size={24} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          </div>

          {/* Footer / Made in India */}
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '24px', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Proudly made in India 
              <motion.span 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', display: 'inline-block' }}
              >
                🇮🇳
              </motion.span>
            </motion.div>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
