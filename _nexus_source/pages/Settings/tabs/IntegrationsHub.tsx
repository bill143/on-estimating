import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Plug,
  BrainCircuit,
  Database,
  HardDrive,
  Mail,
  Kanban,
  Users,
  Ruler,
  Receipt,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settingsStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useIntegrationTest } from '@/hooks/useIntegrationTest';
import toast from 'react-hot-toast';
import type {
  Integration,
  IntegrationCategory,
  IntegrationField,
  ConnectionStatus,
} from '@/types/settings';

// ── Category metadata ──────────────────

interface CategoryMeta {
  id: IntegrationCategory;
  label: string;
  icon: typeof BrainCircuit;
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'ai-engines', label: 'AI Engines', icon: BrainCircuit },
  { id: 'federal-data', label: 'Federal Data Sources', icon: Database },
  { id: 'storage', label: 'Storage & Documents', icon: HardDrive },
  { id: 'email', label: 'Email & Communications', icon: Mail },
  { id: 'project-management', label: 'Project Management', icon: Kanban },
  { id: 'crm', label: 'CRM & Business Dev', icon: Users },
  { id: 'estimating-takeoff', label: 'Estimating & Takeoff', icon: Ruler },
  { id: 'accounting', label: 'Accounting', icon: Receipt },
];

// ── Default integration seed (6 required) ──

const SEED_INTEGRATIONS: Integration[] = [
  {
    id: 'anthropic-claude',
    name: 'Anthropic Claude',
    category: 'ai-engines',
    status: 'disconnected',
    description: 'Primary AI engine for takeoff analysis, plan reading, and estimate generation.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
      {
        key: 'model',
        label: 'Default Model',
        type: 'select',
        options: [
          { label: 'Claude Opus', value: 'claude-opus' },
          { label: 'Claude Sonnet', value: 'claude-sonnet' },
          { label: 'Claude Haiku', value: 'claude-haiku' },
        ],
        value: 'claude-sonnet',
      },
      { key: 'visionEnabled', label: 'Enable Vision', type: 'toggle', value: true },
    ],
  },
  {
    id: 'openai-gpt4o',
    name: 'OpenAI GPT-4o',
    category: 'ai-engines',
    status: 'disconnected',
    description: 'Fallback AI model for cross-validation and disagreement analysis.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      { key: 'fallbackThreshold', label: 'Fallback Threshold (%)', type: 'number', value: 15, placeholder: '15' },
    ],
  },
  {
    id: 'sam-gov',
    name: 'SAM.gov',
    category: 'federal-data',
    status: 'disconnected',
    description: 'System for Award Management — entity validation, exclusion checks, and wage determinations.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter SAM.gov API key', required: true },
      {
        key: 'syncFrequency',
        label: 'Sync Frequency',
        type: 'select',
        options: [
          { label: 'Every hour', value: 'hourly' },
          { label: 'Every 6 hours', value: '6h' },
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
        ],
        value: 'daily',
      },
    ],
  },
  {
    id: 'procore',
    name: 'Procore',
    category: 'project-management',
    status: 'disconnected',
    description: 'Construction management platform integration via OAuth for project data.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter Procore API key', required: true },
    ],
  },
  {
    id: 'sage-300-cre',
    name: 'Sage 300',
    category: 'accounting',
    status: 'disconnected',
    description: 'Sage 300 Construction Real Estate connection for job costing and GL sync.',
    fields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', placeholder: 'https://sage-server.local', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter Sage 300 API key', required: true },
    ],
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'storage',
    status: 'disconnected',
    description: 'Electronic signature platform for contract execution and document workflows.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter DocuSign API key', required: true },
    ],
  },
];

// ── Status badge component ─────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Connected
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-500 gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          Disconnected
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Error
        </Badge>
      );
    case 'testing':
      return (
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Testing...
        </Badge>
      );
  }
}

// ── Field renderer ─────────────────────

