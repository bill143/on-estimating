'use client';

import { useEffect } from 'react';
import { FileSpreadsheet, Download, Printer } from 'lucide-react';
import { useEstimateStore } from '@/lib/estimate-store';
import { EstimateHeader } from '@/components/estimating/EstimateHeader';
import { EstimateGrid } from '@/components/estimating/EstimateGrid';
import { EstimateSummary } from '@/components/estimating/EstimateSummary';

export default function EstimatingPage() {
  const { header, rows, loadDemoEstimate } = useEstimateStore();

  useEffect(() => {
    if (rows.length === 0) {
      loadDemoEstimate();
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Estimating</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                14-Column Cost Estimate — CSI MasterFormat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 shadow-sm">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Block */}
        <EstimateHeader />

        {/* Grid + Summary Side-by-Side */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <EstimateGrid />
          </div>
          <EstimateSummary />
        </div>
      </div>
    </div>
  );
}
