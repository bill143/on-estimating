import { useState } from 'react';
import { Plus, Search, Pin, MoreHorizontal, Trash2, Zap } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { formatRelativeTime } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function VaultStudio() {
  const notebooks = useVaultStore((s) => s.notebooks);
  const selectNotebook = useVaultStore((s) => s.selectNotebook);
  const createNotebook = useVaultStore((s) => s.createNotebook);
  const deleteNotebook = useVaultStore((s) => s.deleteNotebook);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = notebooks.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createNotebook({ name: newName.trim(), description: newDesc.trim() });
    toast.success('Studio project created');
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await deleteNotebook(id);
    toast.success('Studio project deleted');
    setMenuOpenId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-8 py-6 space-y-6">
      <PageHeader
        title="The Vault"
        subtitle="Echo AI Studio — Document Intelligence"
      >
        <Button
          className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          New Studio
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search studios..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        />
      </div>

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pinned</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pinned.map((nb) => (
              <StudioCard
                key={nb.id}
                notebook={nb}
                onSelect={() => selectNotebook(nb.id)}
                menuOpen={menuOpenId === nb.id}
                onMenuToggle={() => setMenuOpenId(menuOpenId === nb.id ? null : nb.id)}
                onDelete={() => handleDelete(nb.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All studios */}
      <div>
        {pinned.length > 0 && (
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">All Studios</h3>
        )}
        {unpinned.length === 0 && pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
              <Zap className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Create your first Studio</h3>
            <p className="text-sm text-zinc-500 max-w-md mb-6">
              Studios are project-specific document workspaces. Upload specs, drawings,
              RFIs, and photos — then chat with Echo to extract insights.
            </p>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4" />
              New Studio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unpinned.map((nb) => (
              <StudioCard
                key={nb.id}
                notebook={nb}
                onSelect={() => selectNotebook(nb.id)}
                menuOpen={menuOpenId === nb.id}
                onMenuToggle={() => setMenuOpenId(menuOpenId === nb.id ? null : nb.id)}
                onDelete={() => handleDelete(nb.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">New Studio Project</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. VA Tampa — Phase 2 Specs"
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of this document collection..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-zinc-200">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Create Studio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudioCard({
  notebook,
  onSelect,
  menuOpen,
  onMenuToggle,
  onDelete,
}: {
  notebook: ReturnType<typeof useVaultStore.getState>['notebooks'][number];
  onSelect: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="relative group bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Icon + header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: notebook.color + '20' }}
        >
          {notebook.icon}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all"
          >
            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Name + description */}
      <h3 className="text-sm font-semibold text-zinc-900 mb-1 truncate">{notebook.name}</h3>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{notebook.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {notebook.sourceCount} {notebook.sourceCount === 1 ? 'source' : 'sources'}
        </span>
        <span className="text-xs text-zinc-400">
          {formatRelativeTime(notebook.updatedAt)}
        </span>
      </div>

      {/* Tags */}
      {notebook.tags.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {notebook.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
