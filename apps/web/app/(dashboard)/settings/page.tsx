'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

interface OrgSettings {
  companyName: string;
  ueiNumber: string;
  cageCode: string;
  sdvosbCertified: boolean;
  defaultOverheadPct: number;
  defaultProfitPct: number;
  defaultBondPct: number;
  defaultInsurancePct: number;
  defaultContingencyPct: number;
  defaultLaborBurdenPct: number;
  logoUrl: string | null;
  region: string;
}

const DEFAULT_SETTINGS: OrgSettings = {
  companyName: '',
  ueiNumber: '',
  cageCode: '',
  sdvosbCertified: false,
  defaultOverheadPct: 10,
  defaultProfitPct: 10,
  defaultBondPct: 1.5,
  defaultInsurancePct: 2.0,
  defaultContingencyPct: 0,
  defaultLaborBurdenPct: 0,
  logoUrl: null,
  region: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch settings on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const { data } = await res.json();
          setSettings(data);
        }
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const { data } = await res.json();
        setSettings(data);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Platform configuration and preferences.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          Settings saved successfully.
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to save settings. Please try again.
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Company Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
              <input
                type="text"
                value={settings.region}
                onChange={(e) => updateField('region', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">UEI Number</label>
              <input
                type="text"
                value={settings.ueiNumber}
                onChange={(e) => updateField('ueiNumber', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CAGE Code</label>
              <input
                type="text"
                value={settings.cageCode}
                onChange={(e) => updateField('cageCode', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.sdvosbCertified}
                  onChange={(e) => updateField('sdvosbCertified', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">SDVOSB Certified</span>
              </label>
            </div>
          </div>
        </div>

        {/* Default Rates */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Default Estimate Rates</h3>
          <p className="text-xs text-gray-400 mb-4">These rates will be applied as defaults when creating a new estimate.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Overhead (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultOverheadPct}
                onChange={(e) => updateField('defaultOverheadPct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Profit (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultProfitPct}
                onChange={(e) => updateField('defaultProfitPct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bond (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultBondPct}
                onChange={(e) => updateField('defaultBondPct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Insurance (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultInsurancePct}
                onChange={(e) => updateField('defaultInsurancePct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Labor Burden (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultLaborBurdenPct}
                onChange={(e) => updateField('defaultLaborBurdenPct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contingency (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultContingencyPct}
                onChange={(e) => updateField('defaultContingencyPct', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Integrations (read-only display) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Integrations</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Supabase URL</label>
              <input
                type="text"
                value={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono bg-gray-50"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
