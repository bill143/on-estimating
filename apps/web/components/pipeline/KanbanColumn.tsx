'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BidStage } from '@on/db';
import type { PipelineProject } from '@/lib/store';
import { ProjectCard } from './ProjectCard';
import { SortableProjectCard } from './SortableProjectCard';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: BidStage;
  config: { label: string; color: string; bgColor: string };
  projects: PipelineProject[];
}

export function KanbanColumn({ stage, config, projects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const totalValue = projects.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 min-w-[288px] flex-col rounded-xl border bg-gray-50/80 transition-colors',
        isOver && 'bg-brand-50 border-brand-300'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-6 min-w-[24px] items-center justify-center rounded-full text-xs font-bold', config.bgColor, config.color)}>
            {projects.length}
          </div>
          <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
        </div>
        <span className="text-xs text-gray-400 font-medium">{formatCurrency(totalValue)}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2 overflow-y-auto scrollbar-thin min-h-[120px]">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <SortableProjectCard key={project.id} project={project} />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Drop bids here
          </div>
        )}
      </div>
    </div>
  );
}
