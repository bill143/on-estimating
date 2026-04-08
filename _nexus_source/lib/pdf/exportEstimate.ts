import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { EstimatePDF, type EstimatePDFProps } from './EstimatePDF';
import { useSettingsStore } from '@/store/settingsStore';
import type { Estimate, Project } from '@/types';

export async function exportEstimatePDF(estimate: Estimate, project: Project): Promise<void> {
  const store = useSettingsStore.getState();
  const templates = store.exportTemplates;
  const compliance = store.compliance;
  const organizationName = store.organization.name || "O'Neill Estimator";

  const props: EstimatePDFProps = {
    estimate,
    project,
    templates,
    compliance,
    organizationName,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(EstimatePDF, props) as any;
  const blob = await pdf(doc).toBlob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(estimate.name)}_${sanitizeFilename(project.name)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
}
