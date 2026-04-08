// NEXUS ON Estimating — AI Chat Store (Zustand)
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AIMessage, AgentContext } from '@on/db';

interface ChatState {
  isOpen: boolean;
  isLoading: boolean;
  messages: AIMessage[];
  conversationId: string | null;
  context: AgentContext;
  pageContext: string;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  setContext: (updates: Partial<AgentContext>) => void;
  setPageContext: (page: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    isOpen: false,
    isLoading: false,
    messages: [],
    conversationId: null,
    context: {
      userId: '',
      organizationId: '',
      permissions: [],
      metadata: {},
    },
    pageContext: 'dashboard',

    toggleChat: () => set((s) => { s.isOpen = !s.isOpen; }),
    openChat: () => set((s) => { s.isOpen = true; }),
    closeChat: () => set((s) => { s.isOpen = false; }),

    sendMessage: async (content: string) => {
      const state = get();

      // Add user message
      const userMsg: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: state.conversationId || '',
        role: 'user',
        content,
        agent_id: null,
        skill_id: null,
        tool_calls: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      set((s) => {
        s.messages.push(userMsg);
        s.isLoading = true;
      });

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: buildContextPrompt(state.pageContext, state.context),
            messages: state.messages.slice(-10),
            userInput: content,
            context: state.context,
          }),
        });

        if (!response.ok) throw new Error('Chat request failed');

        const data = await response.json();

        const assistantMsg: AIMessage = {
          id: crypto.randomUUID(),
          conversation_id: state.conversationId || '',
          role: 'assistant',
          content: data.response || 'I apologize, I could not process that request.',
          agent_id: null,
          skill_id: null,
          tool_calls: null,
          metadata: { usage: data.usage },
          created_at: new Date().toISOString(),
        };

        set((s) => {
          s.messages.push(assistantMsg);
          s.isLoading = false;
        });
      } catch (error) {
        const errorMsg: AIMessage = {
          id: crypto.randomUUID(),
          conversation_id: state.conversationId || '',
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          agent_id: null,
          skill_id: null,
          tool_calls: null,
          metadata: { error: String(error) },
          created_at: new Date().toISOString(),
        };

        set((s) => {
          s.messages.push(errorMsg);
          s.isLoading = false;
        });
      }
    },

    setContext: (updates) => set((s) => {
      Object.assign(s.context, updates);
    }),

    setPageContext: (page) => set((s) => { s.pageContext = page; }),

    clearMessages: () => set((s) => {
      s.messages = [];
      s.conversationId = null;
    }),
  }))
);

function buildContextPrompt(pageContext: string, context: AgentContext): string {
  const parts = [
    'You are the NEXUS ON Estimating AI Assistant — a senior estimator helping with construction cost estimation.',
    `The user is currently on the ${pageContext} page.`,
  ];

  if (context.activeEstimateId) {
    parts.push(`They are working on estimate: ${context.activeEstimateId}`);
  }
  if (context.activeProjectId) {
    parts.push(`Active project: ${context.activeProjectId}`);
  }

  parts.push(
    'You can help with: quantity takeoffs, pricing, bid management, analytics, compliance, and collaboration.',
    'Be concise but precise. Format costs as USD. Use CSI division codes when referencing trades.',
    'If you cannot answer definitively, say what data you need to provide a better answer.'
  );

  return parts.join('\n');
}
