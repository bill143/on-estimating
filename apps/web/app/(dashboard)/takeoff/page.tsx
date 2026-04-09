'use client';
 
import dynamic from 'next/dynamic';
import { ScanLine } from 'lucide-react';
 
const InteractivePlanViewer = dynamic(
  () => import('@/components/takeoff/interactive-plan-viewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <ScanLine className="h-6 w-6 animate-pulse text-amber-400" />
          </div>
          <p className="text-sm font-medium text-gray-400">Loading plan viewer...</p>
          <p className="mt-1 text-xs text-gray-600">Initialising canvas engine</p>
        </div>
      </div>
    ),
  }
);
 
export default function TakeoffPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/5 bg-[#0F1B2D] px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <ScanLine className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">Plan Takeoff</h1>
          <p className="text-xs text-gray-500">
            AI-powered quantity extraction · Annotate plans · Push to estimate
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <InteractivePlanViewer planUrl="" />
      </div>
    </div>
  );
}