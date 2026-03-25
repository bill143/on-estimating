'use client';

import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';

export function EstimateHeader() {
  const { header, setHeader } = useEstimateStore();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Title bar */}
      <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Estimate Summary Sheet</h2>
        </div>
        <div className="text-xs text-gray-400 font-mono">REV {header.revision}</div>
      </div>

      <div className="p-5 grid grid-cols-12 gap-x-6 gap-y-3">
        {/* Row 1 — Project Name (full width) */}
        <div className="col-span-9">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Project Name</label>
          <input
            type="text"
            value={header.projectName}
            onChange={(e) => setHeader({ projectName: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-base font-bold text-gray-900 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="Enter project name"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Revision</label>
          <input
            type="text"
            value={header.revision}
            onChange={(e) => setHeader({ revision: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm font-mono text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="R0"
          />
        </div>

        {/* Row 2 — Address */}
        <div className="col-span-6">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Address</label>
          <input
            type="text"
            value={header.address}
            onChange={(e) => setHeader({ address: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="Street address"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">City</label>
          <input
            type="text"
            value={header.city}
            onChange={(e) => setHeader({ city: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="City"
          />
        </div>
        <div className="col-span-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">State</label>
          <input
            type="text"
            value={header.state}
            onChange={(e) => setHeader({ state: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="ST"
            maxLength={2}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Zip</label>
          <input
            type="text"
            value={header.zip}
            onChange={(e) => setHeader({ zip: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="00000"
          />
        </div>

        {/* Row 3 — People */}
        <div className="col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Owner</label>
          <input
            type="text"
            value={header.owner}
            onChange={(e) => setHeader({ owner: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="Owner / Client"
          />
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Architect</label>
          <input
            type="text"
            value={header.architect}
            onChange={(e) => setHeader({ architect: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="Architect / Engineer"
          />
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Estimator</label>
          <input
            type="text"
            value={header.estimator}
            onChange={(e) => setHeader({ estimator: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
            placeholder="Estimator"
          />
        </div>

        {/* Row 4 — Dates + Total Base Bid */}
        <div className="col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Estimate Date</label>
          <input
            type="date"
            value={header.estimateDate}
            onChange={(e) => setHeader({ estimateDate: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Bid Date</label>
          <input
            type="date"
            value={header.bidDate}
            onChange={(e) => setHeader({ bidDate: e.target.value })}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-700 focus:border-brand-500 focus:outline-none pb-1"
          />
        </div>
        <div className="col-span-6">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Base Bid</label>
          <div className="text-2xl font-black text-gray-900 tabular-nums">
            {formatCurrencyDetailed(header.totalBaseBid)}
          </div>
        </div>
      </div>
    </div>
  );
}
