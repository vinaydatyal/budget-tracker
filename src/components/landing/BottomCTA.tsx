'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function BottomCTA() {
  return (
    <section style={{ padding: '80px 20px 120px', maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 32,
          padding: '80px 40px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, margin: '0 0 24px 0', letterSpacing: '-0.02em', color: '#fff', position: 'relative', zIndex: 1 }}>
          Ready to lock in your wealth?
        </h2>
        <p style={{ fontSize: 20, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px auto', position: 'relative', zIndex: 1 }}>
          Join the smart founders who are organizing their two distinct streams into one secure vault.
        </p>
        
        <Link 
          href="/dashboard"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--accent), var(--balance))',
            color: '#fff',
            padding: '18px 40px',
            borderRadius: 100,
            fontSize: 18,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.3)';
          }}
        >
          Launch SolV
        </Link>
      </motion.div>
    </section>
  );
}
