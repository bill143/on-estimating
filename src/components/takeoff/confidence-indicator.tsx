// ============================================================
// TAKEOFF MODULE — CONFIDENCE INDICATOR COMPONENT
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/components/takeoff/confidence-indicator.tsx
// ============================================================

import React from 'react'
import { getConfidenceTier, formatConfidence } from '@/lib/takeoff/validation-engine'

interface ConfidenceIndicatorProps {
  confidence: number          // 0.0 – 1.0
  showLabel?: boolean         // show "High / Medium / Low" text
  showPercent?: boolean       // show "87%" text
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TIER_CONFIG = {
  high: {
    label: 'High',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    ring: 'ring-green-500/20',
  },
  medium: {
    label: 'Review',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/20',
  },
  low: {
    label: 'Low',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    ring: 'ring-red-500/20',
  },
  reject: {
    label: 'Flag',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    ring: 'ring-gray-400/20',
  },
} as const

const SIZE_CONFIG = {
  sm: {
    badge: 'px-1.5 py-0.5 text-xs gap-1',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    badge: 'px-2 py-1 text-xs gap-1.5',
    dot: 'w-2 h-2',
  },
  lg: {
    badge: 'px-2.5 py-1 text-sm gap-2',
    dot: 'w-2.5 h-2.5',
  },
} as const

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  showPercent = true,
  size = 'md',
  className = '',
}: ConfidenceIndicatorProps) {
  const tier = getConfidenceTier(confidence)
  const config = TIER_CONFIG[tier]
  const sizeConfig = SIZE_CONFIG[size]

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        sizeConfig.badge,
        className,
      ].join(' ')}
      title={`AI confidence: ${formatConfidence(confidence)}`}
    >
      <span
        className={[
          'rounded-full flex-shrink-0',
          config.dot,
          sizeConfig.dot,
        ].join(' ')}
        aria-hidden="true"
      />
      {showPercent && (
        <span className="tabular-nums">{formatConfidence(confidence)}</span>
      )}
      {showLabel && (
        <span className={showPercent ? 'opacity-70' : ''}>
          {config.label}
        </span>
      )}
    </span>
  )
}

// ─── Mini bar variant ─────────────────────────────────────────

interface ConfidenceBarProps {
  confidence: number
  height?: number
  className?: string
}

export function ConfidenceBar({
  confidence,
  height = 4,
  className = '',
}: ConfidenceBarProps) {
  const tier = getConfidenceTier(confidence)
  const barColors = {
    high:   'bg-green-500',
    medium: 'bg-amber-400',
    low:    'bg-red-500',
    reject: 'bg-gray-300',
  }

  return (
    <div
      className={`w-full bg-gray-100 rounded-full overflow-hidden ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(confidence * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Confidence: ${formatConfidence(confidence)}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColors[tier]}`}
        style={{ width: `${Math.round(confidence * 100)}%` }}
      />
    </div>
  )
}

// ─── Large card variant ───────────────────────────────────────

interface ConfidenceCardProps {
  confidence: number
  itemCount?: number
  label?: string
  className?: string
}

export function ConfidenceCard({
  confidence,
  itemCount,
  label = 'Confidence',
  className = '',
}: ConfidenceCardProps) {
  const tier = getConfidenceTier(confidence)
  const config = TIER_CONFIG[tier]

  return (
    <div
      className={[
        'rounded-lg border p-3',
        config.bg,
        config.border,
        className,
      ].join(' ')}
    >
      <div className={`text-xs font-medium mb-1 ${config.text} opacity-70`}>
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${config.text}`}>
        {formatConfidence(confidence)}
      </div>
      {itemCount !== undefined && (
        <div className={`text-xs mt-1 ${config.text} opacity-60`}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </div>
      )}
      <ConfidenceBar confidence={confidence} height={3} className="mt-2" />
    </div>
  )
}

// ─── QA status dot (for canvas overlays) ─────────────────────

interface QAStatusDotProps {
  status: 'ai_detected' | 'pending_review' | 'approved' | 'flagged' | 'overridden'
  size?: number
  className?: string
}

const STATUS_COLORS: Record<QAStatusDotProps['status'], string> = {
  ai_detected:    'bg-blue-400',
  pending_review: 'bg-amber-400',
  approved:       'bg-green-500',
  flagged:        'bg-red-500',
  overridden:     'bg-purple-500',
}

const STATUS_LABELS: Record<QAStatusDotProps['status'], string> = {
  ai_detected:    'AI Detected',
  pending_review: 'Pending Review',
  approved:       'Approved',
  flagged:        'Flagged',
  overridden:     'Overridden',
}

export function QAStatusDot({
  status,
  size = 8,
  className = '',
}: QAStatusDotProps) {
  return (
    <span
      className={[
        'rounded-full inline-block flex-shrink-0',
        STATUS_COLORS[status],
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
      title={STATUS_LABELS[status]}
      aria-label={STATUS_LABELS[status]}
    />
  )
}

export { getConfidenceTier, formatConfidence }
