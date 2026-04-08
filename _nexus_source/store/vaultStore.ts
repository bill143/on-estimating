/**
 * Vault Store — State management for The Vault (Document Intelligence + Studio)
 */

import { create } from 'zustand';
import type {
  VaultNotebook,
  VaultSource,
  VaultChatMessage,
  VaultChatSession,
  VaultResearchResult,
  VaultNote,
  StudioOutput,
  StudioOutputType,
  BriefcastSegment,
  VaultTab,
} from '@/modules/vault/types';
import { vaultApi } from '@/modules/vault/api';

// ── Studio output seed generators ─────────

function generateBriefcastContent(notebook: VaultNotebook, sources: VaultSource[]): { transcript: BriefcastSegment[]; duration: number } {
  const sourceNames = sources.filter(s => s.status === 'ready').map(s => s.title).slice(0, 5);
  const segments: BriefcastSegment[] = [
    { id: 'seg-1', speaker: 'host_a', speakerName: 'Alex', text: `Welcome to this Echo Briefcast. Today we're diving into the documents from "${notebook.name}". We've got ${sources.length} sources to cover, so let's get right into it.`, startSec: 0, endSec: 12 },
    { id: 'seg-2', speaker: 'host_b', speakerName: 'Jordan', text: `Yeah, this is a fascinating collection. The core documents here are ${sourceNames.slice(0, 3).join(', ')}. There's a lot of detail packed into these specs.`, startSec: 12, endSec: 24 },
    { id: 'seg-3', speaker: 'host_a', speakerName: 'Alex', text: `Let's start with the big picture. What are the key requirements and constraints we're seeing across these documents?`, startSec: 24, endSec: 32 },
    { id: 'seg-4', speaker: 'host_b', speakerName: 'Jordan', text: `So the major themes I'm picking up are quality control requirements, specific material specifications, and some pretty detailed submittal procedures. The general requirements document lays out the framework, and then the individual spec sections build on that.`, startSec: 32, endSec: 48 },
    { id: 'seg-5', speaker: 'host_a', speakerName: 'Alex', text: `That's a great summary. And when we look at the drawings — the floor plans and mechanical layouts — they tell a complementary story about the physical scope of work.`, startSec: 48, endSec: 58 },
    { id: 'seg-6', speaker: 'host_b', speakerName: 'Jordan', text: `Exactly. One thing I want to highlight is how the RFIs and submittals interact with the base specs. There are some clarifications in the RFI responses that actually modify the original spec intent. That's something estimators need to watch carefully.`, startSec: 58, endSec: 72 },
    { id: 'seg-7', speaker: 'host_a', speakerName: 'Alex', text: `Great point. For anyone working with these documents, the key takeaway is to cross-reference the RFI responses against the original spec sections. Don't estimate from specs alone — the RFIs contain critical amendments.`, startSec: 72, endSec: 86 },
    { id: 'seg-8', speaker: 'host_b', speakerName: 'Jordan', text: `Couldn't agree more. And that wraps up our Briefcast for "${notebook.name}". Thanks for listening — and remember, Echo is always here to help you dig deeper into any of these documents.`, startSec: 86, endSec: 98 },
  ];
  return { transcript: segments, duration: 98 };
}

function generateExecutiveBrief(notebook: VaultNotebook, sources: VaultSource[]): string {
  const readySources = sources.filter(s => s.status === 'ready');
  return `# Executive Brief: ${notebook.name}

## Overview
This brief summarizes ${readySources.length} documents in the "${notebook.name}" collection. The documents span specifications, drawings, RFIs, and submittals related to this project scope.

## Key Findings

### Scope of Work
- The project involves multiple construction divisions with detailed specifications
- Architectural, mechanical, and structural components are well-documented
- ${readySources.filter(s => s.sourceType === 'blueprint').length} drawings and ${readySources.filter(s => s.sourceType === 'pdf').length} specification documents form the core documentation set

### Critical Requirements
- Quality control procedures are defined in Division 01 — General Requirements
- Material submittals must follow the specified review timeline
- All work must comply with applicable federal construction standards

### Risk Areas
- RFI responses contain scope modifications not reflected in the original drawings
- Some specification sections reference standards that may have been updated since issuance
- Coordination between mechanical and architectural systems requires careful review

### Budget Considerations
- Material specifications indicate mid-to-high quality tier selections
- Labor-intensive installation methods specified for several systems
- Phasing requirements may impact mobilization and overhead costs

## Recommendations
1. Cross-reference all RFI responses against base specifications before estimating
2. Verify referenced standards are current editions
3. Review drawing coordination between disciplines for potential conflicts
4. Flag any ambiguous scope areas for clarification before bid submission

## Document Summary
| Type | Count | Status |
|------|-------|--------|
${readySources.map(s => `| ${s.sourceType.toUpperCase()} | ${s.title} | ${s.status} |`).join('\n')}

---
*Generated by Echo AI Studio from ${readySources.length} source documents*`;
}

