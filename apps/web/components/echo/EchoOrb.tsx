'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useEchoStore } from '@/lib/echo-store';
import { cn } from '@/lib/utils';

export function EchoOrb() {
  const isOpen = useEchoStore((s) => s.isOpen);
  const isSpeaking = useEchoStore((s) => s.isSpeaking);
  const toggleOpen = useEchoStore((s) => s.toggleOpen);
  const setCurrentPage = useEchoStore((s) => s.setCurrentPage);
  const agentName = useEchoStore((s) => s.settings.agentName);
  const pathname = usePathname();

  // Track current page for contextual awareness
  useEffect(() => {
    setCurrentPage(pathname);
  }, [pathname, setCurrentPage]);

  return (
    <>
      {/* Dim overlay when Echo is active */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/15 z-40 transition-opacity duration-300"
          onClick={toggleOpen}
        />
      )}

      {/* Floating orb */}
      <button
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center',
          'shadow-lg transition-all duration-300 hover:scale-110',
          isOpen
            ? 'bg-zinc-800 text-white scale-110'
            : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
          isSpeaking && 'animate-pulse',
        )}
        title={`${agentName} AI Assistant`}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-30" />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
        )}
      </button>
    </>
  );
}
