'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, TrendingUp, Layers } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Create Your Vault',
      desc: 'Set up your secure, local-first database in seconds. Your financial history lives securely on your device, giving you total ownership of your data.',
      icon: <Database size={32} color="var(--text-main)" />
    },
    {
      num: '02',
      title: 'Stream Your Income',
      desc: 'Connect your personal budgets and freelance revenue into isolated, distinct streams. No more mixing client funds with household expenses.',
      icon: <Layers size={32} color="var(--accent)" />
    },
    {
      num: '03',
      title: 'Forecast the Future',
      desc: 'Let our intelligent ledger predict your 6-month runway and net worth trajectory automatically based on active subscriptions and historic burn rates.',
      icon: <TrendingUp size={32} color="var(--balance)" />
    }
  ];

  return (
    <section style={{ padding: '120px 20px', maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: 80 }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#fff' }}>
          The SolV Framework:<br />
          <span style={{ color: 'var(--text-secondary)' }}>Master Your Dual Financial Life</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, position: 'relative' }}>
        {steps.map((step, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: idx * 0.2 }}
            style={{ position: 'relative', padding: 32, background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.03)', position: 'absolute', top: 16, right: 24, lineHeight: 1 }}>
              {step.num}
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              {step.icon}
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#fff' }}>{step.title}</h3>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
