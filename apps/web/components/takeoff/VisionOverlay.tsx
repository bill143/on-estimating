'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
  Eye,
  Shapes,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createVisionClient,
  type VisionConfig,
  type DetectedSymbol,
  type VisionResult,
} from '@on/vision-client';

// ============================================================================
// TYPES
// ============================================================================

interface VisionOverlayProps {
  /** Plan sheet ID for job tracking. */
  planSheetId: string;
  /** URL or path of the plan sheet image/PDF. */
  fileUrl: string;
  /** Called when deep-pass symbols are detected. */
  onItemsDetected: (symbols: DetectedSymbol[]) => void;
  /** Vision Engine API base URL. */
  apiUrl?: string;
  /** JWT token for authentication. */
  token?: string;
  /** Additional CSS classes. */
  className?: string;
}

type AnalysisStage =
  | 'idle'
  | 'reading'
  | 'detecting'
  | 'mapping'
  | 'complete'
  | 'error';

interface StageInfo {
  label: string;
  icon: React.ElementType;
  index: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGES: Record<AnalysisStage, StageInfo> = {
  idle:      { label: 'Ready to analyze',        icon: ScanSearch,    index: -1 },
  reading:   { label: 'Reading plan...',          icon: Eye,           index: 0 },
  detecting: { label: 'Detecting symbols...',     icon: Shapes,        index: 1 },
  mapping:   { label: 'Mapping to CSI codes...',  icon: MapPin,        index: 2 },
  complete:  { label: 'Complete',                 icon: CheckCircle2,  index: 3 },
  error:     { label: 'Analysis failed',          icon: XCircle,       index: -1 },
};

const STAGE_ORDER: AnalysisStage[] = ['reading', 'detecting', 'mapping', 'complete'];

// ============================================================================
// HELPERS
// ============================================================================

function confidenceColor(value: number): {
  bg: string;
  text: string;
  dot: string;
  label: string;
} {
  if (value >= 0.85) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'High',
    };
  }
  if (value >= 0.75) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
      label: 'Medium',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    label: 'Low',
  };
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ConfidenceBadge({ value }: { value: number }) {
  const color = confidenceColor(value);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        color.bg,
        color.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', color.dot)} />
      {formatConfidence(value)}
    </span>
  );
}

