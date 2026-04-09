'use client';

import { useState } from 'react';
import {
  Headphones,
  FileText,
  BookOpen,
  HelpCircle,
  Clock,
  Map,
  Loader2,
  Play,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useVaultStore } from '@/lib/vault-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { StudioOutputType, StudioOutputConfig } from './types';

const STUDIO_OUTPUTS: StudioOutputConfig[] = [
  { type: 'briefcast', label: 'Echo Briefcast', description: 'AI-generated audio discussion of your documents', icon: 'headphones', color: '#F97316' },
  { type: 'executive_brief', label: 'Executive Brief', description: 'High-level summary with key findings and risks', icon: 'file-text', color: '#3B82F6' },
  { type: 'field_guide', label: 'Field Guide', description: 'Actionable reference for teams and estimators', icon: 'book-open', color: '#10B981' },
  { type: 'qa_digest', label: 'Q&A Digest', description: 'Frequently asked questions from your sources', icon: 'help-circle', color: '#8B5CF6' },
  { type: 'timeline', label: 'Project Timeline', description: 'Chronological view of documents and milestones', icon: 'clock', color: '#F59E0B' },
  { type: 'document_map', label: 'Document Map', description: 'Table of contents and cross-reference index', icon: 'map', color: '#06B6D4' },
];

const ICON_MAP: Record<string, typeof Headphones> = {
  headphones: Headphones,
  'file-text': FileText,
  'book-open': BookOpen,
  'help-circle': HelpCircle,
  clock: Clock,
  map: Map,
};

export function StudioPanel() {
  const studioOutputs = useVaultStore((s) => s.studioOutputs);
  const generatingOutput = useVaultStore((s) => s.generatingOutput);
  const generateStudioOutput = useVaultStore((s) => s.generateStudioOutput);
  const setActiveOutput = useVaultStore((s) => s.setActiveOutput);
  const deleteStudioOutput = useVaultStore((s) => s.deleteStudioOutput);
  const selectedSourceIds = useVaultStore((s) => s.selectedSourceIds);
  const [hoveredType, setHoveredType] = useState<StudioOutputType | null>(null);

  const handleGenerate = async (type: StudioOutputType) => {
    if (selectedSourceIds.size === 0) {
      toast.error('Select at least one source to generate from');
      return;
    }
    await generateStudioOutput(type);
    toast.success(`Generated ${STUDIO_OUTPUTS.find(o => o.type === type)?.label}`);
  };

  const getOutputForType = (type: StudioOutputType) =>
    studioOutputs.find(o => o.outputType === type);

  return (
    <div className="flex flex-col h-full border-l border-zinc-200 bg-zinc-50/50">
      <div className="px-4 py-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-zinc-700">Echo Studio</h3>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1">Generate AI-powered outputs from your sources</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {STUDIO_OUTPUTS.map((config) => {
          const Icon = ICON_MAP[config.icon] || FileText;
          const output = getOutputForType(config.type);
          const isGenerating = generatingOutput === config.type;
          const isReady = output?.status === 'ready';
          const isHovered = hoveredType === config.type;

          return (
            <div
              key={config.type}
              className={cn(
                'relative rounded-xl border p-3 transition-all',
                isReady
                  ? 'bg-white border-zinc-200 shadow-sm'
                  : 'bg-white/60 border-zinc-100 hover:border-zinc-200 hover:shadow-sm',
              )}
              onMouseEnter={() => setHoveredType(config.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.color + '15' }}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: config.color }} />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800">{config.label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{config.description}</p>

                  <div className="flex items-center gap-1.5 mt-2">
                    {isReady ? (
                      <>
                        <button
                          onClick={() => setActiveOutput(output!)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                          {config.type === 'briefcast' ? <Play className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {config.type === 'briefcast' ? 'Play' : 'View'}
                        </button>
                        <button
                          onClick={() => handleGenerate(config.type)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                        >
                          Regenerate
                        </button>
                        {isHovered && (
                          <button
                            onClick={() => deleteStudioOutput(output!.id)}
                            className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : isGenerating ? (
                      <span className="text-[10px] text-zinc-400 animate-pulse">Generating...</span>
                    ) : (
                      <button
                        onClick={() => handleGenerate(config.type)}
                        disabled={selectedSourceIds.size === 0}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors',
                          selectedSourceIds.size > 0
                            ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            : 'bg-zinc-50 text-zinc-300 cursor-not-allowed',
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isReady && (
                <div className="absolute top-3 right-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-zinc-200">
        <p className="text-[10px] text-zinc-400 text-center">
          {selectedSourceIds.size} source{selectedSourceIds.size !== 1 ? 's' : ''} selected
        </p>
      </div>
    </div>
  );
}
