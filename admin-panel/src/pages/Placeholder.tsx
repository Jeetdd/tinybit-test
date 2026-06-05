import React from 'react';
import { Construction } from 'lucide-react';
import { Card } from '../components/ui';

interface PlaceholderProps {
  title: string;
  description?: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description || 'This section is being built.'}</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-5">
            <Construction className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
            {description || 'This module is under active development. Full functionality will be available in the next release.'}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            In Development
          </div>
        </div>
      </Card>
    </div>
  );
}
