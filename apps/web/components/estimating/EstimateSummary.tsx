'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function EstimateSummary() {
  const {
    sectionRollups,
    directCostSubtotal,
    overheadPercent,
    profitPercent,
    overheadAmount,
    profitAmount,
    totalBaseBid,
    alternates,
    setOverhead,
    setProfit,
    addAlternate,
    updateAlternate,
    removeAlternate,
  } = useEstimateStore();

  return (
    <div className="w-96 flex-shrink-0 space-y-4">
      {/* CSI Section Rollups */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">CSI Division Rollup</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {sectionRollups.map((s) => (
            <div key={s.divisionId} className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-brand-600">{s.csiCode}</span>
                <span className="text-xs font-bold tabular-nums text-gray-900">{formatCurrencyDetailed(s.totalCost)}</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{s.description}</p>
              <div className="flex gap-4 mt-1">
                <span className="text-[10px] text-blue-600">
                  Mat: {formatCurrencyDetailed(s.materialTotal)}
                </span>
                <span className="text-[10px] text-amber-600">
                  Lab: {formatCurrencyDetailed(s.laborTotal)}
                </span>
              </div>
            </div>
          ))}
          {sectionRollups.length === 0 && (
            <div className="px-4 py-6 text-xs text-gray-400 text-center">No divisions yet</div>
          )}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Cost Summary</h3>

        <div className="space-y-3 text-xs">
          {/* Direct Cost Subtotal */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">Direct Cost Subtotal</span>
            <span className="font-bold tabular-nums text-gray-900">{formatCurrencyDetailed(directCostSubtotal)}</span>
          </div>

          <div className="border-t border-gray-100 pt-2" />

          {/* Overhead */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Overhead</span>
              <input
                type="number"
                value={overheadPercent}
                onChange={(e) => setOverhead(parseFloat(e.target.value) || 0)}
                className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-right font-mono focus:border-brand-400 focus:outline-none"
                step="0.5"
              />
              <span className="text-gray-400">%</span>
            </div>
            <span className="tabular-nums text-gray-700">{formatCurrencyDetailed(overheadAmount)}</span>
          </div>

          {/* Profit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Profit</span>
              <input
                type="number"
                value={profitPercent}
                onChange={(e) => setProfit(parseFloat(e.target.value) || 0)}
                className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-right font-mono focus:border-brand-400 focus:outline-none"
                step="0.5"
              />
              <span className="text-gray-400">%</span>
            </div>
            <span className="tabular-nums text-gray-700">{formatCurrencyDetailed(profitAmount)}</span>
          </div>

          {/* Total Base Bid */}
          <div className="border-t-2 border-gray-800 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Total Base Bid</span>
              <span className="text-lg font-black tabular-nums text-gray-900">{formatCurrencyDetailed(totalBaseBid)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alternates */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Alternates</h3>
          <button
            onClick={addAlternate}
            className="text-brand-600 hover:text-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {alternates.map((alt) => (
            <div key={alt.id} className="px-4 py-2.5 group">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={alt.name}
                  onChange={(e) => updateAlternate(alt.id, { name: e.target.value })}
                  className="w-16 bg-transparent text-[10px] font-bold font-mono text-purple-700 focus:outline-none focus:bg-gray-50 rounded px-1"
                  placeholder="ALT-#"
                />
                <input
                  type="text"
                  value={alt.description}
                  onChange={(e) => updateAlternate(alt.id, { description: e.target.value })}
                  className="flex-1 bg-transparent text-xs text-gray-700 focus:outline-none focus:bg-gray-50 rounded px-1"
                  placeholder="Description"
                />
                <button
                  onClick={() => removeAlternate(alt.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center justify-end">
                <span className="text-[10px] text-gray-400 mr-1">$</span>
                <input
                  type="number"
                  value={alt.amount || ''}
                  onChange={(e) => updateAlternate(alt.id, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-transparent text-xs text-right tabular-nums font-semibold text-gray-900 focus:outline-none focus:bg-gray-50 rounded px-1"
                  placeholder="0.00"
                  step="100"
                />
              </div>
            </div>
          ))}
          {alternates.length === 0 && (
            <div className="px-4 py-4 text-xs text-gray-400 text-center">No alternates</div>
          )}
        </div>
      </div>

      {/* Grand Total with Alternates */}
      {alternates.length > 0 && (
        <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 mb-2">With All Alternates</p>
          <p className="text-xl font-black tabular-nums text-brand-900">
            {formatCurrencyDetailed(totalBaseBid + alternates.reduce((s, a) => s + a.amount, 0))}
          </p>
        </div>
      )}
    </div>
  );
}
