'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEstimateStore, UNITS } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';

export function GenRequirementsTab() {
  const {
    generalRequirementsRows,
    genRequirementsSubtotal,
    addGenRequirement,
    updateGenRequirement,
    removeGenRequirement,
  } = useEstimateStore();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Division 01 — General Requirements
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">CSI 01 00 00 — 01 99 00</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {formatCurrencyDetailed(genRequirementsSubtotal)}
            </span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_80px_80px_120px_120px_140px_40px] gap-0 bg-gray-100 border-b-2 border-gray-300 text-[9px] font-bold uppercase tracking-wider text-gray-500">
          <div className="px-4 py-2.5">Description</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">QTY</div>
          <div className="px-2 py-2.5 text-center border-l border-gray-200">Unit</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Mat $/Unit</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Lab $/Unit</div>
          <div className="px-2 py-2.5 text-right border-l border-gray-200">Total</div>
          <div className="border-l border-gray-200" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {generalRequirementsRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_80px_80px_120px_120px_140px_40px] gap-0 items-center group hover:bg-blue-50/30 transition-colors"
            >
              <div className="px-4 py-2">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateGenRequirement(row.id, { description: e.target.value })}
                  className="w-full bg-transparent text-sm text-gray-800 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                  placeholder="Item description"
                />
              </div>
              <div className="border-l border-gray-100 px-2 py-1">
                <input
                  type="number"
                  value={row.qty || ''}
                  onChange={(e) => updateGenRequirement(row.id, { qty: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm text-right tabular-nums text-gray-700 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                />
              </div>
              <div className="border-l border-gray-100 px-1 py-1">
                <select
                  value={row.unit}
                  onChange={(e) => updateGenRequirement(row.id, { unit: e.target.value })}
                  className="w-full bg-transparent text-xs text-center text-gray-500 focus:outline-none focus:bg-white rounded py-0.5"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="border-l border-gray-100 px-2 py-1">
                <input
                  type="number"
                  value={row.materialUnitCost || ''}
                  onChange={(e) => updateGenRequirement(row.id, { materialUnitCost: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm text-right tabular-nums text-blue-700 focus:outline-none focus:bg-white rounded px-1 py-0.5"
                  step="100"
                  placeholder="0.00"
                />
              </div>
              <div className="border-l border-gray-100 px-2 py-1">
                <input
                  type="number"
                  value={row.laborUnitCost || ''}
                  onChange={(e) => updateGenRequirement(row.id, { laborUnitCost: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-sm text-right tabular-nums text-amber-700 focus:outline-none focus:bg-white rounded px-1 py-0.5"
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
                  onClick={() => removeGenRequirement(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {generalRequirementsRows.length === 0 && (
            <div className="px-6 py-12 text-sm text-gray-400 text-center">
              No general requirements items. Click the button below to add.
            </div>
          )}
        </div>

        {/* Subtotal */}
        {generalRequirementsRows.length > 0 && (
          <div className="border-t-2 border-gray-300 px-6 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">
              Subtotal — General Requirements
            </span>
            <span className="text-base font-black tabular-nums text-gray-900">
              {formatCurrencyDetailed(genRequirementsSubtotal)}
            </span>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="flex justify-center">
        <button
          onClick={addGenRequirement}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add General Requirement
        </button>
      </div>
    </div>
  );
}
