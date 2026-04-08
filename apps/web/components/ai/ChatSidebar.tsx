// NEXUS ON Estimating — AI Chat Sidebar (Persistent, Context-Aware)
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Trash2,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Loader2,
} from 'lucide-react';
import { useChatStore } from '@/lib/agents/chat-store';
import { cn } from '@/lib/utils';

const SUGGESTION_CHIPS = [
  'What is the total estimate cost?',
  'Break down costs by division',
  'Compare to similar projects',
  'Check Davis-Bacon compliance',
  'Suggest value engineering',
  'Flag high-risk line items',
];

export function ChatSidebar() {
  const {
    isOpen,
    isLoading,
    messages,
    toggleChat,
    closeChat,
    sendMessage,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage]
  );

  // Floating action button when closed
  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl hover:scale-105 active:scale-95"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed right-0 top-0 z-50 flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-700 dark:bg-gray-900',
        isExpanded ? 'w-[600px]' : 'w-[400px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              NEXUS AI Assistant
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Construction Estimating Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={closeChat}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
              <MessageSquare className="h-8 w-8 text-brand-500" />
            </div>
            <h4 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              How can I help?
            </h4>
            <p className="mb-6 max-w-[280px] text-sm text-gray-500 dark:text-gray-400">
              Ask me about your estimates, costs, bids, compliance, or anything related to your
              construction projects.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_CHIPS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-600 dark:hover:bg-brand-900/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user'
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'bg-brand-100 dark:bg-brand-900'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={cn(
                      'mt-1 text-[10px]',
                      msg.role === 'user'
                        ? 'text-brand-200'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
                  <Bot className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your estimate..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-400 focus:bg-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-700"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
          NEXUS AI may occasionally provide inaccurate information. Always verify critical costs.
        </p>
      </div>
    </div>
  );
}
