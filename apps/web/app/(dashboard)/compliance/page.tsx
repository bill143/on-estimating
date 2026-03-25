'use client';

import { useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle2, Search, Download } from 'lucide-react';
import { useComplianceStore } from '@/lib/compliance-store';
import { formatCurrencyDetailed } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CompliancePage() {
  const { determinations, laborEntries, loadDemoData } = useComplianceStore();

  useEffect(() => {
    if (determinations.length === 0) loadDemoData();
  }, []);

  const violationCount = laborEntries.filter((e) => !e.isCompliant).length;
  const complianceRate = laborEntries.length > 0
    ? ((laborEntries.length - violationCount) / laborEntries.length * 100)
    : 100;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Davis-Bacon Wage Compliance</h1>
              <p className="text-xs text-gray-500">Federal prevailing wage rate management and compliance tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Search className="h-4 w-4" />
              Lookup Rates
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Export WH-347
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Compliance Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Compliance Rate</p>
            <p className={cn('text-2xl font-bold mt-1', complianceRate >= 100 ? 'text-emerald-600' : 'text-red-600')}>
              {complianceRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Active Violations</p>
            <p className={cn('text-2xl font-bold mt-1', violationCount > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {violationCount}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Wage Determinations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{determinations.length}</p>
          </div>
        </div>

        {/* Prevailing Wage Rates Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Prevailing Wage Rates — Los Angeles County, CA
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Determination #CA20260001 — Effective 01/01/2026</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Classification</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Base Rate</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Fringe</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Total Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {determinations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{d.classification}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatCurrencyDetailed(d.baseRate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatCurrencyDetailed(d.fringeRate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">{formatCurrencyDetailed(d.totalRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Labor Compliance Tracker */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Labor Compliance Tracker</h2>
            <p className="text-xs text-gray-400 mt-0.5">Federal Courthouse Annex — Week Ending 03/22/2026</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Worker</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Classification</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Rate Applied</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Prevailing Rate</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {laborEntries.map((entry) => (
                <tr key={entry.id} className={cn('hover:bg-gray-50', !entry.isCompliant && 'bg-red-50')}>
                  <td className="px-4 py-2.5">
                    {entry.isCompliant ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{entry.workerName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{entry.classification}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{entry.hoursWorked}</td>
                  <td className={cn('px-4 py-2.5 text-right tabular-nums', entry.isCompliant ? 'text-gray-700' : 'text-red-700 font-semibold')}>
                    {formatCurrencyDetailed(entry.rateApplied)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatCurrencyDetailed(entry.prevailingRate)}</td>
                  <td className={cn('px-4 py-2.5', !entry.isCompliant ? 'text-red-600 font-medium' : 'text-gray-500')}>
                    {entry.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
