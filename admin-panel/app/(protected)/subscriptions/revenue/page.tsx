'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { BarChart3 } from 'lucide-react';
export default function RevenueReportsPage() {
  return <Placeholder title="Revenue Reports" description="Monthly, quarterly, and annual revenue breakdowns, MRR/ARR tracking, and churn analysis." icon={<BarChart3 className="w-8 h-8 text-brand-400" />} />;
}