function generateFieldGuide(notebook: VaultNotebook, sources: VaultSource[]): string {
  return `# Field Guide: ${notebook.name}

## Purpose
This field guide distills the key information from ${sources.length} project documents into an actionable reference for field teams and estimators.

## Document Organization

### Specifications
${sources.filter(s => s.sourceType === 'pdf').map(s => `- **${s.title}** — ${s.wordCount.toLocaleString()} words, covers ${s.topics.join(', ')}`).join('\n') || '- No specification documents uploaded yet'}

### Drawings & Blueprints
${sources.filter(s => s.sourceType === 'blueprint').map(s => `- **${s.title}** — ${s.topics.join(', ')}`).join('\n') || '- No drawings uploaded yet'}

### RFIs & Submittals
${sources.filter(s => ['rfi', 'submittal'].includes(s.sourceType)).map(s => `- **${s.title}** — ${s.sourceType.toUpperCase()}`).join('\n') || '- No RFIs or submittals uploaded yet'}

## Key Terms & Definitions
- **CSI Division**: Construction Specifications Institute classification system
- **RFI**: Request for Information — formal clarification from the design team
- **Submittal**: Product data, samples, or shop drawings submitted for approval
- **Spec Section**: A specific section of the project manual addressing one trade or system

## Quick Reference Checklist
- [ ] Review all spec sections applicable to your trade
- [ ] Check RFI log for any modifications to your scope
- [ ] Verify material specifications match approved submittals
- [ ] Confirm quantities against the latest revision drawings
- [ ] Note any phasing or sequencing requirements
- [ ] Identify long-lead items that need early procurement

## Study Questions
1. What are the primary materials specified for the major building systems?
2. How do the RFI responses modify the original design intent?
3. What quality control and inspection requirements apply?
4. Are there any alternates or value engineering options listed?
5. What are the critical path items for scheduling?

---
*Generated by Echo AI Studio*`;
}

function generateQADigest(notebook: VaultNotebook, sources: VaultSource[]): string {
  return `# Q&A Digest: ${notebook.name}

## Frequently Asked Questions

### General Project Scope

**Q: What is the overall scope of this project?**
A: Based on the ${sources.length} documents in this collection, the project encompasses construction work spanning multiple CSI divisions. The documentation includes specifications, drawings, and field documents that define the complete scope of work.

**Q: How many source documents are included?**
A: This collection contains ${sources.length} documents: ${sources.filter(s => s.sourceType === 'pdf').length} PDFs, ${sources.filter(s => s.sourceType === 'blueprint').length} drawings, ${sources.filter(s => ['rfi', 'submittal'].includes(s.sourceType)).length} RFIs/submittals, and ${sources.filter(s => s.sourceType === 'image').length} images.

### Specifications

**Q: What specification format is used?**
A: The project follows CSI MasterFormat organization. Individual spec sections detail material requirements, installation methods, and quality assurance procedures for each trade.

**Q: Are there any specification amendments?**
A: Yes — RFI responses in this collection contain modifications to the base specifications. Always cross-reference RFI responses against the original spec sections.

### Drawings & Plans

**Q: What drawing disciplines are included?**
A: The drawing set includes ${[...new Set(sources.filter(s => s.sourceType === 'blueprint').flatMap(s => s.topics))].join(', ') || 'architectural, structural, and mechanical'} drawings.

**Q: Are the drawings the latest revision?**
A: Verify revision dates on each drawing sheet. RFIs may have triggered drawing revisions that supersede earlier issues.

### Estimating Considerations

**Q: What are the key cost drivers in these documents?**
A: Based on the specifications, key cost drivers include material grade requirements, installation complexity, quality control testing, and any phasing or scheduling constraints.

**Q: Are there alternate pricing opportunities?**
A: Review the specifications for "or equal" substitution clauses. Some sections may allow value engineering alternatives that could affect pricing.

### Compliance

**Q: What federal standards apply?**
A: Federal construction projects typically require compliance with FAR/DFAR clauses, Davis-Bacon wage rates, and agency-specific standards (VA, USACE, NAVFAC, or GSA).

**Q: Are there specific safety requirements?**
A: Review Division 01 for project-specific safety requirements. Federal projects typically reference EM 385-1-1 or equivalent safety standards.

---
*Generated by Echo AI Studio from ${sources.length} source documents*`;
}

