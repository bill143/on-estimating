// NEXUS ON Estimating — Global Keyboard Shortcut System
'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/agents/chat-store';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * Global keyboard shortcut handler.
 * Registers shortcuts and dispatches actions.
 *
 * Shortcuts:
 * Ctrl+K          — Open AI chat
 * Ctrl+Shift+D    — Toggle dark mode
 * Ctrl+S          — Save current estimate (handled by estimate page)
 * Ctrl+D          — Duplicate selected row (handled by estimate grid)
 * Escape          — Close AI chat / close modals
 */
export function KeyboardShortcuts() {
  const { isOpen, toggleChat, closeChat } = useChatStore();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+K — Toggle AI chat
      if (isCtrl && e.key === 'k') {
        e.preventDefault();
        toggleChat();
        return;
      }

      // Ctrl+Shift+D — Toggle dark mode
      if (isCtrl && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Escape — Close chat or modals
      if (e.key === 'Escape') {
        if (isOpen) {
          closeChat();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleChat, closeChat, toggleTheme]);

  // This component renders nothing — it only registers event listeners
  return null;
}
