'use client';

import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';

export function OHPTab() {
  const {
    estimateDirectCost,
    genRequirementsSubtotal,
    genConditionsSubtotal,
    directCostSubtotal,
    totalMaterial,
    totalLabor,
    totalEquipment,
    laborBurdenPercent,
    laborBurdenAmount,
    adjustedDirectCost,
    overheadPercent,
    profitPercent,
    bondPercent,
    insurancePercent,
    contingencyPercent,
    contingencyAmount,
    taxPercent,
    taxAmount,
    overheadAmount,
    profitAmount,
    subtotalBeforeBondIns,
    bondAmount,
    insuranceAmount,
    totalBaseBid,
    sectionRollups,
    setLaborBurden,
    setOverhead,
    setProfit,
    setBond,
    setInsurance,
    setContingency,
    setTax,
  } = useEstimateStore();

  // Subtotal with bond & insurance (before contingency/tax)
  const subtotalWithBondIns = subtotalBeforeBondIns + bondAmount + insuranceAmount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-purple-400 shrink-0" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Overhead, Profit, Bond & Insurance
            </h2>
          </div>
          <span className="text-sm font-black text-emerald-400 tabular-nums">
            {formatCurrencyDetailed(totalBaseBid)}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* CSI Division Rollup */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              CSI Division Rollup
            </h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px_100px_120px] bg-gray-50 border-b border-gray-200 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                <div className="px-4 py-2">Division</div>
                <div className="px-3 py-2 text-right border-l border-gray-200">Material</div>
                <div className="px-3 py-2 text-right border-l border-gray-200">Labor</div>
                <div className="px-3 py-2 text-right border-l border-gray-200">Equipment</div>
                <div className="px-3 py-2 text-right border-l border-gray-200">Total</div>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionRollups.map((s) => (
                  <div key={s.divisionId} className="grid grid-cols-[1fr_100px_100px_100px_120px] text-sm">
                    <div className="px-4 py-2.5">
                      <span className="font-mono text-[10px] text-brand-600 mr-2">{s.csiCode}</span>
                      <span className="text-gray-700">{s.description}</span>
                    </div>
                    <div className="px-3 py-2.5 text-right tabular-nums text-blue-700 border-l border-gray-100">
                      {formatCurrencyDetailed(s.materialTotal)}
                    </div>
                    <div className="px-3 py-2.5 text-right tabular-nums text-amber-700 border-l border-gray-100">
                      {formatCurrencyDetailed(s.laborTotal)}
                    </div>
                    <div className="px-3 py-2.5 text-right tabular-nums text-cyan-700 border-l border-gray-100">
                      {formatCurrencyDetailed(s.equipmentTotal)}
                    </div>
                    <div className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900 border-l border-gray-100">
                      {formatCurrencyDetailed(s.totalCost)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-gray-300 grid grid-cols-[1fr_100px_100px_100px_120px] bg-gray-50 text-sm font-bold">
                <div className="px-4 py-2.5 text-gray-700">Estimate Direct Cost</div>
                <div className="px-3 py-2.5 text-right tabular-nums text-blue-800 border-l border-gray-200">
                  {formatCurrencyDetailed(totalMaterial)}
                </div>
                <div className="px-3 py-2.5 text-right tabular-nums text-amber-800 border-l border-gray-200">
                  {formatCurrencyDetailed(totalLabor)}
                </div>
                <div className="px-3 py-2.5 text-right tabular-nums text-cyan-800 border-l border-gray-200">
                  {formatCurrencyDetailed(totalEquipment)}
                </div>
                <div className="px-3 py-2.5 text-right tabular-nums text-gray-900 border-l border-gray-200">
                  {formatCurrencyDetailed(estimateDirectCost)}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Build-Up */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Cost Build-Up
            </h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {/* Estimate Direct Cost */}
                <CostRow label="Estimate Direct Cost (Line Items)" amount={estimateDirectCost} />

                {/* Gen Requirements */}
                <CostRow label="General Requirements (Div 01)" amount={genRequirementsSubtotal} indent />

                {/* Gen Conditions */}
                <CostRow label="General Conditions" amount={genConditionsSubtotal} indent />

                {/* Total Direct Cost */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t-2 border-gray-300">
                  <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Total Direct Cost</span>
                  <span className="text-base font-black tabular-nums text-gray-900">
                    {formatCurrencyDetailed(directCostSubtotal)}
                  </span>
                </div>

                {/* Labor Burden */}
                <RateRow
                  label="Labor Burden"
                  percent={laborBurdenPercent}
                  onPercentChange={setLaborBurden}
                  amount={laborBurdenAmount}
                  basisLabel="of Labor"
                />

                {/* Adjusted Direct Cost */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t-2 border-gray-300">
                  <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Adjusted Direct Cost</span>
                  <span className="text-base font-black tabular-nums text-gray-900">
                    {formatCurrencyDetailed(adjustedDirectCost)}
                  </span>
                </div>

                {/* Overhead */}
                <RateRow
                  label="Overhead"
                  percent={overheadPercent}
                  onPercentChange={setOverhead}
                  amount={overheadAmount}
                  basisLabel="of Adjusted Direct Cost"
                />

                {/* Profit */}
                <RateRow
                  label="Profit"
                  percent={profitPercent}
                  onPercentChange={setProfit}
                  amount={profitAmount}
                  basisLabel="of Adjusted Direct Cost"
                />

                {/* Subtotal before Bond/Insurance */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t-2 border-gray-300">
                  <span className="text-sm font-bold text-gray-800">Subtotal (before Bond & Insurance)</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatCurrencyDetailed(subtotalBeforeBondIns)}
                  </span>
                </div>

                {/* Bond */}
                <RateRow
                  label="Performance & Payment Bond"
                  percent={bondPercent}
                  onPercentChange={setBond}
                  amount={bondAmount}
                  basisLabel="of Subtotal"
                />

                {/* Insurance */}
                <RateRow
                  label="Builder's Risk Insurance"
                  percent={insurancePercent}
                  onPercentChange={setInsurance}
                  amount={insuranceAmount}
                  basisLabel="of Subtotal"
                />

                {/* Subtotal with Bond & Insurance */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                  <span className="text-sm font-bold text-gray-800">Subtotal (with Bond & Insurance)</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatCurrencyDetailed(subtotalWithBondIns)}
                  </span>
                </div>

                {/* Contingency */}
                <RateRow
                  label="Contingency"
                  percent={contingencyPercent}
                  onPercentChange={setContingency}
                  amount={contingencyAmount}
                  basisLabel="of Subtotal"
                />

                {/* Sales Tax */}
                <RateRow
                  label="Sales Tax"
                  percent={taxPercent}
                  onPercentChange={setTax}
                  amount={taxAmount}
                  basisLabel="of Material Cost"
                />
              </div>

              {/* Total Base Bid */}
              <div className="border-t-4 border-gray-900 px-6 py-4 flex items-center justify-between bg-gray-900">
                <span className="text-sm font-black text-white uppercase tracking-widest">Total Base Bid</span>
                <span className="text-xl font-black tabular-nums text-emerald-400">
                  {formatCurrencyDetailed(totalBaseBid)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className="px-6 py-2.5 flex items-center justify-between">
      <span className={`text-sm ${indent ? 'text-gray-500 pl-4' : 'font-semibold text-gray-800'}`}>
        {indent && '+ '}{label}
      </span>
      <span className={`tabular-nums ${indent ? 'text-sm text-gray-600' : 'text-sm font-bold text-gray-900'}`}>
        {formatCurrencyDetailed(amount)}
      </span>
    </div>
  );
}

function RateRow({
  label,
  percent,
  onPercentChange,
  amount,
  basisLabel,
}: {
  label: string;
  percent: number;
  onPercentChange: (pct: number) => void;
  amount: number;
  basisLabel: string;
}) {
  return (
    <div className="px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5">
          <input
            type="number"
            value={percent}
            onChange={(e) => onPercentChange(parseFloat(e.target.value) || 0)}
            className="w-16 bg-transparent text-sm text-right font-mono tabular-nums focus:outline-none"
            step="0.25"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
        <span className="text-[10px] text-gray-400">{basisLabel}</span>
      </div>
      <span className="text-sm tabular-nums text-gray-700 font-medium">
        {formatCurrencyDetailed(amount)}
      </span>
    </div>
  );
}
