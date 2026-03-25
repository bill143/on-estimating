'use client';

import { useState } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, User, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ApprovalRequest {
  id: string;
  type: 'estimate' | 'change_order' | 'sub_award' | 'budget_override';
  title: string;
  project: string;
  requestedBy: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
}

const DEMO_APPROVALS: ApprovalRequest[] = [
  { id: 'a1', type: 'estimate', title: 'Base Bid — Westside Apartments', project: 'Westside Apartment Renovation', requestedBy: 'Bill Asmar', amount: 4500000, status: 'pending', submittedDate: '2026-03-23', priority: 'high', notes: 'Final estimate ready for senior review before submission.' },
  { id: 'a2', type: 'sub_award', title: 'Electrical Sub Award — Spark Electric', project: 'Tech Hub HQ Build-Out', requestedBy: 'Bill Asmar', amount: 620000, status: 'approved', submittedDate: '2026-03-19', priority: 'medium', notes: 'Lowest qualified bidder. Prequalified.' },
  { id: 'a3', type: 'change_order', title: 'CO#3 — Additional Foundation Work', project: 'Riverside Medical Office', requestedBy: 'Bill Asmar', amount: 85000, status: 'pending', submittedDate: '2026-03-24', priority: 'high', notes: 'Unforeseen soil conditions per geotech report.' },
  { id: 'a4', type: 'budget_override', title: 'Contingency Increase to 8%', project: 'Federal Courthouse Annex', requestedBy: 'Bill Asmar', amount: 450000, status: 'rejected', submittedDate: '2026-03-18', priority: 'low', notes: 'Rejected — maintain 5% contingency per company policy.' },
];

const TYPE_LABELS: Record<string, string> = {
  estimate: 'Estimate Approval',
  change_order: 'Change Order',
  sub_award: 'Sub Award',
  budget_override: 'Budget Override',
};

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filtered = filter === 'all' ? DEMO_APPROVALS : DEMO_APPROVALS.filter((a) => a.status === filter);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Approval Workflow</h1>
              <p className="text-xs text-gray-500">Review and approve estimates, change orders, and sub awards</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mt-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('pb-2 text-sm font-medium border-b-2 transition-colors capitalize',
                filter === f ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {f} ({f === 'all' ? DEMO_APPROVALS.length : DEMO_APPROVALS.filter((a) => a.status === f).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filtered.map((req) => (
          <div key={req.id} className={cn(
            'rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
            req.status === 'pending' && req.priority === 'high' && 'border-amber-300',
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={cn('mt-0.5', {
                  'text-amber-500': req.status === 'pending',
                  'text-emerald-500': req.status === 'approved',
                  'text-red-500': req.status === 'rejected',
                })}>
                  {req.status === 'pending' && <Clock className="h-5 w-5" />}
                  {req.status === 'approved' && <CheckCircle2 className="h-5 w-5" />}
                  {req.status === 'rejected' && <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 font-medium">
                      {TYPE_LABELS[req.type]}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {req.project}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {req.requestedBy}
                    </span>
                    <span>{formatDate(req.submittedDate)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{req.notes}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                      Approve
                    </button>
                    <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
