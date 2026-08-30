'use client';

import React, { useState, useRef } from 'react';
import { MessageSquarePlus, X, Star, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

type FeedbackType = 'issue' | 'idea' | 'ease-of-use';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('idea');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [details, setDetails] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isFirebaseConfigured, user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Limit file size to 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      toast.error('Please provide some details.');
      return;
    }
    if (rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isFirebaseConfigured && db) {
        let fileUrl = null;

        // 1. Upload File if exists and storage is configured
        if (file && storage) {
          const fileExt = file.name.split('.').pop();
          const fileName = `feedback/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const storageRef = ref(storage, fileName);
          
          try {
            const snapshot = await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(snapshot.ref);
          } catch (uploadError) {
            console.error("File upload failed", uploadError);
            toast.error("Could not upload the attached file, but submitting feedback anyway.");
          }
        }

        // 2. Save Document to Firestore
        await addDoc(collection(db, 'feedback'), {
          type,
          rating,
          details,
          fileUrl,
          userEmail: user?.email || 'Anonymous',
          userId: user?.uid || 'anonymous',
          createdAt: serverTimestamp(),
          userAgent: navigator.userAgent
        });

      } else {
        // Fallback: Mailto link
        const subject = encodeURIComponent(`SolV Feedback: [${type.toUpperCase()}]`);
        let body = `Rating: ${rating} Stars\nType: ${type}\n\nDetails:\n${details}\n\n`;
        
        if (file) {
          body += `\n[Note: You attempted to attach a file (${file.name}). Because cloud sync is not enabled, please attach it to this email manually.]\n`;
        }

        const mailtoLink = `mailto:support@solv.com?subject=${subject}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        
        // Wait a brief moment before closing to ensure the mail client opens
        await new Promise(r => setTimeout(r, 500));
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        // Reset form
        setTimeout(() => {
          setIsSuccess(false);
          setType('idea');
          setRating(0);
          setDetails('');
          setFile(null);
        }, 300);
      }, 2000);

    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9000,
          borderRadius: 100,
          padding: '12px 20px',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
        }}
        title="Send Feedback"
      >
        <MessageSquarePlus size={20} />
        <span style={{ fontWeight: 600 }}>Feedback</span>
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => !isSubmitting && setIsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                width: '100%',
                maxWidth: 480,
                overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Share Your Feedback</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              {isSuccess ? (
                <div style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    <CheckCircle2 size={64} color="var(--income)" />
                  </motion.div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Thank You!</h3>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Your feedback helps us make SolV better for everyone.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Rating */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Overall Experience
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            color: (hoverRating || rating) >= star ? '#eab308' : 'var(--border-strong)',
                            transition: 'color 0.2s'
                          }}
                        >
                          <Star size={32} fill={(hoverRating || rating) >= star ? '#eab308' : 'transparent'} strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Feedback Type
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['idea', 'issue', 'ease-of-use'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 100,
                            fontSize: 13,
                            fontWeight: 600,
                            border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                            background: type === t ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            color: type === t ? 'var(--accent)' : 'var(--text-main)',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {t.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Details
                    </label>
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="What's on your mind? How can we improve?"
                      style={{
                        width: '100%',
                        minHeight: 120,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* File Upload (Optional) */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Attachment (Optional, max 5MB)
                    </label>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                    
                    {file ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <button 
                          type="button"
                          onClick={() => setFile(null)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--expense)', cursor: 'pointer', padding: 4 }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'transparent',
                          border: '1px dashed var(--border-strong)',
                          borderRadius: 12,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500
                        }}
                      >
                        <Upload size={18} /> Upload Image or PDF
                      </button>
                    )}
                    
                    {!isFirebaseConfigured && file && (
                      <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 8, margin: '8px 0 0 0' }}>
                        Cloud sync is not enabled. Attachments cannot be sent automatically and must be attached manually to your email client.
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={18} className="spin" /> Sending...</>
                      ) : (
                        'Send Feedback'
                      )}
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
