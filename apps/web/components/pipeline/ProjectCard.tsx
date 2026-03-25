'use client';

import { Calendar, DollarSign, User, AlertTriangle } from 'lucide-react';
import type { PipelineProject } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: PipelineProject;
  isDragging?: boolean;
}

export function ProjectCard({ project, isDragging }: ProjectCardProps) {
  const isDueSoon = project.bidDueDate && isWithinDays(project.bidDueDate, 7);
  const isOverdue = project.bidDueDate && new Date(project.bidDueDate) < new Date();

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md',
        isDragging && 'shadow-lg ring-2 ring-brand-400',
        isOverdue && 'border-red-300 bg-red-50/50'
      )}
    >
      {/* Project Name */}
      <h4 className="text-sm font-semibold text-gray-900 leading-tight">
        {project.name}
      </h4>

      {/* Client */}
      <div className="flex items-center gap-1 mt-1.5">
        <User className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-500 truncate">{project.client}</span>
      </div>

      {/* Value + Due Date */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-emerald-500" />
          <span className="text-xs font-semibold text-gray-700">
            {formatCurrency(project.value)}
          </span>
        </div>

        {project.bidDueDate && (
          <div className={cn(
            'flex items-center gap-1',
            isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-400'
          )}>
            {(isOverdue || isDueSoon) && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            <span className="text-xs font-medium">
              {formatDate(project.bidDueDate)}
            </span>
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      {project.confidence != null && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Confidence</span>
            <span className="text-[10px] font-semibold text-gray-500">{project.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                project.confidence >= 70 ? 'bg-emerald-500' :
                project.confidence >= 40 ? 'bg-amber-500' : 'bg-red-400'
              )}
              style={{ width: `${project.confidence}%` }}
            />
          </div>
        </div>
      )}

      {/* Trade Scope Tag */}
      {project.tradeScope && (
        <div className="mt-2">
          <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
            {project.tradeScope}
          </span>
        </div>
      )}
    </div>
  );
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff > 0 && diff < days * 24 * 60 * 60 * 1000;
}