function generateTimeline(notebook: VaultNotebook, sources: VaultSource[]): string {
  const sorted = [...sources].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return `# Project Timeline: ${notebook.name}

## Document Chronology

${sorted.map((s, i) => {
  const date = new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `### ${i + 1}. ${date} — ${s.title}
- **Type**: ${s.sourceType.toUpperCase()}
- **Status**: ${s.status}
- **Topics**: ${s.topics.join(', ') || 'General'}
${s.wordCount > 0 ? `- **Word Count**: ${s.wordCount.toLocaleString()}` : ''}`;
}).join('\n\n')}

## Key Milestones

| Phase | Event | Documents |
|-------|-------|-----------|
| Initial Issue | Base specifications and drawings issued | ${sources.filter(s => ['pdf', 'blueprint'].includes(s.sourceType)).length} docs |
| Clarifications | RFIs issued and responded to | ${sources.filter(s => s.sourceType === 'rfi').length} RFIs |
| Submittals | Product submittals reviewed | ${sources.filter(s => s.sourceType === 'submittal').length} submittals |
| Site Documentation | Photos and field reports captured | ${sources.filter(s => s.sourceType === 'image').length} images |

## Document Activity Summary
- **Earliest document**: ${sorted.length > 0 ? new Date(sorted[0].createdAt).toLocaleDateString() : 'N/A'}
- **Latest document**: ${sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString() : 'N/A'}
- **Total sources**: ${sources.length}
- **Processing complete**: ${sources.filter(s => s.status === 'ready').length}/${sources.length}

---
*Generated by Echo AI Studio*`;
}

function generateDocumentMap(notebook: VaultNotebook, sources: VaultSource[]): string {
  const byType: Record<string, VaultSource[]> = {};
  sources.forEach(s => {
    if (!byType[s.sourceType]) byType[s.sourceType] = [];
    byType[s.sourceType].push(s);
  });

  return `# Document Map: ${notebook.name}

## Collection Overview
**${sources.length} documents** organized across ${Object.keys(byType).length} categories

${Object.entries(byType).map(([type, docs]) => `
## ${type.toUpperCase()} (${docs.length})
${docs.map((d, i) => `${i + 1}. **${d.title}**
   - Status: ${d.status} | Words: ${d.wordCount.toLocaleString()} | Size: ${d.fileSize ? (d.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}
   - Topics: ${d.topics.join(', ') || 'Uncategorized'}`).join('\n')}`).join('\n')}

## Topic Index
${(() => {
  const topicMap: Record<string, string[]> = {};
  sources.forEach(s => s.topics.forEach(t => {
    if (!topicMap[t]) topicMap[t] = [];
    topicMap[t].push(s.title);
  }));
  return Object.entries(topicMap)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([topic, docs]) => `- **${topic}** — ${docs.length} document${docs.length > 1 ? 's' : ''}: ${docs.join(', ')}`)
    .join('\n');
})()}

## Cross-Reference Matrix
Documents that share common topics are likely to contain related or conflicting information. Review these groups for consistency:

${(() => {
  const groups: string[] = [];
  const topicMap: Record<string, VaultSource[]> = {};
  sources.forEach(s => s.topics.forEach(t => {
    if (!topicMap[t]) topicMap[t] = [];
    topicMap[t].push(s);
  }));
  Object.entries(topicMap).forEach(([topic, docs]) => {
    if (docs.length > 1) {
      groups.push(`- **${topic}**: ${docs.map(d => d.title).join(' + ')}`);
    }
  });
  return groups.length > 0 ? groups.join('\n') : '- No overlapping topics detected yet';
})()}

---
*Generated by Echo AI Studio*`;
}

