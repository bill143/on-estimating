'use client';

import { useState } from 'react';
import { Users, Plus, Star, Phone, Mail, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  contactName: string;
  phone: string;
  email: string;
  rating: number;
  activeProjects: number;
  totalBids: number;
  wonBids: number;
  prequalified: boolean;
  insuranceExpiry: string;
  licenseNumber: string;
}

interface SubBid {
  id: string;
  subId: string;
  subName: string;
  projectName: string;
  trade: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  receivedDate: string;
  expiryDate: string;
  scope: string;
  exclusions: string;
}

const DEMO_SUBS: Subcontractor[] = [
  { id: 's1', name: 'AAA Mechanical Inc.', trade: 'HVAC', contactName: 'Robert Kim', phone: '(323) 555-0101', email: 'robert@aaamech.com', rating: 4.8, activeProjects: 3, totalBids: 24, wonBids: 15, prequalified: true, insuranceExpiry: '2027-01-15', licenseNumber: 'HVAC-892341' },
  { id: 's2', name: 'Spark Electric Co.', trade: 'Electrical', contactName: 'Diana Lopez', phone: '(562) 555-0202', email: 'diana@sparkelectric.com', rating: 4.5, activeProjects: 5, totalBids: 31, wonBids: 18, prequalified: true, insuranceExpiry: '2026-11-30', licenseNumber: 'EC-456789' },
  { id: 's3', name: 'Pacific Plumbing', trade: 'Plumbing', contactName: 'Tom Harris', phone: '(714) 555-0303', email: 'tom@pacificplumb.com', rating: 4.2, activeProjects: 2, totalBids: 18, wonBids: 8, prequalified: true, insuranceExpiry: '2026-09-15', licenseNumber: 'PL-334455' },
  { id: 's4', name: 'SunRise Drywall', trade: 'Drywall', contactName: 'Maria Santos', phone: '(310) 555-0404', email: 'maria@sunrisedw.com', rating: 3.9, activeProjects: 4, totalBids: 22, wonBids: 10, prequalified: false, insuranceExpiry: '2026-06-01', licenseNumber: 'DW-778899' },
];

const DEMO_BIDS: SubBid[] = [
  { id: 'b1', subId: 's1', subName: 'AAA Mechanical Inc.', projectName: 'Westside Apartment Renovation', trade: 'HVAC', amount: 485000, status: 'pending', receivedDate: '2026-03-20', expiryDate: '2026-04-20', scope: 'Complete HVAC installation, 120 units', exclusions: 'Ductwork insulation, fire dampers' },
  { id: 'b2', subId: 's2', subName: 'Spark Electric Co.', projectName: 'Westside Apartment Renovation', trade: 'Electrical', amount: 620000, status: 'accepted', receivedDate: '2026-03-18', expiryDate: '2026-04-18', scope: 'Full electrical, 120 units + common areas', exclusions: 'Low-voltage, fire alarm' },
  { id: 'b3', subId: 's1', subName: 'AAA Mechanical Inc.', projectName: 'Tech Hub HQ Build-Out', trade: 'HVAC', amount: 175000, status: 'accepted', receivedDate: '2026-03-10', expiryDate: '2026-04-10', scope: 'RTU replacement + VAV boxes', exclusions: 'Controls, BMS integration' },
  { id: 'b4', subId: 's4', subName: 'SunRise Drywall', projectName: 'Westside Apartment Renovation', trade: 'Drywall', amount: 340000, status: 'pending', receivedDate: '2026-03-22', expiryDate: '2026-04-07', scope: '48,000 SF drywall + framing', exclusions: 'Acoustic ceilings, specialties' },
];

export default function SubcontractorsPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'bids'>('directory');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Subcontractor Management</h1>
              <p className="text-xs text-gray-500">Bid tracking, prequalification, and sub directory</p>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Subcontractor
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-4">
          <button
            onClick={() => setActiveTab('directory')}
            className={cn('pb-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'directory' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Sub Directory ({DEMO_SUBS.length})
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={cn('pb-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'bids' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Sub Bids ({DEMO_BIDS.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'directory' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {DEMO_SUBS.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{sub.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{sub.trade} — Lic# {sub.licenseNumber}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-semibold text-gray-700">{sub.rating}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Win Rate</p>
                    <p className="font-semibold text-gray-800">{Math.round(sub.wonBids / sub.totalBids * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Active Projects</p>
                    <p className="font-semibold text-gray-800">{sub.activeProjects}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Prequalified</p>
                    <p className="font-semibold">
                      {sub.prequalified
                        ? <span className="text-emerald-600">Yes</span>
                        : <span className="text-red-600">No</span>
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {sub.phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {sub.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Subcontractor</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Trade</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase">Bid Amount</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Scope</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Received</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DEMO_BIDS.map((bid) => (
                  <tr key={bid.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        bid.status === 'accepted' && 'bg-emerald-50 text-emerald-700',
                        bid.status === 'pending' && 'bg-amber-50 text-amber-700',
                        bid.status === 'rejected' && 'bg-red-50 text-red-700',
                        bid.status === 'expired' && 'bg-gray-100 text-gray-500',
                      )}>
                        {bid.status === 'accepted' && <CheckCircle2 className="h-3 w-3" />}
                        {bid.status === 'pending' && <Clock className="h-3 w-3" />}
                        {bid.status === 'rejected' && <AlertCircle className="h-3 w-3" />}
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{bid.subName}</td>
                    <td className="px-4 py-3 text-gray-600">{bid.projectName}</td>
                    <td className="px-4 py-3 text-gray-600">{bid.trade}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatCurrency(bid.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{bid.scope}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(bid.receivedDate)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(bid.expiryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
