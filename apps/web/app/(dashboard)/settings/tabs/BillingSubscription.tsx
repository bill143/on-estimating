'use client';

import { useState } from 'react';
import {
  CreditCard,
  Check,
  X,
  Download,
  AlertTriangle,
  Users,
  Zap,
  HardDrive,
  FileText,
  BrainCircuit,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/lib/settings-store';
import type { PlanTier, BillingInfo, Invoice } from '@/lib/settings-types';

// ── Sample data ────────────────────────

const sampleBilling: BillingInfo = {
  plan: 'professional',
  seatCount: 25,
  seatsUsed: 14,
  apiTokenUsage: { used: 184320, limit: 500000 },
  features: {
    'takeoff-pages': { used: 2847, limit: 5000 },
    'ai-queries': { used: 12640, limit: 25000 },
    storage: { used: 18700, limit: 50000 },
  },
  paymentMethod: { type: 'visa', last4: '4242', expiry: '09/27' },
  invoices: [
    { id: 'inv-001', date: '2026-03-01T00:00:00Z', amount: 49900, status: 'paid', downloadUrl: '/invoices/inv-001.pdf' },
    { id: 'inv-002', date: '2026-02-01T00:00:00Z', amount: 49900, status: 'paid', downloadUrl: '/invoices/inv-002.pdf' },
    { id: 'inv-003', date: '2026-01-01T00:00:00Z', amount: 52340, status: 'paid', downloadUrl: '/invoices/inv-003.pdf' },
    { id: 'inv-004', date: '2025-12-01T00:00:00Z', amount: 49900, status: 'paid', downloadUrl: '/invoices/inv-004.pdf' },
  ],
  nextBillingDate: '2026-04-01T00:00:00Z',
  monthlyAmount: 49900,
};

const sampleSeatUsers = [
  { name: 'Marcus O\'Neill', role: 'Super Admin' },
  { name: 'Sarah Chen', role: 'Org Admin' },
  { name: 'James Rodriguez', role: 'Estimator' },
  { name: 'Emily Watson', role: 'Estimator' },
  { name: 'David Kim', role: 'Project Manager' },
  { name: 'Rachel Thompson', role: 'Estimator' },
  { name: 'Michael Brown', role: 'Project Manager' },
  { name: 'Lisa Park', role: 'Estimator' },
  { name: 'Chris Taylor', role: 'Estimator' },
  { name: 'Amanda Foster', role: 'Estimator' },
  { name: 'Robert Clark', role: 'Project Manager' },
  { name: 'Jennifer Lee', role: 'Viewer' },
  { name: 'Daniel Harris', role: 'Subcontractor' },
  { name: 'Michelle Adams', role: 'Viewer' },
];

// ── Plan definitions ───────────────────

interface PlanDefinition {
  tier: PlanTier;
  name: string;
  price: number; // cents
  features: { label: string; included: boolean }[];
  highlight?: string;
}

const plans: PlanDefinition[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 9900,
    features: [
      { label: '5 seats', included: true },
      { label: '500 takeoff pages/mo', included: true },
      { label: '1,000 AI queries/mo', included: true },
      { label: 'Email support', included: true },
      { label: 'API access', included: false },
      { label: 'SSO / SAML', included: false },
      { label: 'Custom integrations', included: false },
      { label: 'Dedicated support', included: false },
    ],
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: 49900,
    highlight: 'Most Popular',
    features: [
      { label: '25 seats', included: true },
      { label: '5,000 takeoff pages/mo', included: true },
      { label: '25,000 AI queries/mo', included: true },
      { label: 'Priority support', included: true },
      { label: 'API access', included: true },
      { label: 'SSO / SAML', included: false },
      { label: 'Custom integrations', included: false },
      { label: 'Dedicated support', included: false },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 0,
    features: [
      { label: 'Unlimited seats', included: true },
      { label: 'Unlimited takeoff pages', included: true },
      { label: 'Unlimited AI queries', included: true },
      { label: 'Dedicated support', included: true },
      { label: 'API access', included: true },
      { label: 'SSO / SAML', included: true },
      { label: 'Custom integrations', included: true },
      { label: 'Dedicated account manager', included: true },
    ],
  },
];

// ── Helpers ────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCurrencyExact(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function getTierBadge(tier: PlanTier) {
  switch (tier) {
    case 'starter':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    case 'professional':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'enterprise':
      return 'bg-purple-50 text-purple-700 border-purple-200';
  }
}

