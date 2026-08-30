'use client';

import React from 'react';
import Link from 'next/link';

export function LandingNavbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      background: 'rgba(9, 9, 11, 0.7)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          background: 'transparent', color: '#fff', fontSize: '18px', fontWeight: 800, 
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          position: 'relative' 
        }}>
          <svg viewBox="0 0 24 24" width="40" height="40" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 4px 8px var(--accent-glow))' }}>
            <defs>
              <linearGradient id="heart-grad-nav" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'var(--balance)', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <path fill="url(#heart-grad-nav)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span style={{ position: 'relative', zIndex: 1, marginTop: '-4px', marginLeft: '1px', WebkitTextFillColor: '#fff', letterSpacing: '0.5px' }}>SV</span>
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>SolV</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <a 
          href="/solv-app.apk" 
          download="solv-app.apk"
          style={{
            color: 'var(--text-muted)',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'color 0.2s',
            fontSize: '15px'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          Download App
        </a>
        <Link 
          href="/dashboard" 
          style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 12,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px var(--accent-glow)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px var(--accent-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow)';
          }}
        >
          Launch SolV
        </Link>
      </div>
    </nav>
  );
}
