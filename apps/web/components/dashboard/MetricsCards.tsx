'use client';

import { DollarSign, FolderOpen, Clock, TrendingUp } from 'lucide-react';
import { usePipelineStore } from '@/lib/store';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  accentColor: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, accentColor }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', accentColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className={cn('mt-3 flex items-center gap-1 text-xs font-medium', trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
          <TrendingUp className={cn('h-3 w-3', !trend.isPositive && 'rotate-180')} />
          {formatPercent(Math.abs(trend.value))} from last month
        </div>
      )}
    </div>
  );
}

export function MetricsCards() {
  const { projects } = usePipelineStore();

  const activeProjects = projects.filter((p) => !['won', 'lost'].includes(p.stage));
  const wonProjects = projects.filter((p) => p.stage === 'won');
  const totalRevenue = wonProjects.reduce((sum, p) => sum + p.value, 0);
  const pendingBids = projects.filter((p) => p.stage === 'submitted');
  const totalBids = projects.filter((p) => ['submitted', 'won', 'lost'].includes(p.stage));
  const winRate = totalBids.length > 0 ? (wonProjects.length / totalBids.length) * 100 : 0;

  const dueSoon = activeProjects.filter((p) => {
    if (!p.bidDueDate) return false;
    const diff = new Date(p.bidDueDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Won Revenue"
        value={formatCurrency(totalRevenue)}
        subtitle={`${wonProjects.length} project${wonProjects.length !== 1 ? 's' : ''} won`}
        icon={DollarSign}
        accentColor="bg-emerald-500"
        trend={{ value: 12.5, isPositive: true }}
      />
      <MetricCard
        title="Active Pipeline"
        value={String(activeProjects.length)}
        subtitle={`${formatCurrency(activeProjects.reduce((s, p) => s + p.value, 0))} total value`}
        icon={FolderOpen}
        accentColor="bg-brand-600"
        trend={{ value: 8.2, isPositive: true }}
      />
      <MetricCard
        title="Pending Bids"
        value={String(pendingBids.length)}
        subtitle={`${dueSoon.length} due this week`}
        icon={Clock}
        accentColor="bg-amber-500"
      />
      <MetricCard
        title="Win Rate"
        value={formatPercent(winRate)}
        subtitle={`${wonProjects.length} of ${totalBids.length} decided`}
        icon={TrendingUp}
        accentColor="bg-purple-500"
        trend={{ value: 4.1, isPositive: true }}
      />
    </div>
  );
}