// ── Seed data ──────────────────────────────

const SEED_NOTEBOOKS: VaultNotebook[] = [
  {
    id: 'vault-nb-1',
    name: 'VA Medical Center — Specs & Drawings',
    description: 'All specifications and construction drawings for the Tampa VA renovation',
    icon: '🏥',
    color: '#3B82F6',
    tags: ['VA', 'medical', 'renovation'],
    pinned: true,
    sourceCount: 12,
    projectId: 'proj-1',
    createdAt: '2025-11-15T10:00:00Z',
    updatedAt: '2026-03-28T14:30:00Z',
  },
  {
    id: 'vault-nb-2',
    name: 'USACE Barracks — RFIs & Submittals',
    description: 'RFI responses and submittal packages for Fort Liberty barracks project',
    icon: '🏗️',
    color: '#10B981',
    tags: ['USACE', 'barracks', 'new-construction'],
    pinned: false,
    sourceCount: 8,
    projectId: 'proj-2',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-03-25T11:15:00Z',
  },
  {
    id: 'vault-nb-3',
    name: 'NAVFAC Pier Rehab — Engineering Reports',
    description: 'Structural engineering reports and underwater inspection results',
    icon: '⚓',
    color: '#8B5CF6',
    tags: ['NAVFAC', 'marine', 'rehabilitation'],
    pinned: false,
    sourceCount: 5,
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-03-20T16:45:00Z',
  },
  {
    id: 'vault-nb-4',
    name: 'GSA Courthouse — Cost Data',
    description: 'Historical cost data and RS Means references for federal courthouse work',
    icon: '⚖️',
    color: '#F59E0B',
    tags: ['GSA', 'courthouse', 'cost-data'],
    pinned: true,
    sourceCount: 15,
    createdAt: '2025-09-01T12:00:00Z',
    updatedAt: '2026-04-01T09:00:00Z',
  },
];

const SEED_SOURCES: Record<string, VaultSource[]> = {
  'vault-nb-1': [
    { id: 'src-1', notebookId: 'vault-nb-1', title: 'Division 01 — General Requirements.pdf', sourceType: 'pdf', status: 'ready', wordCount: 45200, topics: ['general conditions', 'submittals', 'quality control'], fileSize: 2400000, createdAt: '2025-11-15T10:05:00Z' },
    { id: 'src-2', notebookId: 'vault-nb-1', title: 'A-101 Floor Plan — Level 1.pdf', sourceType: 'blueprint', status: 'ready', wordCount: 0, topics: ['architectural', 'floor plan'], fileSize: 8500000, createdAt: '2025-11-15T10:10:00Z' },
    { id: 'src-3', notebookId: 'vault-nb-1', title: 'M-201 HVAC Ductwork Layout.pdf', sourceType: 'blueprint', status: 'ready', wordCount: 0, topics: ['mechanical', 'HVAC', 'ductwork'], fileSize: 6200000, createdAt: '2025-11-16T09:00:00Z' },
    { id: 'src-4', notebookId: 'vault-nb-1', title: 'Site Conditions Photo — Existing Lobby.jpg', sourceType: 'image', status: 'ready', wordCount: 0, topics: ['site conditions', 'existing'], fileSize: 3100000, createdAt: '2025-12-01T14:30:00Z' },
    { id: 'src-5', notebookId: 'vault-nb-1', title: 'RFI-007 — Ceiling Height Clarification.pdf', sourceType: 'rfi', status: 'ready', wordCount: 1200, topics: ['RFI', 'architectural', 'ceiling'], fileSize: 450000, createdAt: '2026-01-15T11:00:00Z' },
  ],
  'vault-nb-2': [
    { id: 'src-6', notebookId: 'vault-nb-2', title: 'Submittal — CMU Block Samples.pdf', sourceType: 'submittal', status: 'ready', wordCount: 3400, topics: ['masonry', 'CMU', 'submittal'], fileSize: 1800000, createdAt: '2026-01-12T10:00:00Z' },
    { id: 'src-7', notebookId: 'vault-nb-2', title: 'RFI-012 — Foundation Depth Change.pdf', sourceType: 'rfi', status: 'ready', wordCount: 800, topics: ['structural', 'foundation', 'RFI'], fileSize: 320000, createdAt: '2026-02-05T15:00:00Z' },
    { id: 'src-8', notebookId: 'vault-nb-2', title: 'Geotech Report — Soil Boring Logs.pdf', sourceType: 'pdf', status: 'ready', wordCount: 12800, topics: ['geotechnical', 'soil', 'boring logs'], fileSize: 5600000, createdAt: '2026-01-20T08:30:00Z' },
  ],
};

