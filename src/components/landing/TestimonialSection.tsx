'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export function TestimonialSection() {
  const testimonials = [
    {
      quote: "I used to juggle YNAB for personal budgeting and QuickBooks for my freelance work. SolV completely replaced both. The dual-hub architecture is a lifesaver.",
      author: "Sarah J.",
      role: "Freelance Designer"
    },
    {
      quote: "Finally, an app that understands small business owners. I can track my business runway and my household net worth in the exact same interface without the data ever crossing streams.",
      author: "Michael T.",
      role: "Agency Founder"
    },
    {
      quote: "The fact that it runs locally and doesn't require a monthly subscription makes it the best financial tool I've ever used. The UI is just the cherry on top.",
      author: "Priya R.",
      role: "E-commerce Store Owner"
    }
  ];

  return (
    <section style={{ padding: '120px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 80 }}>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 16px 0', color: '#fff' }}>
          Loved by Creators & Founders
        </h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)' }}>Don't just take our word for it.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {testimonials.map((t, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ background: 'var(--surface)', padding: 32, borderRadius: 24, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="#eab308" color="#eab308" />)}
              </div>
              <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 24 }}>
                "{t.quote}"
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.author}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.role}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
