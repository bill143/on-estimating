/**
 * Echo AI Agent Store — Persistent roaming AI assistant state
 */

import { create } from 'zustand';

export interface EchoMessage {
  id: string;
  role: 'user' | 'echo';
  content: string;
  timestamp: string;
  context?: string;
}

export interface EchoSettings {
  agentName: string;
  voiceId: string;
  wakeWordEnabled: boolean;
  wakeWordSensitivity: number;
}

interface EchoState {
  isOpen: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  messages: EchoMessage[];
  currentPage: string;
  settings: EchoSettings;

  // Actions
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setCurrentPage: (page: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  updateSettings: (patch: Partial<EchoSettings>) => void;
}

function getContextualResponse(page: string, query: string): string {
  const q = query.toLowerCase();

  if (page === '/dashboard' || page.includes('dashboard')) {
    if (q.includes('kpi') || q.includes('metric') || q.includes('numbers'))
      return "Looking at your Dashboard KPIs: you have active projects in the pipeline with estimates in various stages. Your win rate and confidence scores are tracked automatically from your bid outcomes. Want me to break down any specific metric?";
    return "You're on the Dashboard. I can see your pipeline overview, recent estimates, and activity feed. What would you like to know about your current project status?";
  }

  if (page.includes('/vault')) {
    if (q.includes('upload') || q.includes('document') || q.includes('file'))
      return "You can upload documents by dragging them into The Vault or clicking the upload zone. I support PDFs, blueprints, specs, photos, RFIs, and Word docs. I'll auto-process and categorize them for you.";
    return "Welcome to The Vault. I'm ready to help you analyze your project documents. Select a Studio project to chat about specific specs, drawings, or RFIs. I can also run deep research across all your sources.";
  }

  if (page.includes('/projects')) {
    return "You're viewing your Projects directory. I can help you navigate project details, find specific estimates or takeoffs, or search for documents across your project portfolio.";
  }

  if (page.includes('/home')) {
    return "This is your Command Center. I can give you a daily briefing on pending approvals, upcoming deadlines, and today's weather for your project sites. What would you like to know?";
  }

  if (q.includes('hello') || q.includes('hi echo') || q.includes('hey'))
    return `Hey! I'm Echo, your AI assistant. I'm always here — just click my orb or say "Echo" to get my attention. How can I help you today?`;

  if (q.includes('briefing') || q.includes('summary') || q.includes('today'))
    return "Here's your daily briefing:\n\n- You have active projects requiring attention\n- Check your pending RFI responses\n- Review any estimates awaiting approval\n- Weather looks clear for your project sites today\n\nWant me to dive deeper into any of these?";

  return "I'm here to help! I can answer questions about your documents, summarize project status, explain specifications, or help you navigate the app. What do you need?";
}

export const useEchoStore = create<EchoState>((set, get) => ({
  isOpen: false,
  isListening: false,
  isSpeaking: false,
  messages: [],
  currentPage: '/dashboard',
  settings: {
    agentName: 'Echo',
    voiceId: 'alloy',
    wakeWordEnabled: true,
    wakeWordSensitivity: 0.7,
  },

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
  setListening: (isListening) => set({ isListening }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setCurrentPage: (currentPage) => set({ currentPage }),

  sendMessage: async (content: string) => {
    const now = new Date().toISOString();
    const { currentPage, messages } = get();
    const userMsg: EchoMessage = { id: crypto.randomUUID(), role: 'user', content, timestamp: now, context: currentPage };
    set({ messages: [...messages, userMsg], isSpeaking: true });

    // Simulate Echo thinking
    await new Promise((r) => setTimeout(r, 800));

    const response = getContextualResponse(currentPage, content);
    const echoMsg: EchoMessage = {
      id: crypto.randomUUID(),
      role: 'echo',
      content: response,
      timestamp: new Date().toISOString(),
      context: currentPage,
    };
    set({ messages: [...get().messages, echoMsg], isSpeaking: false });
  },

  clearMessages: () => set({ messages: [] }),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
}));
