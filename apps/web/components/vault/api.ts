/**
 * The Vault API Client — Typed HTTP client for document intelligence backend
 */

import type {
  VaultNotebook,
  VaultSource,
  VaultChatMessage,
  VaultChatSession,
  VaultResearchResult,
  VaultNote,
  StudioOutput,
  StudioOutputType,
} from './types';

const VAULT_API_BASE = process.env.NEXT_PUBLIC_VAULT_API_URL || 'http://localhost:8000';

class VaultClient {
  private token = '';

  setToken(token: string) {
    this.token = token;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${VAULT_API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Vault API Error: ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // ── Notebooks ────────────────────────────
  async listNotebooks(): Promise<VaultNotebook[]> {
    return this.request('GET', '/api/v1/notebooks');
  }

  async createNotebook(data: Partial<VaultNotebook>): Promise<VaultNotebook> {
    return this.request('POST', '/api/v1/notebooks', data);
  }

  async getNotebook(id: string): Promise<VaultNotebook & { sources: VaultSource[] }> {
    return this.request('GET', `/api/v1/notebooks/${id}`);
  }

  async deleteNotebook(id: string): Promise<void> {
    return this.request('DELETE', `/api/v1/notebooks/${id}`);
  }

  // ── Sources ──────────────────────────────
  async uploadSource(file: File, notebookId?: string): Promise<VaultSource> {
    const formData = new FormData();
    formData.append('file', file);
    if (notebookId) formData.append('notebook_id', notebookId);

    const h: Record<string, string> = {};
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(`${VAULT_API_BASE}/api/v1/sources/upload`, {
      method: 'POST',
      headers: h,
      body: formData,
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return response.json();
  }

  async deleteSource(id: string): Promise<void> {
    return this.request('DELETE', `/api/v1/sources/${id}`);
  }

  // ── Chat ─────────────────────────────────
  async sendMessage(data: {
    content: string;
    session_id?: string;
    notebook_id?: string;
  }): Promise<{ content: string; session_id: string; turn_number: number; citations: VaultChatMessage['citations'] }> {
    return this.request('POST', '/api/v1/chat', data);
  }

  async listSessions(notebookId?: string): Promise<VaultChatSession[]> {
    const qs = notebookId ? `?notebook_id=${notebookId}` : '';
    return this.request('GET', `/api/v1/chat/sessions${qs}`);
  }

  async getSessionMessages(sessionId: string): Promise<VaultChatMessage[]> {
    return this.request('GET', `/api/v1/chat/sessions/${sessionId}/messages`);
  }

  // ── Research ─────────────────────────────
  async researchQuery(data: {
    query: string;
    session_id?: string;
    notebook_id?: string;
  }): Promise<VaultResearchResult> {
    return this.request('POST', '/api/v1/research', data);
  }

  // ── Studio Outputs ──────────────────────
  async generateStudioOutput(data: {
    notebook_id: string;
    output_type: StudioOutputType;
    source_ids: string[];
  }): Promise<StudioOutput> {
    return this.request('POST', '/api/v1/studio/generate', data);
  }

  async listStudioOutputs(notebookId: string): Promise<StudioOutput[]> {
    return this.request('GET', `/api/v1/studio/outputs?notebook_id=${notebookId}`);
  }

  async deleteStudioOutput(id: string): Promise<void> {
    return this.request('DELETE', `/api/v1/studio/outputs/${id}`);
  }

  // ── Notes ───────────────────────────────
  async listNotes(notebookId: string): Promise<VaultNote[]> {
    return this.request('GET', `/api/v1/notes?notebook_id=${notebookId}`);
  }

  async createNote(data: Partial<VaultNote>): Promise<VaultNote> {
    return this.request('POST', '/api/v1/notes', data);
  }

  async updateNote(id: string, data: Partial<VaultNote>): Promise<VaultNote> {
    return this.request('PATCH', `/api/v1/notes/${id}`, data);
  }

  async deleteNote(id: string): Promise<void> {
    return this.request('DELETE', `/api/v1/notes/${id}`);
  }

  // ── Health ───────────────────────────────
  async healthCheck(): Promise<{ status: string }> {
    return this.request('GET', '/health/ready');
  }
}

export const vaultApi = new VaultClient();
