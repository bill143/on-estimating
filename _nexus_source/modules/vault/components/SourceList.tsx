import { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Image,
  File,
  Upload,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  Plus,
} from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { cn, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

const SOURCE_TYPE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileText, color: 'text-red-500 bg-red-50' },
  blueprint: { icon: FileText, color: 'text-blue-500 bg-blue-50' },
  image: { icon: Image, color: 'text-purple-500 bg-purple-50' },
  word: { icon: File, color: 'text-blue-600 bg-blue-50' },
  rfi: { icon: FileText, color: 'text-amber-500 bg-amber-50' },
  submittal: { icon: FileText, color: 'text-green-500 bg-green-50' },
  text: { icon: FileText, color: 'text-zinc-500 bg-zinc-50' },
  url: { icon: FileText, color: 'text-indigo-500 bg-indigo-50' },
};

export function SourceList() {
  const activeNotebook = useVaultStore((s) => s.activeNotebook);
  const selectedSourceIds = useVaultStore((s) => s.selectedSourceIds);
  const toggleSourceSelection = useVaultStore((s) => s.toggleSourceSelection);
  const selectAllSources = useVaultStore((s) => s.selectAllSources);
  const deselectAllSources = useVaultStore((s) => s.deselectAllSources);
  const uploadFile = useVaultStore((s) => s.uploadFile);
  const uploading = useVaultStore((s) => s.uploadingFile);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = activeNotebook?.sources || [];
  const allSelected = sources.length > 0 && sources.every(s => selectedSourceIds.has(s.id));
  const someSelected = sources.some(s => selectedSourceIds.has(s.id));

  const handleFiles = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'txt', 'csv', 'xlsx'];
        if (!validExts.includes(ext)) {
          toast.error(`Unsupported file type: .${ext}`);
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max 50MB)`);
          continue;
        }
        await uploadFile(file);
        toast.success(`Uploaded: ${file.name}`);
      }
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex flex-col h-full border-r border-zinc-200 bg-zinc-50/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-700">Sources</h3>
          <span className="text-xs text-zinc-400">{sources.length}</span>
        </div>

        {/* Select all / Upload */}
        <div className="flex items-center justify-between">
          {sources.length > 0 && (
            <button
              onClick={() => allSelected ? deselectAllSources() : selectAllSources()}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
              ) : someSelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-orange-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add source
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sources.length === 0 ? (
          <div
            className={cn(
              'mx-2 mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
              isDragOver ? 'border-orange-400 bg-orange-50' : 'border-zinc-200 hover:border-zinc-300',
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto mb-2" />
            ) : (
              <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            )}
            <p className="text-xs font-medium text-zinc-600">
              {uploading ? 'Processing...' : 'Drop files here'}
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">
              PDFs, specs, drawings, photos
            </p>
          </div>
        ) : (
          <>
            {sources.map((source) => {
              const typeInfo = SOURCE_TYPE_ICONS[source.sourceType] || SOURCE_TYPE_ICONS.text;
              const Icon = typeInfo.icon;
              const isSelected = selectedSourceIds.has(source.id);

              return (
                <button
                  key={source.id}
                  onClick={() => toggleSourceSelection(source.id)}
                  className={cn(
                    'w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all',
                    isSelected
                      ? 'bg-orange-50 border border-orange-200'
                      : 'hover:bg-white border border-transparent hover:border-zinc-200',
                  )}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-300" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', typeInfo.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 truncate leading-tight">
                      {source.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-400 uppercase">{source.sourceType}</span>
                      {source.fileSize && (
                        <span className="text-[10px] text-zinc-400">{formatFileSize(source.fileSize)}</span>
                      )}
                    </div>
                  </div>

                  {/* Status dot */}
                  <div className="mt-1 flex-shrink-0">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        source.status === 'ready' ? 'bg-green-400' :
                        source.status === 'processing' ? 'bg-amber-400 animate-pulse' :
                        'bg-red-400',
                      )}
                    />
                  </div>
                </button>
              );
            })}

            {/* Drop zone at bottom */}
            <div
              className={cn(
                'mx-1 mt-2 border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer',
                isDragOver ? 'border-orange-400 bg-orange-50' : 'border-zinc-200 hover:border-zinc-300',
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin mx-auto" />
              ) : (
                <p className="text-[10px] text-zinc-400">
                  <span className="text-orange-500 font-medium">+ Add more sources</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
