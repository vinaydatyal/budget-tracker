'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Activity, ShieldCheck, Database, Zap } from 'lucide-react';

export function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 20px 60px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: 500, height: 500, background: 'var(--accent)', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 600, height: 600, background: 'var(--balance)', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1000, width: '100%', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 8, 
            padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid rgba(99, 102, 241, 0.2)', 
            borderRadius: 100, color: 'var(--accent)', 
            fontWeight: 600, fontSize: 13, marginBottom: 32 
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'var(--accent)', color: '#fff', borderRadius: '50%', fontSize: 10 }}>
            SV
          </span>
          Introducing SolV for Small Business Owners
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ 
            fontSize: 'clamp(48px, 8vw, 84px)', 
            fontWeight: 800, 
            lineHeight: 1.1, 
            letterSpacing: '-0.03em',
            margin: '0 0 24px 0',
            color: '#fff'
          }}
        >
          Two distinct streams.<br/>
          <span style={{ 
            background: 'linear-gradient(135deg, var(--accent), var(--balance))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            One secure vault.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            color: 'var(--text-secondary)',
            maxWidth: 680,
            margin: '0 0 48px 0',
            lineHeight: 1.6
          }}
        >
          The ultimate financial operating system built specifically for freelancers and small business owners. Cleanly separate your personal life from your business revenue without juggling multiple apps.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link 
            href="/dashboard"
            style={{
              background: 'var(--text-main)',
              color: 'var(--bg-main)',
              padding: '16px 32px',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Launch App <ArrowRight size={18} />
          </Link>
          <a 
            href="#features"
            style={{
              background: 'transparent',
              color: 'var(--text-main)',
              padding: '16px 32px',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Explore Features
          </a>
        </motion.div>

        {/* Abstract UI Placeholder (Since actual screenshots are pending) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{
            marginTop: 80,
            width: '100%',
            maxWidth: 1200,
            height: 400,
            background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.4) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottom: 'none',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 40
          }}
        >
          {/* Mockup Top Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#eab308' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          
          <div style={{ display: 'flex', gap: 24, width: '100%', padding: '0 40px' }}>
            <div style={{ width: 240, height: 300, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 20 }}>
              <div style={{ height: 20, width: '60%', background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 24 }} />
              <div style={{ height: 12, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 12, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1, height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={32} color="var(--accent)" opacity={0.5} />
                </div>
                <div style={{ flex: 1, height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={32} color="var(--balance)" opacity={0.5} />
                </div>
              </div>
              <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, opacity: 0.2 }}>
                  <path d="M0,100 L0,50 Q25,30 50,60 T100,40 L100,100 Z" fill="url(#heart-grad-mobile)" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
