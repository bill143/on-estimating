import { X, Download, RefreshCw } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '@/lib/utils';

export function OutputViewer() {
  const activeOutput = useVaultStore((s) => s.activeOutput);
  const setActiveOutput = useVaultStore((s) => s.setActiveOutput);
  const generateStudioOutput = useVaultStore((s) => s.generateStudioOutput);

  if (!activeOutput || activeOutput.status !== 'ready') return null;

  // Briefcast gets the audio player
  if (activeOutput.outputType === 'briefcast' && activeOutput.audioTranscript) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveOutput(null)} />
        <div className="relative z-10 w-full max-w-2xl mx-4 h-[80vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200">
            <h2 className="text-sm font-bold text-zinc-900">Echo Briefcast</h2>
            <button
              onClick={() => setActiveOutput(null)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <AudioPlayer
            transcript={activeOutput.audioTranscript}
            durationSec={activeOutput.audioDurationSec || 0}
            title={activeOutput.title}
          />
        </div>
      </div>
    );
  }

  // All other outputs get the markdown-style viewer
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveOutput(null)} />
      <div className="relative z-10 w-full max-w-3xl mx-4 h-[85vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{activeOutput.title}</h2>
            {activeOutput.generatedAt && (
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Generated {new Date(activeOutput.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveOutput(null);
                generateStudioOutput(activeOutput.outputType);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <button
              onClick={() => {
                if (!activeOutput.content) return;
                const blob = new Blob([activeOutput.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeOutput.outputType}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => setActiveOutput(null)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <MarkdownRenderer content={activeOutput.content || ''} />
        </div>
      </div>
    </div>
  );
}

/** Simple markdown renderer for studio outputs */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {tableRows[0].map((cell, i) => (
                <th key={i} className="text-left px-3 py-2 bg-zinc-50 border border-zinc-200 font-semibold text-zinc-700">
                  {cell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(2).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 border border-zinc-200 text-zinc-600">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').filter(Boolean));
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-zinc-800 mt-6 mb-2">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-zinc-900 mt-8 mb-3 pb-2 border-b border-zinc-100">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-zinc-900 mb-4">
          {line.slice(2)}
        </h1>,
      );
    }
    // Horizontal rule
    else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-6 border-zinc-200" />);
    }
    // Checklist items
    else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const checked = line.startsWith('- [x] ');
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <input type="checkbox" checked={checked} readOnly className="mt-0.5 accent-orange-500" />
          <span className={cn('text-sm', checked ? 'text-zinc-400 line-through' : 'text-zinc-700')}>
            {line.slice(6)}
          </span>
        </div>,
      );
    }
    // Bullet points
    else if (line.startsWith('- ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-orange-400 mt-1 text-xs">&#x2022;</span>
          <span className="text-sm text-zinc-700">{renderInline(line.slice(2))}</span>
        </div>,
      );
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 ml-2">
            <span className="text-xs font-bold text-orange-500 mt-0.5 min-w-[16px]">{match[1]}.</span>
            <span className="text-sm text-zinc-700">{renderInline(match[2])}</span>
          </div>,
        );
      }
    }
    // Italic/emphasis blocks (indented sub-items)
    else if (line.startsWith('   - ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5 ml-8">
          <span className="text-zinc-300 mt-1 text-xs">&#x25E6;</span>
          <span className="text-xs text-zinc-600">{renderInline(line.trim().slice(2))}</span>
        </div>,
      );
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else if (line.startsWith('*Generated') || line.startsWith('*')) {
      elements.push(
        <p key={i} className="text-xs text-zinc-400 italic my-2">{line.replace(/^\*|\*$/g, '')}</p>,
      );
    } else {
      elements.push(
        <p key={i} className="text-sm text-zinc-700 leading-relaxed my-1">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushTable();

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-zinc-800">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