const SEED_NOTES: Record<string, VaultNote[]> = {
  'vault-nb-1': [
    {
      id: 'note-1',
      notebookId: 'vault-nb-1',
      title: 'Ceiling height discrepancy',
      content: 'RFI-007 clarifies that the ceiling height in the lobby should be 12\'6" clear, not 10\' as shown on A-101. This affects the HVAC ductwork routing on M-201. Need to verify mechanical coordination.',
      citations: [
        { sourceId: 'src-5', sourceTitle: 'RFI-007 — Ceiling Height Clarification.pdf', citedText: 'Ceiling height revised to 12\'6" clear' },
        { sourceId: 'src-2', sourceTitle: 'A-101 Floor Plan — Level 1.pdf', citedText: 'Original plan shows 10\' ceiling' },
      ],
      pinned: true,
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-02-01T10:00:00Z',
    },
    {
      id: 'note-2',
      notebookId: 'vault-nb-1',
      title: 'Quality control testing requirements',
      content: 'Division 01 requires third-party testing for concrete, structural steel, and fireproofing. Budget for testing agency costs. Minimum 5 business days notice for inspections.',
      citations: [
        { sourceId: 'src-1', sourceTitle: 'Division 01 — General Requirements.pdf', citedText: 'Third-party testing required per Section 01 45 00' },
      ],
      pinned: false,
      createdAt: '2026-02-10T14:00:00Z',
      updatedAt: '2026-02-10T14:00:00Z',
    },
  ],
};

// ── Store ──────────────────────────────────

interface VaultState {
  notebooks: VaultNotebook[];
  activeNotebook: (VaultNotebook & { sources?: VaultSource[] }) | null;
  loadingNotebooks: boolean;

  // Source selection
  selectedSourceIds: Set<string>;

  // Chat
  chatMessages: VaultChatMessage[];
  activeChatSession: VaultChatSession | null;
  chatSessions: VaultChatSession[];
  chatLoading: boolean;

  // Research
  researchAnswer: VaultResearchResult | null;
  researchLoading: boolean;

  // Studio outputs
  studioOutputs: StudioOutput[];
  activeOutput: StudioOutput | null;
  generatingOutput: StudioOutputType | null;

  // Notes
  notes: VaultNote[];
  activeNote: VaultNote | null;

  activeTab: VaultTab;
  uploadingFile: boolean;

  // Notebook actions
  fetchNotebooks: () => Promise<void>;
  selectNotebook: (id: string) => Promise<void>;
  createNotebook: (data: Partial<VaultNotebook>) => Promise<VaultNotebook>;
  deleteNotebook: (id: string) => Promise<void>;
  setActiveNotebook: (notebook: VaultNotebook | null) => void;

  // Source actions
  toggleSourceSelection: (sourceId: string) => void;
  selectAllSources: () => void;
  deselectAllSources: () => void;
  uploadFile: (file: File) => Promise<void>;

  // Chat actions
  sendChatMessage: (content: string) => Promise<void>;
  clearChat: () => void;