function getTierName(tier: PlanTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function getStatusBadge(status: Invoice['status']) {
  switch (status) {
    case 'paid':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'overdue':
      return 'bg-red-50 text-red-700 border-red-200';
  }
}

// ── Progress Bar Component ─────────────

function UsageBar({
  used,
  limit,
  label,
  icon,
  formatValue,
}: {
  used: number;
  limit: number;
  label: string;
  icon: React.ReactNode;
  formatValue?: (n: number) => string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const fmt = formatValue ?? formatNumber;
  const barColor =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-orange-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          {icon}
          {label}
        </div>
        <span className="text-sm text-zinc-500">
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-400 mt-1 text-right">{pct.toFixed(0)}% used</p>
    </div>
  );
}

// ── Component ──────────────────────────

export default function BillingSubscription() {
  const storeBilling = useSettingsStore((s) => s.billing);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Use sample data if store has defaults (no real billing yet)
  const billing: BillingInfo =
    storeBilling.monthlyAmount > 0 ? storeBilling : sampleBilling;

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Billing & Subscription</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your plan, monitor usage, and view billing history.
        </p>
      </div>

      {/* ── 1. Current Plan Card ─────────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-zinc-900">
                {getTierName(billing.plan)} Plan
              </h3>
              <Badge
                variant="outline"
                className={`text-xs font-medium ${getTierBadge(billing.plan)}`}
              >
                {getTierName(billing.plan)}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {billing.plan === 'enterprise'
                ? 'Custom'
                : `${formatCurrency(billing.monthlyAmount)}`}
              {billing.plan !== 'enterprise' && (
                <span className="text-sm font-normal text-zinc-500">/month</span>
              )}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Next billing date:{' '}
              <span className="font-medium text-zinc-700">
                {formatDate(billing.nextBillingDate)}
              </span>
            </p>
          </div>
          {billing.plan !== 'enterprise' && (
            <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5">
              Upgrade Plan
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* ── 2. Plan Comparison Grid ──────── */}
      <div>
        <h3 className="text-base font-semibold text-zinc-900 mb-4">Compare Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.tier === billing.plan;
            return (
              <Card
                key={plan.tier}
                className={`border bg-white p-6 relative ${
                  isCurrent
                    ? 'border-orange-400 ring-2 ring-orange-100'
                    : 'border-zinc-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white text-[10px] font-semibold px-2.5 py-0.5 border-0">
                      {plan.highlight}
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge
                      variant="outline"
                      className="bg-white text-orange-600 border-orange-300 text-[10px] font-semibold px-2 py-0.5"
                    >
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-5 pt-2">
                  <h4 className="text-base font-semibold text-zinc-900">{plan.name}</h4>
                  <div className="mt-2">
                    {plan.tier === 'enterprise' ? (
                      <span className="text-2xl font-bold text-zinc-900">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-zinc-900">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-sm text-zinc-500">/mo</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-zinc-700' : 'text-zinc-400'}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full border-orange-300 text-orange-600"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : plan.tier === 'enterprise' ? (
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                ) : (
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    {plans.indexOf(plan) > plans.findIndex((p) => p.tier === billing.plan)
                      ? 'Upgrade'
                      : 'Downgrade'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 3. Seat Usage ────────────────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-500" />
          Seat Usage
        </h3>
        <UsageBar
          used={billing.seatsUsed}
          limit={billing.seatCount}
          label="Seats"
          icon={<Users className="w-4 h-4 text-zinc-400" />}
          formatValue={(n) => String(n)}
        />
        <div className="mt-4 max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleSeatUsers.map((u, i) => (
                <tr key={i} className="border-b border-zinc-50">
                  <td className="py-2 text-zinc-700">{u.name}</td>
                  <td className="py-2 text-zinc-500">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 4. API Token Usage ───────────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-zinc-500" />
          API Token Usage
        </h3>
        <UsageBar
          used={billing.apiTokenUsage.used}
          limit={billing.apiTokenUsage.limit}
          label="API Tokens"
          icon={<Zap className="w-4 h-4 text-zinc-400" />}
        />
      </Card>

      {/* ── 5. Feature Usage Limits ─────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-5">Feature Usage</h3>
        <div className="space-y-5">
          <UsageBar
            used={billing.features['takeoff-pages']?.used ?? 0}
            limit={billing.features['takeoff-pages']?.limit ?? 1}
            label="Takeoff Pages"
            icon={<FileText className="w-4 h-4 text-zinc-400" />}
          />
          <UsageBar
            used={billing.features['ai-queries']?.used ?? 0}
            limit={billing.features['ai-queries']?.limit ?? 1}
            label="AI Queries"
            icon={<BrainCircuit className="w-4 h-4 text-zinc-400" />}
          />
          <UsageBar
            used={billing.features['storage']?.used ?? 0}
            limit={billing.features['storage']?.limit ?? 1}
            label="Storage (MB)"
            icon={<HardDrive className="w-4 h-4 text-zinc-400" />}
            formatValue={(n) => formatNumber(n)}
          />
        </div>
      </Card>

      {/* ── 6. Payment Method ────────────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-zinc-500" />
          Payment Method
        </h3>
        {billing.paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {billing.paymentMethod.type.charAt(0).toUpperCase() +
                    billing.paymentMethod.type.slice(1)}{' '}
                  ending in {billing.paymentMethod.last4}
                </p>
                <p className="text-xs text-zinc-500">
                  Expires {billing.paymentMethod.expiry}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update Payment Method
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500 mb-3">No payment method on file.</p>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Add Payment Method
            </Button>
          </div>
        )}
      </Card>

      {/* ── 7. Billing History ───────────── */}
      <Card className="border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4">Billing History</h3>
        {billing.invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody>
                {billing.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="py-3 text-zinc-700">{formatDate(inv.date)}</td>
                    <td className="py-3 text-zinc-700">
                      {inv.amount !== billing.monthlyAmount
                        ? 'Monthly subscription + API overage'
                        : 'Monthly subscription'}
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-900">
                      {formatCurrencyExact(inv.amount)}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium capitalize ${getStatusBadge(inv.status)}`}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = inv.downloadUrl;
                          a.download = `invoice-${inv.id}.pdf`;
                          a.click();
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 8. Danger Zone ───────────────── */}
      <Card className="border-2 border-red-200 bg-white p-6">
        <h3 className="text-base font-semibold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-zinc-600 mb-4">
          Cancelling your subscription will immediately revoke access for all team members.
          Your data will be retained for 30 days before permanent deletion.
        </p>

        {showCancelConfirm ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Are you sure you want to cancel?
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                This will end your {getTierName(billing.plan)} plan at the end of the current
                billing period.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Plan
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  // In production: call API to cancel
                  setShowCancelConfirm(false);
                }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel Subscription
          </Button>
        )}
      </Card>
    </div>
  );
}
