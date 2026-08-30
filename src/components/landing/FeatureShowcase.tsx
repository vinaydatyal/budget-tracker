'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Target, Calculator } from 'lucide-react';

export function FeatureShowcase() {
  return (
    <section style={{ padding: '120px 20px', maxWidth: 1200, margin: '0 auto', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 100 }}>
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#fff' }}>
          Enterprise Power.<br/>
          <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--balance))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Consumer Simplicity.</span>
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 120 }}>
        
        {/* Block 1: Business Hub */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
              <Receipt size={16} /> Freelance & Agency Hub
            </div>
            <h3 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>Stop mixing client funds with grocery money.</h3>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A dedicated workspace for your hustle. Track unpaid invoices, calculate upcoming tax liabilities automatically, and monitor your business burn rate without ever polluting your personal net worth calculations.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px', height: 400, background: 'var(--surface)', borderRadius: 32, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: '10%', left: '-10%', width: 300, height: 300, background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.2 }} />
            {/* Abstract UI */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ width: 120, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                <div style={{ width: 60, height: 16, background: 'rgba(99, 102, 241, 0.5)', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    <div style={{ width: 80, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                    <div style={{ width: 40, height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Block 2: Personal Ledger (Reversed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(236, 72, 153, 0.1)', color: 'var(--balance)', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
              <Target size={16} /> Personal Finance Hub
            </div>
            <h3 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>Budgeting that actually works.</h3>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Set strict monthly spending limits across dynamic categories. Track family shared expenses seamlessly, pay down debt with precision, and watch your total household net worth compound over time.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px', height: 400, background: 'var(--surface)', borderRadius: 32, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 300, height: 300, background: 'var(--balance)', filter: 'blur(100px)', opacity: 0.2 }} />
             {/* Abstract UI Circular Chart */}
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, borderRadius: '50%', border: '24px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--balance)', borderRightColor: 'var(--balance)' }} />
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 32, fontWeight: 800, color: '#fff' }}>72%</div>
          </motion.div>
        </div>

        {/* Block 3: Double Entry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
              <Calculator size={16} /> Double-Entry Engine
            </div>
            <h3 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>Invisible accounting complexity.</h3>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              We took the complexity of corporate double-entry accounting and hid it behind a stunningly simple interface. Every transaction balances perfectly behind the scenes, ensuring 100% data integrity for your audits.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: '1 1 400px', height: 400, background: 'var(--surface)', borderRadius: 32, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
          >
            {/* Abstract UI Ledger */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, boxShadow: '0 24px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                <div style={{ width: 80, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                <div style={{ width: 40, height: 16, background: 'rgba(239, 68, 68, 0.8)', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 100, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                <div style={{ width: 50, height: 16, background: 'rgba(34, 197, 94, 0.8)', borderRadius: 4 }} />
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
