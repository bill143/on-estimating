'use client';

import { useState } from 'react';
import { ScanLine, Upload, Loader2, CheckCircle2, ZoomIn, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetectionResult {
  symbol: string;
  count: number;
  confidence: number;
  color: string;
}

export default function AutoCountPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DetectionResult[] | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Simulate YOLOv8 ONNX inference
    setIsProcessing(true);
    setResults(null);
    setTimeout(() => {
      setResults(DEMO_DETECTIONS);
      setIsProcessing(false);
    }, 3000);
  }

  function handleReset() {
    setImagePreview(null);
    setResults(null);
  }

  const totalCount = results?.reduce((sum, r) => sum + r.count, 0) || 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
              <ScanLine className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Neural Network Auto-Count</h1>
              <p className="text-xs text-gray-500">
                YOLOv8 ONNX model — automatic symbol detection and counting from blueprint images
              </p>
            </div>
          </div>
          {imagePreview && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!imagePreview ? (
          /* Upload Zone */
          <label className="flex h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">Upload a blueprint image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, or PDF — Max 50MB</p>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
          </label>
        ) : (
          <div className="flex gap-6">
            {/* Image Preview */}
            <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Blueprint Preview</span>
                <button className="text-gray-400 hover:text-gray-600">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px]">
                <img
                  src={imagePreview}
                  alt="Blueprint"
                  className="max-h-[500px] object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center text-white">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto" />
                      <p className="mt-3 text-sm font-medium">Running YOLOv8 inference...</p>
                      <p className="text-xs text-gray-300 mt-1">Detecting symbols and counting elements</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="w-80 flex-shrink-0 space-y-4">
              {isProcessing ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              ) : results ? (
                <>
                  {/* Summary Card */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-gray-700">Detection Complete</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
                    <p className="text-xs text-gray-400">total symbols detected</p>
                  </div>

                  {/* Detection Breakdown */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Symbol Breakdown</h3>
                    <div className="space-y-3">
                      {results.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                            <span className="text-xs text-gray-700">{r.symbol}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-900">{r.count}</span>
                            <span className={cn(
                              'text-[10px] font-medium',
                              r.confidence >= 90 ? 'text-emerald-600' :
                              r.confidence >= 75 ? 'text-amber-600' : 'text-red-600'
                            )}>
                              {r.confidence}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <button className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 shadow-sm">
                    Add to Estimate
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* How It Works */}
        {!imagePreview && (
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Upload Blueprint', desc: 'Upload a blueprint image or PDF page with symbols to count' },
              { step: '2', title: 'AI Detection', desc: 'YOLOv8 ONNX model detects and classifies construction symbols' },
              { step: '3', title: 'Review & Apply', desc: 'Verify counts and add directly to your estimate line items' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm">
                  {s.step}
                </div>
                <h4 className="mt-2 text-sm font-semibold text-gray-800">{s.title}</h4>
                <p className="mt-1 text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const DEMO_DETECTIONS: DetectionResult[] = [
  { symbol: 'Electrical Outlet (Duplex)', count: 47, confidence: 94.2, color: '#3b82f6' },
  { symbol: 'Light Fixture (Recessed)', count: 38, confidence: 91.8, color: '#f59e0b' },
  { symbol: 'Fire Sprinkler Head', count: 52, confidence: 88.5, color: '#ef4444' },
  { symbol: 'HVAC Diffuser', count: 24, confidence: 85.3, color: '#10b981' },
  { symbol: 'Smoke Detector', count: 19, confidence: 92.1, color: '#8b5cf6' },
  { symbol: 'Exit Sign', count: 8, confidence: 96.7, color: '#ec4899' },
  { symbol: 'GFI Outlet', count: 12, confidence: 87.4, color: '#06b6d4' },
];
