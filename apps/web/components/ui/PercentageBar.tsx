// NEXUS ON Estimating — Percentage Bar Component
// Horizontal bar chart for cost breakdowns, utilization, and progress
'use client';

import { cn } from '@/lib/utils';

interface PercentageBarSegment {
  value: number;
  color: string;
  label: string;
}

interface PercentageBarProps {
  segments: PercentageBarSegment[];
  total?: number;
  height?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function PercentageBar({
  segments,
  total,
  height = 'md',
  showLabels = true,
  className,
}: PercentageBarProps) {
  const computedTotal = total || segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800',
          height === 'sm' && 'h-2',
          height === 'md' && 'h-3',
          height === 'lg' && 'h-4'
        )}
      >
        {segments.map((segment, i) => {
          const pct = computedTotal > 0 ? (segment.value / computedTotal) * 100 : 0;
          return (
            <div
              key={i}
              className={cn('transition-all', segment.color)}
              style={{ width: `${pct}%` }}
              title={`${segment.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {showLabels && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((segment, i) => {
            const pct = computedTotal > 0 ? (segment.value / computedTotal) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-sm', segment.color)} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {segment.label} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
