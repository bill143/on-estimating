// NEXUS ON Estimating — Status Badge Component
'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'draft' | 'in_review' | 'submitted' | 'approved' | 'rejected' | 'warning' | 'info' | 'success' | 'error';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const VARIANT_DOTS: Record<BadgeVariant, string> = {
  draft: 'bg-gray-400',
  in_review: 'bg-amber-400',
  submitted: 'bg-blue-400',
  approved: 'bg-emerald-400',
  rejected: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
  success: 'bg-emerald-400',
  error: 'bg-red-400',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ variant, label, showDot = true, size = 'sm', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', VARIANT_DOTS[variant])} />
      )}
      {label}
    </span>
  );
}