  // Research actions
  sendResearchQuery: (query: string) => Promise<void>;

  // Studio actions
  generateStudioOutput: (outputType: StudioOutputType) => Promise<void>;
  setActiveOutput: (output: StudioOutput | null) => void;
  deleteStudioOutput: (id: string) => void;

  // Note actions
  createNote: (data: Partial<VaultNote>) => void;
  updateNote: (id: string, data: Partial<VaultNote>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (note: VaultNote | null) => void;

  setActiveTab: (tab: VaultTab) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  notebooks: SEED_NOTEBOOKS,
  activeNotebook: null,
  loadingNotebooks: false,

  selectedSourceIds: new Set<string>(),

  chatMessages: [],
  activeChatSession: null,
  chatSessions: [],
  chatLoading: false,

  researchAnswer: null,
  researchLoading: false,

  studioOutputs: [],
  activeOutput: null,
  generatingOutput: null,

  notes: [],
  activeNote: null,

  activeTab: 'chat',
  uploadingFile: false,

  // ── Notebooks ───────────────────────────

  fetchNotebooks: async () => {
    set({ loadingNotebooks: true });
    try {
      const notebooks = await vaultApi.listNotebooks();
      set({ notebooks, loadingNotebooks: false });
    } catch {
      set({ notebooks: SEED_NOTEBOOKS, loadingNotebooks: false });
    }
  },

  selectNotebook: async (id: string) => {
    const existing = get().notebooks.find((n) => n.id === id);
    if (!existing) return;

    try {
      const notebook = await vaultApi.getNotebook(id);
      const allSourceIds = new Set((notebook.sources || []).map(s => s.id));
      set({
        activeNotebook: notebook,
        selectedSourceIds: allSourceIds,
        chatMessages: [],
        activeChatSession: null,
        researchAnswer: null,
        studioOutputs: [],
        activeOutput: null,
        notes: [],
        activeTab: 'chat',
      });
    } catch {
      const sources = SEED_SOURCES[id] || [];
      const allSourceIds = new Set(sources.map(s => s.id));
      const notes = SEED_NOTES[id] || [];
      set({
        activeNotebook: { ...existing, sources },
        selectedSourceIds: allSourceIds,
        chatMessages: [],
        activeChatSession: null,
        researchAnswer: null,
        studioOutputs: [],
        activeOutput: null,
        notes,
        activeTab: 'chat',
      });
    }
  },

  createNotebook: async (data) => {
    const now = new Date().toISOString();
    const notebook: VaultNotebook = {
      id: crypto.randomUUID(),
      name: data.name || 'Untitled Studio',
      description: data.description || '',
      icon: data.icon || '📓',
      color: data.color || '#6366f1',
      tags: data.tags || [],
      pinned: false,
      sourceCount: 0,
      projectId: data.projectId,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const created = await vaultApi.createNotebook(data);
      set({ notebooks: [...get().notebooks, created] });
      return created;
    } catch {
      set({ notebooks: [...get().notebooks, notebook] });
      return notebook;
    }
  },

  deleteNotebook: async (id: string) => {
    try { await vaultApi.deleteNotebook(id); } catch { /* continue */ }
    set({
      notebooks: get().notebooks.filter((n) => n.id !== id),
      activeNotebook: get().activeNotebook?.id === id ? null : get().activeNotebook,
    });
  },

  setActiveNotebook: (notebook) => set({
    activeNotebook: notebook ? { ...notebook, sources: [] } : null,
    studioOutputs: [],
    activeOutput: null,
    notes: [],
    selectedSourceIds: new Set(),
  }),

  // ── Source selection ────────────────────

  toggleSourceSelection: (sourceId: string) => {
    const next = new Set(get().selectedSourceIds);
    if (next.has(sourceId)) next.delete(sourceId);
    else next.add(sourceId);
    set({ selectedSourceIds: next });
  },

  selectAllSources: () => {
    const sources = get().activeNotebook?.sources || [];
    set({ selectedSourceIds: new Set(sources.map(s => s.id)) });
  },

  deselectAllSources: () => set({ selectedSourceIds: new Set() }),

  uploadFile: async (file: File) => {
    const { activeNotebook } = get();
    set({ uploadingFile: true });
    try {
      await vaultApi.uploadSource(file, activeNotebook?.id);
      if (activeNotebook) get().selectNotebook(activeNotebook.id);
    } catch {
      if (activeNotebook) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const sourceType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' as const
          : ['doc', 'docx'].includes(ext) ? 'word' as const
          : 'pdf' as const;
        const newSource: VaultSource = {
          id: crypto.randomUUID(),
          notebookId: activeNotebook.id,
          title: file.name,
          sourceType,
          status: 'ready',
          wordCount: 0,
          topics: [],
          fileSize: file.size,
          createdAt: new Date().toISOString(),
        };
        const currentSources = activeNotebook.sources || [];
        const updatedSources = [...currentSources, newSource];
        set({
          activeNotebook: { ...activeNotebook, sources: updatedSources, sourceCount: activeNotebook.sourceCount + 1 },
          notebooks: get().notebooks.map((n) => n.id === activeNotebook.id ? { ...n, sourceCount: n.sourceCount + 1 } : n),
          selectedSourceIds: new Set([...get().selectedSourceIds, newSource.id]),
        });
      }
    } finally {
      set({ uploadingFile: false });
    }
  },

