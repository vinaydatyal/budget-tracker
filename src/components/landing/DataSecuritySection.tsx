'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, HardDrive, CloudOff } from 'lucide-react';

export function DataSecuritySection() {
  return (
    <section style={{ padding: '120px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={40} />
            </div>
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 24px 0', color: '#fff' }}>
            Your Data. Your Vault.
          </h2>
          <p style={{ fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 48 }}>
            Most finance apps hold your data hostage on their servers to analyze your spending habits. <strong>Not SolV.</strong>
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 24, border: '1px solid var(--border)' }}>
              <HardDrive size={24} color="#34d399" style={{ marginBottom: 16 }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Local-First Ledger</h4>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>All transactions are processed and stored directly on your device using blazing fast IndexedDB.</p>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 24, border: '1px solid var(--border)' }}>
              <CloudOff size={24} color="#eab308" style={{ marginBottom: 16 }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Zero Cloud Lock-In</h4>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>You can use SolV completely offline. If you want cross-device sync, connect your own Firebase account in settings.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
