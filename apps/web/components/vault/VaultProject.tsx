'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  StickyNote,
  Send,
  Loader2,
  Search,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { useVaultStore } from '@/lib/vault-store';
import { SourceList } from './SourceList';
import { StudioPanel } from './StudioPanel';
import { NotesPanel } from './NotesPanel';
import { OutputViewer } from './OutputViewer';
import { cn } from '@/lib/utils';
import type { VaultTab } from './types';

const centerTabs: { id: VaultTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

export function VaultProject() {
  const activeNotebook = useVaultStore((s) => s.activeNotebook);
  const activeTab = useVaultStore((s) => s.activeTab);
  const setActiveTab = useVaultStore((s) => s.setActiveTab);
  const setActiveNotebook = useVaultStore((s) => s.setActiveNotebook);
  const chatMessages = useVaultStore((s) => s.chatMessages);
  const chatLoading = useVaultStore((s) => s.chatLoading);
  const sendChatMessage = useVaultStore((s) => s.sendChatMessage);
  const researchAnswer = useVaultStore((s) => s.researchAnswer);
  const researchLoading = useVaultStore((s) => s.researchLoading);
  const sendResearchQuery = useVaultStore((s) => s.sendResearchQuery);
  const activeOutput = useVaultStore((s) => s.activeOutput);

  const [chatInput, setChatInput] = useState('');
  const [showResearch, setShowResearch] = useState(false);
  const [researchInput, setResearchInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!activeNotebook) return null;

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput('');
    await sendChatMessage(msg);
  };

  const handleResearch = async () => {
    if (!researchInput.trim() || researchLoading) return;
    const q = researchInput;
    setResearchInput('');
    await sendResearchQuery(q);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top header bar */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-white flex items-center gap-4">
        <button
          onClick={() => setActiveNotebook(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Studios</span>
        </button>
        <div className="h-5 w-px bg-zinc-200" />
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: activeNotebook.color + '20' }}
          >
            {activeNotebook.icon}
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 leading-tight">{activeNotebook.name}</h1>
            <p className="text-[10px] text-zinc-400">{activeNotebook.description}</p>
          </div>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sources */}
        <div className="w-64 flex-shrink-0">
          <SourceList />
        </div>

        {/* Center: Chat / Notes */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-200">
            {centerTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setShowResearch(false); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  activeTab === id
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            <div className="flex-1" />
            {activeTab === 'chat' && (
              <button
                onClick={() => setShowResearch(!showResearch)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  showResearch
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Deep Research
              </button>
            )}
          </div>

          {/* Center content */}
          {activeTab === 'chat' && !showResearch && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                      <MessageSquare className="w-7 h-7 text-orange-600" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 mb-1.5">Chat with Echo</h3>
                    <p className="text-sm text-zinc-500 max-w-md mb-6">
                      Ask questions about the documents in this studio.
                      Echo will answer with source-grounded citations.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {[
                        'Summarize the key specs',
                        'What are the RFI responses?',
                        'List all critical requirements',
                        'Find scope discrepancies',
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => setChatInput(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'ml-auto bg-orange-600 text-white'
                        : 'bg-zinc-100 text-zinc-900',
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-200/30 space-y-1">
                        {msg.citations.map((c, i) => (
                          <p key={i} className={cn(
                            'text-xs',
                            msg.role === 'user' ? 'text-orange-200' : 'text-zinc-500',
                          )}>
                            [{i + 1}] {c.sourceTitle}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Echo is thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="px-6 py-3 border-t border-zinc-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask Echo about your documents..."
                    className="flex-1 h-10 px-4 rounded-xl border border-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || chatLoading}
                    className={cn(
                      'px-4 h-10 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors',
                      chatInput.trim()
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && showResearch && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {researchAnswer ? (
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                          Research Answer
                        </span>
                      </div>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                        {researchAnswer.answer}
                      </p>
                      {researchAnswer.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-zinc-200 space-y-2">
                          <p className="text-xs font-semibold text-zinc-500">Sources</p>
                          {researchAnswer.citations.map((c, i) => (
                            <div key={i} className="text-xs p-2 rounded-md bg-white border border-zinc-100">
                              <span className="text-purple-600 font-semibold">[{i + 1}]</span>{' '}
                              <span className="font-medium">{c.sourceTitle}</span>
                              {c.citedText && <p className="text-zinc-500 mt-1 italic">&quot;{c.citedText}&quot;</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {researchAnswer.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {researchAnswer.followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setResearchInput(q)}
                            className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-colors flex items-center gap-1"
                          >
                            <ChevronRight className="w-3 h-3" />
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-7 h-7 text-purple-600" />
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900 mb-1.5">Deep Research</h3>
                      <p className="text-sm text-zinc-500">
                        Ask complex questions across all documents.
                        Echo will analyze sources in depth with citations.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-zinc-200 bg-white">
                <div className="flex gap-2 max-w-2xl mx-auto">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={researchInput}
                      onChange={(e) => setResearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                      placeholder="Ask a research question..."
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                    />
                  </div>
                  <button
                    onClick={handleResearch}
                    disabled={!researchInput.trim() || researchLoading}
                    className={cn(
                      'px-4 h-10 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors',
                      researchInput.trim()
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {researchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && <NotesPanel />}
        </div>

        {/* Right: Echo Studio */}
        <div className="w-72 flex-shrink-0">
          <StudioPanel />
        </div>
      </div>

      {/* Output viewer modal */}
      {activeOutput && <OutputViewer />}
    </div>
  );
}
