'use client';

import { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileDown,
  ClipboardList,
  Settings2,
  DollarSign,
  Calculator,
  BarChart3,
  Layers,
  Users,
} from 'lucide-react';
import { useEstimateStore } from '@/lib/estimate-store';
import { formatCurrencyDetailed, cn } from '@/lib/utils';
import { BaseBidTab } from '@/components/estimating/tabs/BaseBidTab';
import { OptionsTab } from '@/components/estimating/tabs/OptionsTab';
import { GenRequirementsTab } from '@/components/estimating/tabs/GenRequirementsTab';
import { GenConditionsTab } from '@/components/estimating/tabs/GenConditionsTab';
import { OHPTab } from '@/components/estimating/tabs/OHPTab';
import { TotalCostSummaryTab } from '@/components/estimating/tabs/TotalCostSummaryTab';
import { SubBidGridTab } from '@/components/estimating/tabs/SubBidGridTab';

type TabId = 'base-bid' | 'options' | 'gen-requirements' | 'gen-conditions' | 'ohp' | 'sub-bids' | 'total-summary';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'base-bid', label: 'Base Bid', icon: ClipboardList },
  { id: 'options', label: 'Options', icon: Layers },
  { id: 'gen-requirements', label: 'Gen. Requirements', icon: Settings2 },
  { id: 'gen-conditions', label: 'Gen. Conditions', icon: DollarSign },
  { id: 'ohp', label: 'OH&P', icon: Calculator },
  { id: 'sub-bids', label: 'Sub Bids', icon: Users },
  { id: 'total-summary', label: 'Total Cost Summary', icon: BarChart3 },
];

export default function EstimatingPage() {
  const { rows, grandTotal, loadDemoEstimate } = useEstimateStore();
  const [activeTab, setActiveTab] = useState<TabId>('base-bid');

  useEffect(() => {
    if (rows.length === 0) {
      loadDemoEstimate();
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 shrink-0">
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
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Grand Total</p>
              <p className="text-lg font-black tabular-nums text-gray-900">
                {formatCurrencyDetailed(grandTotal)}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={async () => {
                const { exportEstimatePDF } = await import('@/lib/pdf/exportEstimate');
                const store = useEstimateStore.getState();
                // Build a minimal Estimate + Project shape for PDF export
                const estimate = {
                  name: 'Current Estimate',
                  status: 'draft' as const,
                  updatedAt: new Date().toISOString(),
                  totalAmount: store.grandTotal,
                  subtotal: store.grandTotal,
                  lineItems: [],
                  overheadPct: 0, overhead: 0,
                  profitPct: 0, profit: 0,
                  bondRate: 0, bondTotal: 0,
                  discount: { type: 'none' as const, amount: 0, value: 0 },
                };
                const project = {
                  name: 'Active Project',
                  agency: '',
                  solicitation: '',
                  setAside: '',
                  location: '',
                };
                await exportEstimatePDF(estimate as any, project as any);
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <button
              onClick={() => {
                const storeRows = useEstimateStore.getState().rows;
                const headers = 'SR#,Sheet,Detail,CSI,Description,QTY,Waste%,QTY W/W,Unit,Mat$/U,Lab$/U,Eq$/U,Tot$/U,Total Cost';
                const csvRows = storeRows
                  .filter((r) => r.rowType === 'line_item')
                  .map((r) =>
                    [
                      r.srNo,
                      r.sheetNo,
                      r.detailNo,
                      r.csiCode,
                      `"${r.description.replace(/"/g, '""')}"`,
                      r.qty,
                      r.wastePercent,
                      r.qtyWithWaste,
                      r.unit,
                      r.materialUnitCost,
                      r.laborUnitCost,
                      r.equipmentUnitCost,
                      r.totalUnitCost,
                      r.totalCost,
                    ].join(',')
                  );
                const csv = [headers, ...csvRows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'estimate-export.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white px-6 shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'base-bid' && <BaseBidTab />}
        {activeTab === 'options' && <OptionsTab />}
        {activeTab === 'gen-requirements' && <GenRequirementsTab />}
        {activeTab === 'gen-conditions' && <GenConditionsTab />}
        {activeTab === 'ohp' && <OHPTab />}
        {activeTab === 'sub-bids' && <SubBidGridTab />}
        {activeTab === 'total-summary' && <TotalCostSummaryTab />}
      </div>
    </div>
  );
}
