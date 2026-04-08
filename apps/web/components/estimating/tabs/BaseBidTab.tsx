'use client';

import { EstimateHeader } from '@/components/estimating/EstimateHeader';
import { EstimateGrid } from '@/components/estimating/EstimateGrid';

export function BaseBidTab() {
  return (
    <div className="space-y-6">
      <EstimateHeader />
      <EstimateGrid />
    </div>
  );
}