function StageIndicator({
  currentStage,
}: {
  currentStage: AnalysisStage;
}) {
  const currentIndex = STAGES[currentStage].index;

  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map((stage, i) => {
        const info = STAGES[stage];
        const Icon = info.icon;
        const isActive = stage === currentStage;
        const isDone = currentIndex > i;
        const isPending = currentIndex < i;

        return (
          <div key={stage} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-4',
                  isDone ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600',
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                isActive && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                isDone && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                isPending && 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
              )}
            >
              {isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isDone ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{info.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SymbolList({ symbols }: { symbols: DetectedSymbol[] }) {
  if (symbols.length === 0) return null;

  // Group by type
  const grouped: Record<string, { count: number; avgConf: number; items: DetectedSymbol[] }> = {};
  for (const sym of symbols) {
    const key = sym.type ?? sym.label ?? 'unknown';
    if (!grouped[key]) {
      grouped[key] = { count: 0, avgConf: 0, items: [] };
    }
    grouped[key].count += sym.count ?? 1;
    grouped[key].items.push(sym);
    grouped[key].avgConf =
      grouped[key].items.reduce((a, s) => a + s.confidence, 0) / grouped[key].items.length;
  }

  const entries = Object.entries(grouped).sort(
    ([, a], [, b]) => b.count - a.count,
  );

  return (
    <div className="mt-3 max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
      {entries.map(([type, data]) => (
        <div
          key={type}
          className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-800/50"
        >
          <div className="flex items-center gap-2">
            <Shapes className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {type.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-400">×{data.count}</span>
          </div>
          <ConfidenceBadge value={data.avgConf} />
        </div>
      ))}
    </div>
  );
}

function TextPreview({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        Extracted Text Preview
      </p>
      <p className="line-clamp-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        {text}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function VisionOverlay({
  planSheetId,
  fileUrl,
  onItemsDetected,
  apiUrl,
  token,
  className,
}: VisionOverlayProps) {
  const [stage, setStage] = useState<AnalysisStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fastText, setFastText] = useState<string>('');
  const [symbols, setSymbols] = useState<DetectedSymbol[]>([]);
  const [fastMs, setFastMs] = useState<number>(0);
  const [deepMs, setDeepMs] = useState<number>(0);
  const abortRef = useRef(false);

  const getClient = useCallback(() => {
    const config: VisionConfig = {
      baseUrl: apiUrl ?? process.env.NEXT_PUBLIC_VISION_API_URL ?? 'http://localhost:8002',
      token: token ?? process.env.NEXT_PUBLIC_VISION_API_TOKEN ?? '',
    };
    return createVisionClient(config);
  }, [apiUrl, token]);

  const handleAnalyze = useCallback(async () => {
    setStage('reading');
    setError(null);
    setFastText('');
    setSymbols([]);
    setFastMs(0);
    setDeepMs(0);
    abortRef.current = false;

    const vision = getClient();

    // --- Fast pass and full analysis in parallel ---
    const analyzePromise = (async (): Promise<DetectedSymbol[]> => {
      try {
        // Full analysis: fast + deep + symbols + CSI mapping
        const result: VisionResult = await vision.analyzePlan(fileUrl, {
          sheetId: planSheetId,
        });
        if (abortRef.current) return [];

        setStage('detecting');
        await new Promise((r) => setTimeout(r, 500));
        if (abortRef.current) return [];

        setStage('mapping');
        await new Promise((r) => setTimeout(r, 400));
        if (abortRef.current) return [];

        setDeepMs(result.totalLatencyMs ?? 0);
        return result.symbols ?? [];
      } catch (err) {
        console.error('[VisionOverlay] analyze error:', err);
        return [];
      }
    })();

    // --- Fast pass (lightweight, ~200-500ms) for immediate preview ---
    try {
      const fast = await vision.fastPass(fileUrl);
      if (abortRef.current) return;

      setFastText((fast.text ?? '').slice(0, 500));
      setFastMs(fast.latencyMs ?? 0);
    } catch (err) {
      // Fast pass failure is non-fatal — full analysis continues
      console.error('[VisionOverlay] fast pass error:', err);
    }

    // --- Wait for full analysis to finish ---
    try {
      const detected = await analyzePromise;
      if (abortRef.current) return;

      setSymbols(detected);
      setStage('complete');

      if (detected.length > 0) {
        onItemsDetected(detected);
      }
    } catch (err) {
      if (abortRef.current) return;
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      setStage('error');
    }
  }, [fileUrl, getClient, onItemsDetected]);

  const isRunning = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Vision Analysis
          </h3>
          {planSheetId && (
            <span className="text-xs text-gray-400">
              Sheet {planSheetId}
            </span>
          )}
        </div>

        {/* Timing badges */}
        {(fastMs > 0 || deepMs > 0) && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {fastMs > 0 && <span>Fast: {Math.round(fastMs)}ms</span>}
            {deepMs > 0 && <span>Deep: {(deepMs / 1000).toFixed(1)}s</span>}
          </div>
        )}
      </div>

      {/* Progress stages */}
      {isRunning && (
        <div className="mt-3">
          <StageIndicator currentStage={stage} />
        </div>
      )}

      {/* Error message */}
      {stage === 'error' && error && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Analysis Failed
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Fast-pass text preview */}
      {fastText && <TextPreview text={fastText} />}

      {/* Detected symbols list */}
      {stage === 'complete' && <SymbolList symbols={symbols} />}

      {/* Complete summary */}
      {stage === 'complete' && symbols.length === 0 && !fastText && (
        <p className="mt-3 text-xs text-gray-400">
          Analysis complete — no construction symbols detected in this sheet.
        </p>
      )}

      {/* Action button */}
      <div className="mt-4">
        {stage === 'idle' && (
          <button
            type="button"
            onClick={handleAnalyze}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
              'text-sm font-semibold text-white shadow-sm',
              'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
              'transition-colors',
            )}
          >
            <ScanSearch className="h-4 w-4" />
            Analyze Plan
          </button>
        )}

        {stage === 'complete' && (
          <button
            type="button"
            onClick={handleAnalyze}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2',
              'text-sm font-medium',
              'border border-gray-300 bg-white text-gray-700 shadow-sm',
              'hover:bg-gray-50 active:bg-gray-100',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              'transition-colors',
            )}
          >
            <ScanSearch className="h-4 w-4" />
            Re-analyze
          </button>
        )}

        {stage === 'error' && (
          <button
            type="button"
            onClick={handleAnalyze}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2',
              'text-sm font-medium',
              'border border-red-300 bg-white text-red-700 shadow-sm',
              'hover:bg-red-50 active:bg-red-100',
              'dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20',
              'transition-colors',
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Retry Analysis
          </button>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {STAGES[stage].label}
          </div>
        )}
      </div>
    </div>
  );
}

export default VisionOverlay;
