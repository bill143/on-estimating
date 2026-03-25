'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration and preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Company Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
              <input
                type="text"
                defaultValue="O'Neill Contractors"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                defaultValue="8.5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default O&P (%)</label>
              <input
                type="number"
                defaultValue="10"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
              <input
                type="text"
                defaultValue="Southern California"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Integrations</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Supabase URL</label>
              <input
                type="text"
                defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Claude AI API Key</label>
              <input
                type="password"
                defaultValue="••••••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