  // ── Chat ────────────────────────────────

  sendChatMessage: async (content: string) => {
    const { activeNotebook, activeChatSession, chatMessages } = get();
    const now = new Date().toISOString();
    const userMessage: VaultChatMessage = { id: crypto.randomUUID(), role: 'user', content, timestamp: now };
    set({ chatMessages: [...chatMessages, userMessage], chatLoading: true });

    try {
      const response = await vaultApi.sendMessage({
        content,
        session_id: activeChatSession?.id,
        notebook_id: activeNotebook?.id,
      });
      const assistantMessage: VaultChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        turnNumber: response.turn_number,
        citations: response.citations,
        timestamp: new Date().toISOString(),
      };
      set({
        chatMessages: [...get().chatMessages, assistantMessage],
        chatLoading: false,
        activeChatSession: activeChatSession || {
          id: response.session_id,
          title: content.slice(0, 50),
          messageCount: 2,
          createdAt: now,
        },
      });
    } catch {
      const sources = activeNotebook?.sources || [];
      const sourceList = sources.slice(0, 3).map(s => s.title).join(', ');
      const assistantMessage: VaultChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Based on the ${sources.length} documents in "${activeNotebook?.name || 'this collection'}" (including ${sourceList}), here's what I found:\n\nThis is a demo response — connect the Vault API to enable real AI-powered document analysis with inline citations.\n\nTry asking about specific topics from your uploaded documents, and Echo will ground its answers in your source material.`,
        citations: sources.slice(0, 2).map(s => ({ sourceId: s.id, sourceTitle: s.title, citedText: `Referenced from ${s.title}` })),
        timestamp: new Date().toISOString(),
      };
      set({ chatMessages: [...get().chatMessages, assistantMessage], chatLoading: false });
    }
  },

  clearChat: () => set({ chatMessages: [], activeChatSession: null }),

  // ── Research ────────────────────────────

  sendResearchQuery: async (query: string) => {
    const { activeNotebook } = get();
    set({ researchLoading: true });
    try {
      const result = await vaultApi.researchQuery({ query, notebook_id: activeNotebook?.id });
      set({ researchAnswer: result, researchLoading: false });
    } catch {
      set({
        researchAnswer: {
          sessionId: crypto.randomUUID(),
          turnId: crypto.randomUUID(),
          turnNumber: 1,
          answer: `Research results for "${query}":\n\nThis is a demo response. Connect the Vault API backend to enable deep research with source-grounded citations across your project documents.`,
          citations: [],
          followUpQuestions: ['What are the key specifications?', 'Are there any discrepancies?', 'Summarize the requirements'],
          modelUsed: 'demo',
          latencyMs: 0,
          totalTurns: 1,
        },
        researchLoading: false,
      });
    }
  },

  // ── Studio outputs ─────────────────────

  generateStudioOutput: async (outputType: StudioOutputType) => {
    const { activeNotebook, selectedSourceIds, studioOutputs } = get();
    if (!activeNotebook) return;

    const sources = (activeNotebook.sources || []).filter(s => selectedSourceIds.has(s.id));
    if (sources.length === 0) return;

    set({ generatingOutput: outputType });

    // Remove existing output of this type
    const filtered = studioOutputs.filter(o => o.outputType !== outputType);
    const newOutput: StudioOutput = {
      id: crypto.randomUUID(),
      notebookId: activeNotebook.id,
      outputType,
      title: getOutputTitle(outputType, activeNotebook.name),
      status: 'generating',
      sourceIds: [...selectedSourceIds],
    };
    set({ studioOutputs: [...filtered, newOutput] });

    // Simulate generation delay
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

    try {
      const result = await vaultApi.generateStudioOutput({
        notebook_id: activeNotebook.id,
        output_type: outputType,
        source_ids: [...selectedSourceIds],
      });
      set({
        studioOutputs: get().studioOutputs.map(o => o.id === newOutput.id ? result : o),
        generatingOutput: null,
      });
    } catch {
      // Offline: generate locally
      let content = '';
      let transcript: BriefcastSegment[] | undefined;
      let duration: number | undefined;

      switch (outputType) {
        case 'briefcast': {
          const bc = generateBriefcastContent(activeNotebook, sources);
          transcript = bc.transcript;
          duration = bc.duration;
          content = bc.transcript.map(s => `**${s.speakerName}**: ${s.text}`).join('\n\n');
          break;
        }
        case 'executive_brief':
          content = generateExecutiveBrief(activeNotebook, sources);
          break;
        case 'field_guide':
          content = generateFieldGuide(activeNotebook, sources);
          break;
        case 'qa_digest':
          content = generateQADigest(activeNotebook, sources);
          break;
        case 'timeline':
          content = generateTimeline(activeNotebook, sources);
          break;
        case 'document_map':
          content = generateDocumentMap(activeNotebook, sources);
          break;
      }

      const readyOutput: StudioOutput = {
        ...newOutput,
        status: 'ready',
        content,
        audioTranscript: transcript,
        audioDurationSec: duration,
        generatedAt: new Date().toISOString(),
      };
      set({
        studioOutputs: get().studioOutputs.map(o => o.id === newOutput.id ? readyOutput : o),
        generatingOutput: null,
      });
    }
  },

  setActiveOutput: (output) => set({ activeOutput: output }),

  deleteStudioOutput: (id: string) => {
    set({
      studioOutputs: get().studioOutputs.filter(o => o.id !== id),
      activeOutput: get().activeOutput?.id === id ? null : get().activeOutput,
    });
  },

  // ── Notes ──────────────────────────────

  createNote: (data) => {
    const now = new Date().toISOString();
    const note: VaultNote = {
      id: crypto.randomUUID(),
      notebookId: get().activeNotebook?.id || '',
      title: data.title || 'Untitled Note',
      content: data.content || '',
      citations: data.citations || [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    set({ notes: [...get().notes, note], activeNote: note });
  },

  updateNote: (id, data) => {
    set({
      notes: get().notes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n),
      activeNote: get().activeNote?.id === id ? { ...get().activeNote!, ...data, updatedAt: new Date().toISOString() } : get().activeNote,
    });
  },

  deleteNote: (id) => {
    set({
      notes: get().notes.filter(n => n.id !== id),
      activeNote: get().activeNote?.id === id ? null : get().activeNote,
    });
  },

  setActiveNote: (note) => set({ activeNote: note }),

  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// ── Helpers ────────────────────────────────

function getOutputTitle(type: StudioOutputType, notebookName: string): string {
  const titles: Record<StudioOutputType, string> = {
    briefcast: `Echo Briefcast — ${notebookName}`,
    executive_brief: `Executive Brief — ${notebookName}`,
    field_guide: `Field Guide — ${notebookName}`,
    qa_digest: `Q&A Digest — ${notebookName}`,
    timeline: `Project Timeline — ${notebookName}`,
    document_map: `Document Map — ${notebookName}`,
  };
  return titles[type];
}
