import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { SettingsTab } from '@/types/settings';

/**
 * Convenience hook that wraps the settings store for tab components.
 * Will be extended with TanStack Query mutations when Supabase is connected.
 */
export function useSettings() {
  const store = useSettingsStore();

  const navigate = useCallback(
    (tab: SettingsTab) => {
      if (store.isDirty) {
        const confirmed = window.confirm('You have unsaved changes. Discard them?');
        if (!confirmed) return;
        store.markClean();
      }
      store.setActiveTab(tab);
    },
    [store],
  );

  const save = useCallback(async () => {
    // TODO: persist to Supabase via TanStack Query mutation
    // For now, just clear the dirty flag
    store.markClean();
  }, [store]);

  const exportSettings = useCallback(() => {
    const data = {
      aiConfig: store.aiConfig,
      organization: store.organization,
      notifications: store.notifications,
      estimating: store.estimating,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oneill-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const importSettings = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json);
        if (data.aiConfig) store.setAIConfig(data.aiConfig);
        if (data.organization) store.setOrganization(data.organization);
        if (data.notifications) store.setNotifications(data.notifications);
        if (data.estimating) store.setEstimating(data.estimating);
        store.markDirty();
      } catch {
        throw new Error('Invalid settings JSON');
      }
    },
    [store],
  );

  return {
    ...store,
    navigate,
    save,
    exportSettings,
    importSettings,
  };
}
