'use client';

import { useState, useEffect } from 'react';
import { TransactionForm } from '@/components/transactions/TransactionForm';

interface Props {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export function GlobalQuickAdd({ externalOpen, onExternalClose }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Sync with external open trigger (keyboard shortcut from AppShell)
  useEffect(() => {
    if (externalOpen) setIsOpen(true);
  }, [externalOpen]);

  function handleClose() {
    setIsOpen(false);
    onExternalClose?.();
  }

  if (!isOpen) return null;

  return (
    <TransactionForm
      onClose={handleClose}
    />
  );
}
