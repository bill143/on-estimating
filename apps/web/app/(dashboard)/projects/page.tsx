'use client';

import { useEffect } from 'react';
import { FolderOpen, Calendar, DollarSign } from 'lucide-react';
import { usePipelineStore, DEMO_PROJECTS } from '@/lib/store';
import { STAGE_CONFIG } from '@on/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { projects, setProjects } = usePipelineStore();

  useEffect(() => {
    if (projects.length === 0) {
      setProjects(DEMO_PROJECTS);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">All projects across your pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const stageConfig = STAGE_CONFIG[project.stage];
          return (
            <div key={project.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <FolderOpen className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-xs text-gray-500">{project.client}</p>
                  </div>
                </div>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold border', stageConfig.bgColor, stageConfig.color)}>
                  {stageConfig.label}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(project.value)}
                </div>
                {project.bidDueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.bidDueDate)}
                  </div>
                )}
              </div>

              {project.tradeScope && (
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {project.tradeScope}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
