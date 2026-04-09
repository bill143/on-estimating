'use client';

import { useVaultStore } from '@/lib/vault-store';
import { VaultStudio } from '@/components/vault/VaultStudio';
import { VaultProject } from '@/components/vault/VaultProject';

export default function VaultPage() {
  const activeNotebook = useVaultStore((s) => s.activeNotebook);

  if (activeNotebook) {
    return <VaultProject />;
  }

  return <VaultStudio />;
}
