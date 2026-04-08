import { lazy, Suspense } from 'react';
import {
  Plug,
  BrainCircuit,
  Sparkles,
  Building2,
  Users,
  Bell,
  Calculator,
  FileText,
  CreditCard,
  Download,
  Upload,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSettings } from '@/hooks/useSettings';
import type { SettingsTab } from '@/types/settings';

// Lazy-loaded tab chunks
const IntegrationsHub = lazy(() => import('./tabs/IntegrationsHub'));
const AIConfiguration = lazy(() => import('./tabs/AIConfiguration'));
const OrganizationProfile = lazy(() => import('./tabs/OrganizationProfile'));
const UserManagement = lazy(() => import('./tabs/UserManagement'));
const NotificationsAutomation = lazy(() => import('./tabs/NotificationsAutomation'));
const EstimatingPreferences = lazy(() => import('./tabs/EstimatingPreferences'));
const DocumentLibrary = lazy(() => import('./tabs/DocumentLibrary'));
const BillingSubscription = lazy(() => import('./tabs/BillingSubscription'));
const EchoSettings = lazy(() => import('./tabs/EchoSettings'));

const tabs: { id: SettingsTab; label: string; icon: typeof Plug }[] = [
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'ai-config', label: 'AI Configuration', icon: BrainCircuit },
  { id: 'echo', label: 'Echo AI', icon: Sparkles },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'users', label: 'Users & RBAC', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'estimating', label: 'Estimating', icon: Calculator },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const tabComponents: Record<SettingsTab, React.LazyExoticComponent<() => JSX.Element>> = {
  integrations: IntegrationsHub,
  'ai-config': AIConfiguration,
  echo: EchoSettings,
  organization: OrganizationProfile,
  users: UserManagement,
  notifications: NotificationsAutomation,
  estimating: EstimatingPreferences,
  documents: DocumentLibrary,
  billing: BillingSubscription,
};

function TabLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-zinc-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export default function SettingsPage() {
  const { activeTab, navigate, isDirty, save, exportSettings, importSettings } = useSettings();

  const ActiveComponent = tabComponents[activeTab];

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        importSettings(text);
      } catch {
        // TODO: surface toast error
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6">
        <PageHeader title="Settings" subtitle="Manage integrations, AI, organization, and billing">
          <Button variant="outline" size="sm" onClick={exportSettings} className="gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          {isDirty && (
            <Button size="sm" onClick={save} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="flex flex-1 overflow-hidden mt-6">
        {/* Left sidebar sub-navigation */}
        <nav className="w-56 flex-shrink-0 border-r border-zinc-200 px-4 pb-6 overflow-y-auto">
          <ul className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => navigate(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === id
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <Suspense fallback={<TabLoader />}>
            <ActiveComponent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
