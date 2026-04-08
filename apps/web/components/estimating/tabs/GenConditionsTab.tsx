'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';

export function GenConditionsTab() {
  const {
    generalConditionsRows,
    genConditionsSubtotal,
    addGenCondition,
    updateGenCondition,
    removeGenCondition,
  } = useEstimateStore();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                General Conditions
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Time-related indirect field costs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {formatCurrencyDetailed(genConditionsSubtotal)}
            </span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_100px_120px_140px_160px_40px] gap-0 bg-gray-100 border-b-2 border-gray-300 text-[9px] font-bold uppercase tracking-wider text-gray-500">
          <div className="px-4 py-2.5">Description</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Duration</div>
          <div className="px-2 py-2.5 text-center border-l border-gray-200">Unit</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Rate / Unit</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Total</div>
          <div className="border-l border-gray-200" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {generalConditionsRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_100px_120px_140px_160px_40px] gap-0 items-center group hover:bg-amber-50/30 transition-colors"
            >
              <div className="px-4 py-2">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateGenCondition(row.id, { description: e.target.value })}
                  className="w-full bg-transparent text-sm text-gray-800 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                  placeholder="Condition item"
                />
              </div>
              <div className="border-l border-gray-100 px-2 py-1">
                <input
                  type="number"
                  value={row.duration || ''}
                  onChange={(e) => updateGenCondition(row.id, { duration: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm text-right tabular-nums text-gray-700 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                  step="1"
                />
              </div>
              <div className="border-l border-gray-100 px-1 py-1">
                <select
                  value={row.durationUnit}
                  onChange={(e) => updateGenCondition(row.id, { durationUnit: e.target.value as 'weeks' | 'months' })}
                  className="w-full bg-transparent text-xs text-center text-gray-500 focus:outline-none focus:bg-white rounded py-0.5"
                >
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div className="border-l border-gray-100 px-2 py-1">
                <input
                  type="number"
                  value={row.unitRate || ''}
                  onChange={(e) => updateGenCondition(row.id, { unitRate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm text-right tabular-nums text-gray-700 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                  step="100"
                  placeholder="0.00"
                />
              </div>
              <div className="border-l border-gray-100 px-3 py-2 text-right">
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatCurrencyDetailed(row.totalCost)}
                </span>
              </div>
              <div className="border-l border-gray-100 flex items-center justify-center">
                <button
                  onClick={() => removeGenCondition(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {generalConditionsRows.length === 0 && (
            <div className="px-6 py-12 text-sm text-gray-400 text-center">
              No general conditions items. Click the button below to add.
            </div>
          )}
        </div>

        {/* Subtotal */}
        {generalConditionsRows.length > 0 && (
          <div className="border-t-2 border-gray-300 px-6 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">
              Subtotal — General Conditions
            </span>
            <span className="text-base font-black tabular-nums text-gray-900">
              {formatCurrencyDetailed(genConditionsSubtotal)}
            </span>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="flex justify-center">
        <button
          onClick={addGenCondition}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add General Condition
        </button>
      </div>
    </div>
  );
}