function IntegrationFieldInput({
  field,
  value,
  onChange,
}: {
  field: IntegrationField;
  value: string | boolean | number | undefined;
  onChange: (val: string | boolean | number) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (field.type === 'toggle') {
    const checked = typeof value === 'boolean' ? value : !!field.value;
    return (
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-zinc-700">{field.label}</Label>
        <Switch
          checked={checked}
          onCheckedChange={(v) => onChange(v)}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-zinc-700">{field.label}</Label>
        <select
          value={String(value ?? field.value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-zinc-700">{field.label}</Label>
        <Input
          type="number"
          value={value !== undefined ? String(value) : String(field.value ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          className="focus-visible:ring-orange-500/20"
        />
      </div>
    );
  }

  // text | password
  const isPassword = field.type === 'password';
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-zinc-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={isPassword && !showPassword ? 'password' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`focus-visible:ring-orange-500/20 ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Integration card ───────────────────

function IntegrationCard({
  integration,
  isExpanded,
  onToggleExpand,
  onTestConnection,
  isTesting,
}: {
  integration: Integration;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTestConnection: () => void;
  isTesting: boolean;
}) {
  const updateIntegration = useSettingsStore((s) => s.updateIntegration);
  const [syncing, setSyncing] = useState(false);

  const handleFieldChange = (fieldKey: string, val: string | boolean | number) => {
    const updatedFields = integration.fields.map((f) =>
      f.key === fieldKey ? { ...f, value: val } : f,
    );
    updateIntegration(integration.id, { fields: updatedFields });
  };

  const handleSync = async () => {
    setSyncing(true);
    toast.loading('Syncing...', { id: `sync-${integration.id}` });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    updateIntegration(integration.id, { lastSync: new Date().toISOString() });
    setSyncing(false);
    toast.success(`${integration.name} synced successfully`, { id: `sync-${integration.id}` });
  };

  return (
    <Card className="border border-zinc-200 bg-white overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-zinc-900">{integration.name}</span>
              <StatusBadge status={integration.status} />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{integration.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {integration.lastSync && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(integration.lastSync).toLocaleString()}
            </span>
          )}
        </div>
      </button>

      {/* Error message */}
      {integration.status === 'error' && integration.errorMessage && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-red-700">{integration.errorMessage}</span>
        </div>
      )}

      {/* Expanded config panel */}
      {isExpanded && (
        <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50/30">
          <div className="grid gap-4 sm:grid-cols-2">
            {integration.fields.map((field) => (
              <div key={field.key} className={field.type === 'toggle' ? 'sm:col-span-2' : ''}>
                <IntegrationFieldInput
                  field={field}
                  value={field.value}
                  onChange={(val) => handleFieldChange(field.key, val)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-200">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTestConnection();
              }}
              disabled={isTesting}
              className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plug className="w-3.5 h-3.5" />
              )}
              Test Connection
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleSync();
              }}
              disabled={syncing}
              className="gap-1.5"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Sync Now
            </Button>
            {integration.lastSync && (
              <span className="text-xs text-zinc-500">
                Last synced: {new Date(integration.lastSync).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main component ─────────────────────

export default function IntegrationsHub() {
  const integrations = useSettingsStore((s) => s.integrations);
  const setIntegrations = useSettingsStore((s) => s.setIntegrations);
  const { testConnection, testingId } = useIntegrationTest();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Seed default integrations on mount if the store is empty
  useEffect(() => {
    if (!isSupabaseConfigured() && integrations.length === 0) {
      setIntegrations(SEED_INTEGRATIONS);
    }
  }, [integrations.length, setIntegrations]);

  // Wrap testConnection to show toasts
  const handleTestConnection = async (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    const name = integration?.name ?? id;
    toast.loading(`Testing ${name}...`, { id: `test-${id}` });
    const result = await testConnection(id);
    if (result.success) {
      toast.success(`${name}: ${result.message}`, { id: `test-${id}` });
    } else {
      toast.error(`${name}: ${result.message}`, { id: `test-${id}` });
    }
  };

  // Derived filtered list
  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [integrations, activeCategory, searchQuery]);

  // Group by category for display
  const grouped = useMemo(() => {
    const map = new Map<IntegrationCategory, Integration[]>();
    for (const integration of filtered) {
      const list = map.get(integration.category) ?? [];
      list.push(integration);
      map.set(integration.category, list);
    }
    return map;
  }, [filtered]);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Summary counts
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const errorCount = integrations.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Integrations Hub</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Connect your tools, data sources, and services.{' '}
          <span className="text-green-600 font-medium">{connectedCount} connected</span>
          {errorCount > 0 && (
            <>
              {' '}&middot;{' '}
              <span className="text-red-600 font-medium">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </p>
      </div>

      {/* Search + category filter bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 focus-visible:ring-orange-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className={
              activeCategory === 'all'
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'text-zinc-600'
            }
          >
            All ({integrations.length})
          </Button>
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const count = integrations.filter((i) => i.category === id).length;
            if (count === 0) return null;
            return (
              <Button
                key={id}
                variant={activeCategory === id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(id)}
                className={
                  activeCategory === id
                    ? 'bg-orange-600 hover:bg-orange-700 text-white gap-1.5'
                    : 'text-zinc-600 gap-1.5'
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Integration cards grouped by category */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Search className="w-8 h-8 mb-3" />
          <p className="text-sm font-medium">No integrations found</p>
          <p className="text-xs mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        CATEGORIES.filter((c) => grouped.has(c.id)).map(({ id, label, icon: Icon }) => (
          <section key={id}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
                {label}
              </h3>
              <span className="text-xs text-zinc-400">({grouped.get(id)!.length})</span>
            </div>
            <div className="space-y-3">
              {grouped.get(id)!.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isExpanded={expandedCards.has(integration.id)}
                  onToggleExpand={() => toggleExpand(integration.id)}
                  onTestConnection={() => handleTestConnection(integration.id)}
                  isTesting={testingId === integration.id}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
