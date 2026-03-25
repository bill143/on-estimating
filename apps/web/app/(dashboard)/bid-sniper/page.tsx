'use client';

import { useState } from 'react';
import { Crosshair, Mail, Globe, Star, ExternalLink, Clock, Filter, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CapturedBid {
  id: string;
  source: 'email' | 'sam_gov' | 'manual';
  title: string;
  owner: string;
  value: number | null;
  dueDate: string;
  naicsCode: string;
  setAside: string | null;
  location: string;
  status: 'new' | 'reviewed' | 'added_to_pipeline' | 'dismissed';
  capturedAt: string;
  solicitationNumber: string | null;
  description: string;
}

const DEMO_CAPTURES: CapturedBid[] = [
  {
    id: 'c1', source: 'sam_gov', title: 'Federal Courthouse HVAC Modernization', owner: 'US GSA - Region 9',
    value: 8500000, dueDate: '2026-05-15', naicsCode: '236220', setAside: 'Total Small Business',
    location: 'Los Angeles, CA', status: 'new', capturedAt: '2026-03-25T08:00:00Z',
    solicitationNumber: 'GS-09P-26-ABC-0042', description: 'HVAC system replacement for federal courthouse complex. Includes 4 AHUs, ductwork, and controls upgrade.'
  },
  {
    id: 'c2', source: 'email', title: 'ITB: School District Admin Building Renovation', owner: 'LAUSD',
    value: 3200000, dueDate: '2026-04-22', naicsCode: '236220', setAside: null,
    location: 'Los Angeles, CA', status: 'new', capturedAt: '2026-03-24T14:30:00Z',
    solicitationNumber: null, description: 'Parsed from email inbox. Complete interior renovation of admin building, 35,000 SF.'
  },
  {
    id: 'c3', source: 'sam_gov', title: 'VA Medical Center Parking Structure', owner: 'Dept. of Veterans Affairs',
    value: 22000000, dueDate: '2026-06-01', naicsCode: '236220', setAside: 'SDVOSB',
    location: 'Long Beach, CA', status: 'reviewed', capturedAt: '2026-03-23T10:00:00Z',
    solicitationNumber: 'VA26-0088-R', description: '4-story, 800-space parking structure with EV charging infrastructure.'
  },
  {
    id: 'c4', source: 'email', title: 'RE: Bid Opportunity — Warehouse Conversion', owner: 'Arts District LLC',
    value: 5500000, dueDate: '2026-04-30', naicsCode: '236220', setAside: null,
    location: 'Los Angeles, CA', status: 'added_to_pipeline', capturedAt: '2026-03-22T09:15:00Z',
    solicitationNumber: null, description: 'Warehouse to creative office conversion, 45,000 SF. Forwarded by broker contact.'
  },
  {
    id: 'c5', source: 'sam_gov', title: 'Army Reserve Center Roof Replacement', owner: 'US Army Corps of Engineers',
    value: 1200000, dueDate: '2026-04-10', naicsCode: '238160', setAside: '8(a)',
    location: 'Camp Pendleton, CA', status: 'dismissed', capturedAt: '2026-03-21T16:00:00Z',
    solicitationNumber: 'W912PL-26-R-0015', description: 'Complete roof tear-off and replacement, 18,000 SF. 8(a) set-aside — not eligible.'
  },
];

const SOURCE_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  sam_gov: Globe,
  manual: Star,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Reviewed', color: 'bg-amber-100 text-amber-700' },
  added_to_pipeline: { label: 'In Pipeline', color: 'bg-emerald-100 text-emerald-700' },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-500' },
};

export default function BidSniperPage() {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'email' | 'sam_gov'>('all');
  const filtered = sourceFilter === 'all' ? DEMO_CAPTURES : DEMO_CAPTURES.filter((c) => c.source === sourceFilter);
  const newCount = DEMO_CAPTURES.filter((c) => c.status === 'new').length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Crosshair className="h-5 w-5 text-red-600" />
              </div>
              {newCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {newCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bid Sniper</h1>
              <p className="text-xs text-gray-500">
                Automated ITB capture from email inbox + SAM.gov Opportunities API
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              NAICS Filter
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Scan Now
            </button>
          </div>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-4 mt-4">
          {(['all', 'email', 'sam_gov'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={cn('pb-2 text-sm font-medium border-b-2 transition-colors',
                sourceFilter === f ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {f === 'all' ? 'All Sources' : f === 'email' ? 'Email Inbox' : 'SAM.gov'}
              {' '}({f === 'all' ? DEMO_CAPTURES.length : DEMO_CAPTURES.filter((c) => c.source === f).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filtered.map((bid) => {
          const SourceIcon = SOURCE_ICONS[bid.source];
          const statusConfig = STATUS_CONFIG[bid.status];

          return (
            <div key={bid.id} className={cn(
              'rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
              bid.status === 'new' && 'border-blue-200 bg-blue-50/30',
              bid.status === 'dismissed' && 'opacity-60',
            )}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg',
                    bid.source === 'email' ? 'bg-blue-100' : 'bg-green-100'
                  )}>
                    <SourceIcon className={cn('h-4 w-4',
                      bid.source === 'email' ? 'text-blue-600' : 'text-green-600'
                    )} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{bid.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{bid.owner}</span>
                      <span>{bid.location}</span>
                      {bid.solicitationNumber && (
                        <span className="font-mono text-gray-400">{bid.solicitationNumber}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {formatDate(bid.dueDate)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{bid.description}</p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        NAICS {bid.naicsCode}
                      </span>
                      {bid.setAside && (
                        <span className="inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          {bid.setAside}
                        </span>
                      )}
                      <span className={cn('inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold', statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4">
                  {bid.value && (
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(bid.value)}</p>
                  )}
                  {bid.status === 'new' && (
                    <div className="flex gap-2 mt-2">
                      <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                        Add to Pipeline
                      </button>
                      <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
