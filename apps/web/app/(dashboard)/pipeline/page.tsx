'use client';

import { useEffect, useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { usePipelineStore, DEMO_PROJECTS } from '@/lib/store';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { NewProjectDialog } from '@/components/pipeline/NewProjectDialog';
import { formatCurrency } from '@/lib/utils';

export default function PipelinePage() {
  const { projects, setProjects } = usePipelineStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load demo data on first visit
  useEffect(() => {
    if (projects.length === 0) {
      setProjects(DEMO_PROJECTS);
    }
  }, []);

  const totalPipelineValue = projects
    .filter((p) => !['won', 'lost'].includes(p.stage))
    .reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header Bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bid Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projects.length} total opportunities — {formatCurrency(totalPipelineValue)} active pipeline value
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bids..."
                className="w-56 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Filter */}
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filter
            </button>

            {/* New Project */}
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Bid
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <KanbanBoard />
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog open={showNewProject} onClose={() => setShowNewProject(false)} />
    </div>
  );
}
