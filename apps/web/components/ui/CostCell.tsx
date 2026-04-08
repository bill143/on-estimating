// NEXUS ON Estimating — Cost Cell Component
// Displays formatted currency values with optional delta indicators
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatCurrencyDetailed } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CostCellProps {
  value: number;
  previousValue?: number;
  detailed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDelta?: boolean;
  className?: string;
}

export function CostCell({
  value,
  previousValue,
  detailed = false,
  size = 'md',
  showDelta = false,
  className,
}: CostCellProps) {
  const formatted = detailed ? formatCurrencyDetailed(value) : formatCurrency(value);
  const delta = previousValue !== undefined ? value - previousValue : 0;
  const deltaPercent = previousValue && previousValue !== 0
    ? ((delta / previousValue) * 100).toFixed(1)
    : null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span
        className={cn(
          'tabular-nums font-medium',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          value < 0 && 'text-red-600 dark:text-red-400',
          value === 0 && 'text-gray-400 dark:text-gray-500',
          value > 0 && 'text-gray-900 dark:text-gray-100'
        )}
      >
        {formatted}
      </span>

      {showDelta && delta !== 0 && (
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs',
            delta > 0 ? 'text-red-500' : 'text-emerald-500'
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : delta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {deltaPercent && <span>{deltaPercent}%</span>}
        </span>
      )}
    </div>
  );
}
