import { useState } from 'react';
import {
  Plus,
  StickyNote,
  Pin,
  Trash2,
  Edit3,
  Save,
  X,
  FileText,
} from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

export function NotesPanel() {
  const notes = useVaultStore((s) => s.notes);
  const activeNote = useVaultStore((s) => s.activeNote);
  const createNote = useVaultStore((s) => s.createNote);
  const updateNote = useVaultStore((s) => s.updateNote);
  const deleteNote = useVaultStore((s) => s.deleteNote);
  const setActiveNote = useVaultStore((s) => s.setActiveNote);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  const handleCreate = () => {
    createNote({ title: 'New Note', content: '' });
    const newNote = useVaultStore.getState().notes[useVaultStore.getState().notes.length - 1];
    if (newNote) {
      setEditingId(newNote.id);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
    }
  };

  const startEdit = (note: typeof notes[0]) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateNote(editingId, { title: editTitle, content: editContent });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const renderNoteCard = (note: typeof notes[0]) => {
    const isEditing = editingId === note.id;
    const isActive = activeNote?.id === note.id;

    if (isEditing) {
      return (
        <div
          key={note.id}
          className="bg-white border-2 border-orange-300 rounded-xl p-4 shadow-sm"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-3 focus:outline-none focus:border-orange-400"
            placeholder="Note title..."
            autoFocus
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
            className="w-full text-sm text-zinc-700 resize-none focus:outline-none placeholder:text-zinc-400"
            placeholder="Write your note..."
          />
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-zinc-100">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={note.id}
        onClick={() => setActiveNote(isActive ? null : note)}
        className={cn(
          'group bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm',
          isActive ? 'border-orange-300 shadow-sm' : 'border-zinc-200 hover:border-zinc-300',
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin className="w-3 h-3 text-orange-500" />}
            <h4 className="text-sm font-semibold text-zinc-900">{note.title}</h4>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateNote(note.id, { pinned: !note.pinned });
              }}
              className="p-1 rounded hover:bg-zinc-100 transition-colors"
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              <Pin className={cn('w-3 h-3', note.pinned ? 'text-orange-500' : 'text-zinc-400')} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(note); }}
              className="p-1 rounded hover:bg-zinc-100 transition-colors"
            >
              <Edit3 className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
              className="p-1 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3 text-zinc-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed mb-3">
          {note.content}
        </p>

        {/* Citations */}
        {note.citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.citations.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] text-zinc-500"
              >
                <FileText className="w-2.5 h-2.5" />
                {c.sourceTitle.length > 30 ? c.sourceTitle.slice(0, 30) + '...' : c.sourceTitle}
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-zinc-400">
          {formatRelativeTime(note.updatedAt)}
        </p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-700">Notes</h3>
          <span className="text-xs text-zinc-400">({notes.length})</span>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <StickyNote className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-2">No notes yet</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-4">
              Save insights and observations as you review your documents.
              Notes can reference specific sources for traceability.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first note
            </button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </p>
                <div className="space-y-2">
                  {pinned.map(renderNoteCard)}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-4">All Notes</p>
                )}
                <div className="space-y-2">
                  {unpinned.map(renderNoteCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
