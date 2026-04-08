import { useState, useCallback, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function SourceUploader() {
  const uploadFile = useVaultStore((s) => s.uploadFile);
  const uploading = useVaultStore((s) => s.uploadingFile);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 transition-all text-center',
        isDragOver
          ? 'border-orange-400 bg-orange-50'
          : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm text-zinc-600">Processing document...</p>
          <p className="text-xs text-zinc-400">OCR & classification in progress</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Upload className="w-7 h-7 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Drag & drop files here
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              PDFs, blueprints, specs, photos, RFIs, Word docs
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
          >
            Browse Files
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
      )}
    </div>
  );
}
