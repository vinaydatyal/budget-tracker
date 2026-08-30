import React from 'react';

export function LandingFooter() {
  return (
    <footer style={{
      padding: '40px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(0,0,0,0.2)',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginBottom: 8 }}>SolV</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Two distinct streams, one secure vault.</div>
      </div>
      
      <div style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        fontSize: 14
      }}>
        Proudly made in India <span style={{ fontSize: 16 }}>🇮🇳</span>
      </div>

      <div style={{ marginTop: 40, color: 'var(--text-muted)', fontSize: 12 }}>
        &copy; {new Date().getFullYear()} SolV. All rights reserved.
      </div>
    </footer>
  );
}
