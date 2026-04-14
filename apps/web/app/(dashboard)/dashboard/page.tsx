'use client';

import { useEffect } from 'react';
import { usePipelineStore, DEMO_PROJECTS } from '@/lib/store';
import { fetchProjects, subscribeToProjects } from '@/lib/db-actions';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';

export default function DashboardPage() {
  const { projects, setProjects } = usePipelineStore();

  // Load projects from DB, fall back to demo data if empty
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadProjects() {
      try {
        const dbProjects = await fetchProjects();
        if (dbProjects.length > 0) {
          setProjects(dbProjects);
        } else if (projects.length === 0) {
          setProjects(DEMO_PROJECTS);
        }
      } catch {
        if (projects.length === 0) {
          setProjects(DEMO_PROJECTS);
        }
      }

      unsubscribe = subscribeToProjects((updated) => {
        if (updated.length > 0) {
          setProjects(updated);
        }
      });
    }

    loadProjects();
    return () => { unsubscribe?.(); };
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
