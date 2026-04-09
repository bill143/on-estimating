'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import { useEchoStore } from '@/lib/echo-store';
import { cn } from '@/lib/utils';

export function EchoPanel() {
  const isOpen = useEchoStore((s) => s.isOpen);
  const messages = useEchoStore((s) => s.messages);
  const isSpeaking = useEchoStore((s) => s.isSpeaking);
  const sendMessage = useEchoStore((s) => s.sendMessage);
  const clearMessages = useEchoStore((s) => s.clearMessages);
  const agentName = useEchoStore((s) => s.settings.agentName);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSpeaking) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{agentName}</h3>
              <p className="text-xs text-zinc-500">
                {isSpeaking ? 'Thinking...' : 'AI Assistant — Always here to help'}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="w-8 h-8 text-orange-300 mb-3" />
            <p className="text-sm text-zinc-500 mb-4">
              Hi! I&apos;m {agentName}. Ask me anything about your projects, documents, or this page.
            </p>
            <div className="space-y-2 w-full">
              {['Give me a daily briefing', 'What page am I on?', 'Help me navigate'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-100 text-zinc-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5',
              msg.role === 'user'
                ? 'ml-auto bg-orange-600 text-white'
                : 'bg-zinc-100 text-zinc-800',
            )}
          >
            {msg.role === 'echo' && (
              <p className="text-[10px] font-semibold text-orange-600 mb-1">{agentName}</p>
            )}
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        ))}

        {isSpeaking && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">{agentName} is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask ${agentName}...`}
            className="flex-1 h-10 px-4 rounded-xl border border-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSpeaking}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              input.trim()
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-zinc-100 text-zinc-400',
            )}
          >
            {isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
