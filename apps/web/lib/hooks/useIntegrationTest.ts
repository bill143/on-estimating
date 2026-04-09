'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for testing integration connections — stub implementation
 */
export function useIntegrationTest() {
  const [testingId, setTestingId] = useState<string | null>(null);

  const testConnection = useCallback(async (integrationId: string) => {
    setTestingId(integrationId);
    // Simulate connection test
    await new Promise((r) => setTimeout(r, 1500));
    setTestingId(null);
    return { success: true, message: 'Connection successful (demo mode)' };
  }, []);

  return { testConnection, testingId };
}
