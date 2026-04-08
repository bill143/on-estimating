'use client';

import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';

export function TotalCostSummaryTab() {
  const {
    header,
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
    options,
    grandTotal,
    sectionRollups,
  } = useEstimateStore();

  // Subtotal with bond & insurance (before contingency/tax)
  const subtotalWithBondIns = subtotalBeforeBondIns + bondAmount + insuranceAmount;

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">
      {/* Print Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
        <div className="bg-gray-900 px-6 py-4 print:bg-gray-100 print:border-b-2 print:border-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-wider print:text-gray-900">
                Total Cost Summary
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 print:text-gray-600">
                {header.projectName || 'Untitled Project'} — Rev {header.revision}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400 tabular-nums print:text-gray-900">
                {formatCurrencyDetailed(grandTotal)}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider print:text-gray-600">
                Grand Total
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Base Bid Breakdown */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
              Base Bid
            </h3>

            {/* Division Rollup */}
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-2 text-left">Division</th>
                    <th className="px-3 py-2 text-right">Material</th>
                    <th className="px-3 py-2 text-right">Labor</th>
                    <th className="px-3 py-2 text-right">Equipment</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sectionRollups.map((s) => (
                    <tr key={s.divisionId}>
                      <td className="px-4 py-2">
                        <span className="font-mono text-[10px] text-brand-600 mr-2">{s.csiCode}</span>
                        <span className="text-gray-700">{s.description}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                        {formatCurrencyDetailed(s.materialTotal)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                        {formatCurrencyDetailed(s.laborTotal)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-cyan-700">
                        {formatCurrencyDetailed(s.equipmentTotal)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                        {formatCurrencyDetailed(s.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-4 py-2 text-gray-700">Estimate Direct Cost</td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-800">
                      {formatCurrencyDetailed(totalMaterial)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-800">
                      {formatCurrencyDetailed(totalLabor)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-cyan-800">
                      {formatCurrencyDetailed(totalEquipment)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                      {formatCurrencyDetailed(estimateDirectCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cost Build-up */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <SummaryRow label="Estimate Direct Cost" amount={estimateDirectCost} bold />
                  <SummaryRow label="General Requirements (Div 01)" amount={genRequirementsSubtotal} indent />
                  <SummaryRow label="General Conditions" amount={genConditionsSubtotal} indent />
                  <SummaryRow label="Total Direct Cost" amount={directCostSubtotal} bold border />
                  <SummaryRow label={`Labor Burden (${laborBurdenPercent}% of Labor)`} amount={laborBurdenAmount} />
                  <SummaryRow label="Adjusted Direct Cost" amount={adjustedDirectCost} bold border />
                  <SummaryRow label={`Overhead (${overheadPercent}%)`} amount={overheadAmount} />
                  <SummaryRow label={`Profit (${profitPercent}%)`} amount={profitAmount} />
                  <SummaryRow label="Subtotal (before Bond & Insurance)" amount={subtotalBeforeBondIns} bold border />
                  <SummaryRow label={`Performance & Payment Bond (${bondPercent}%)`} amount={bondAmount} />
                  <SummaryRow label={`Builder's Risk Insurance (${insurancePercent}%)`} amount={insuranceAmount} />
                  <SummaryRow label="Subtotal (with Bond & Insurance)" amount={subtotalWithBondIns} bold border />
                  <SummaryRow label={`Contingency (${contingencyPercent}%)`} amount={contingencyAmount} />
                  <SummaryRow label={`Sales Tax (${taxPercent}% of Material)`} amount={taxAmount} />
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 print:bg-gray-100 print:border-t-4 print:border-gray-900">
                    <td className="px-6 py-3 text-sm font-black text-white uppercase tracking-widest print:text-gray-900">
                      Total Base Bid
                    </td>
                    <td className="px-6 py-3 text-right text-xl font-black tabular-nums text-emerald-400 print:text-gray-900">
                      {formatCurrencyDetailed(totalBaseBid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Options */}
          {options.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                Options
              </h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-2 text-left">Option</th>
                      <th className="px-3 py-2 text-right">Direct Cost</th>
                      <th className="px-3 py-2 text-right">OH&P</th>
                      <th className="px-3 py-2 text-right">Bond & Ins</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {options.map((opt) => (
                      <tr key={opt.id}>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-gray-900">{opt.name}</span>
                          {opt.description && (
                            <span className="text-gray-500 ml-2">— {opt.description}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                          {formatCurrencyDetailed(opt.directCostSubtotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                          {formatCurrencyDetailed(opt.overheadAmount + opt.profitAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                          {formatCurrencyDetailed(opt.bondAmount + opt.insuranceAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-gray-900">
                          {formatCurrencyDetailed(opt.totalOptionCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="px-4 py-2 text-gray-700">Options Total</td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                        {formatCurrencyDetailed(options.reduce((s, o) => s + o.totalOptionCost, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="rounded-lg border-4 border-gray-900 overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Grand Total</span>
                {options.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Base Bid + {options.length} Option{options.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <span className="text-2xl font-black tabular-nums text-emerald-400">
                {formatCurrencyDetailed(grandTotal)}
              </span>
            </div>
          </div>

          {/* Project Info Footer */}
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200">
            <div>
              <p className="font-semibold text-gray-700">{header.projectName}</p>
              <p>{header.address}{header.city ? `, ${header.city}` : ''}{header.state ? `, ${header.state}` : ''} {header.zip}</p>
            </div>
            <div>
              <p>Owner: {header.owner}</p>
              <p>Architect: {header.architect}</p>
            </div>
            <div className="text-right">
              <p>Estimator: {header.estimator}</p>
              <p>Estimate Date: {header.estimateDate}</p>
              <p>Bid Date: {header.bidDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  bold,
  indent,
  border,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  indent?: boolean;
  border?: boolean;
}) {
  return (
    <tr className={border ? 'border-t-2 border-gray-300 bg-gray-50' : ''}>
      <td className={`px-6 py-2.5 ${indent ? 'pl-10 text-gray-500' : ''} ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {indent && '+ '}{label}
      </td>
      <td className={`px-6 py-2.5 text-right tabular-nums ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {formatCurrencyDetailed(amount)}
      </td>
    </tr>
  );
}
