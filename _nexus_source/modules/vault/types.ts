// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// The Vault — Document Intelligence Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface VaultNotebook {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  pinned: boolean;
  sourceCount: number;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSource {
  id: string;
  notebookId: string;
  title: string;
  sourceType: 'pdf' | 'image' | 'word' | 'text' | 'url' | 'blueprint' | 'rfi' | 'submittal';
  status: 'processing' | 'ready' | 'error';
  wordCount: number;
  topics: string[];
  fileSize?: number;
  thumbnailUrl?: string;
  selected?: boolean;
  createdAt: string;
}

export interface VaultChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  turnNumber?: number;
  citations?: VaultCitation[];
  timestamp: string;
}

export interface VaultCitation {
  sourceId: string;
  sourceTitle: string;
  citedText: string;
  relevance?: number;
}

export interface VaultChatSession {
  id: string;
  notebookId?: string;
  title: string;
  messageCount: number;
  createdAt: string;
}

export interface VaultResearchResult {
  sessionId: string;
  turnId: string;
  turnNumber: number;
  answer: string;
  citations: VaultCitation[];
  followUpQuestions: string[];
  modelUsed: string;
  latencyMs: number;
  totalTurns: number;
}

// ── Studio Output Types ───────────────────

export type StudioOutputType =
  | 'briefcast'       // Audio Overview → Echo Briefcast
  | 'executive_brief' // Briefing Document → Executive Brief
  | 'field_guide'     // Study Guide → Field Guide
  | 'qa_digest'       // FAQ → Q&A Digest
  | 'timeline'        // Timeline → Project Timeline
  | 'document_map';   // Table of Contents → Document Map

export interface StudioOutput {
  id: string;
  notebookId: string;
  outputType: StudioOutputType;
  title: string;
  status: 'idle' | 'generating' | 'ready' | 'error';
  content?: string;
  // Briefcast-specific
  audioTranscript?: BriefcastSegment[];
  audioDurationSec?: number;
  // Metadata
  sourceIds: string[];
  generatedAt?: string;
  errorMessage?: string;
}

export interface BriefcastSegment {
  id: string;
  speaker: 'host_a' | 'host_b';
  speakerName: string;
  text: string;
  startSec: number;
  endSec: number;
}

export interface StudioOutputConfig {
  type: StudioOutputType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// ── Notes ─────────────────────────────────

export interface VaultNote {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  citations: VaultCitation[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Artifacts (legacy compat) ─────────────

export interface VaultArtifact {
  id: string;
  notebookId: string;
  title: string;
  artifactType: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
  content?: string;
  createdAt: string;
}

export type VaultTab = 'chat' | 'notes';
