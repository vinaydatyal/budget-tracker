'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SplitSquareHorizontal, Shield, Brain, Lock, ArrowRight, Building2, User } from 'lucide-react';

export function FeatureGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="features" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#fff' }}>
          One App. Two Financial Lives.
        </h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Small business owners shouldn't need two different apps to understand their net worth. SolV gives you enterprise-grade business tracking alongside beautifully simple personal budgeting.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24
        }}
      >
        {/* Dual Hub Highlight (Spans 2 columns on desktop) */}
        <motion.div variants={itemVariants} style={{ 
          gridColumn: '1 / -1',
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 24, 
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: 'linear-gradient(-90deg, rgba(236, 72, 153, 0.05) 0%, transparent 100%)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} />
            </div>
            <ArrowRight size={24} color="var(--text-muted)" />
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(236, 72, 153, 0.1)', color: 'var(--balance)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={32} />
            </div>
          </div>
          
          <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' }}>The Dual-Hub Architecture</h3>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6, margin: 0 }}>
            Instantly toggle between your Personal Budget and your Business Dashboard. Track invoices, tax liabilities, and client revenue on one side, while monitoring your grocery budget and household net worth on the other. Completely distinct data, seamlessly accessible.
          </p>
        </motion.div>

        {/* Bank Grade Security */}
        <motion.div variants={itemVariants} style={{ 
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 32 
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' }}>Local-First Privacy</h3>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Your financial data is yours. SolV operates local-first by default, meaning your ledgers live on your device. Sync securely to the cloud only when you want to. No subscriptions. No data mining.
          </p>
        </motion.div>

        {/* Smart Double Entry */}
        <motion.div variants={itemVariants} style={{ 
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 32 
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Shield size={24} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' }}>Smart Ledger Engine</h3>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Built on a robust double-entry accounting foundation that operates invisibly under a beautiful UI. Every transaction is balanced mathematically so your Net Worth is always 100% accurate.
          </p>
        </motion.div>

        {/* AI Powered */}
        <motion.div variants={itemVariants} style={{ 
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 32 
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Brain size={24} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' }}>6-Month Forecast</h3>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Stop looking backward. SolV's engine analyzes your active subscriptions, burn rates, and recurring invoices to project your cash flow up to 6 months into the future.
          </p>
        </motion.div>

      </motion.div>
    </section>
  );
}
