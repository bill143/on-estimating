// NEXUS ON Estimating — AI Confidence Indicator
// Visual indicator for AI-generated data confidence levels
'use client';

import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  value: number; // 0.0 - 1.0
  label?: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  value,
  label,
  size = 'sm',
  showValue = true,
  className,
}: ConfidenceIndicatorProps) {
  const percent = Math.round(value * 100);

  const color =
    percent >= 90
      ? 'bg-emerald-500'
      : percent >= 75
        ? 'bg-blue-500'
        : percent >= 50
          ? 'bg-amber-500'
          : 'bg-red-500';

  const textColor =
    percent >= 90
      ? 'text-emerald-600 dark:text-emerald-400'
      : percent >= 75
        ? 'text-blue-600 dark:text-blue-400'
        : percent >= 50
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          size === 'sm' ? 'h-1.5 w-16' : 'h-2 w-24'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue && (
        <span className={cn('tabular-nums font-medium', textColor, size === 'sm' ? 'text-xs' : 'text-sm')}>
          {percent}%
        </span>
      )}
    </div>
  );
}
