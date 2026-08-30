'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const features = [
    "Unlimited Personal Accounts",
    "Unlimited Business Ledgers",
    "Smart 6-Month Forecasting",
    "Fully Local Data Ownership",
    "No Monthly Subscriptions",
    "Export to CSV Anytime"
  ];

  return (
    <section style={{ padding: '120px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 16px 0', color: '#fff' }}>
          Premium Software. Zero Subscriptions.
        </h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)' }}>SolV is built on the philosophy of financial freedom.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--accent)', 
            borderRadius: 32, 
            padding: 48,
            width: '100%',
            maxWidth: 600,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(99, 102, 241, 0.1)'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--accent), var(--balance))' }} />
          
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1 }}>$0</div>
            <div style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>Forever</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 16, color: 'var(--text-main)' }}>{f}</span>
              </div>
            ))}
          </div>

          <Link 
            href="/dashboard"
            style={{
              display: 'block',
              textAlign: 'center',
              background: 'var(--text-main)',
              color: 'var(--bg-main)',
              padding: '16px 32px',
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Create Your Vault Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
