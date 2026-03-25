'use client';

import { useEffect } from 'react';
import { usePipelineStore, DEMO_PROJECTS } from '@/lib/store';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';

export default function DashboardPage() {
  const { projects, setProjects } = usePipelineStore();

  // Load demo data on first visit
  useEffect(() => {
    if (projects.length === 0) {
      setProjects(DEMO_PROJECTS);
    }
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your preconstruction pipeline and performance metrics.
        </p>
      </div>

      {/* Metrics */}
      <MetricsCards />

      {/* Charts */}
      <AnalyticsCharts />

      {/* Mini Pipeline Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Pipeline Overview</h2>
          <a href="/pipeline" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View Full Pipeline →
          </a>
        </div>
        <KanbanBoard />
      </div>
    </div>
  );
}
