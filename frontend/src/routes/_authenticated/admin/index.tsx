import { createFileRoute } from '@tanstack/react-router';
import { LayoutDashboard } from 'lucide-react';

import { SystemMetricsGrid } from '@/components/admin/SystemMetricsGrid';

export function AdminDashboardPage() {
  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          System-wide metrics and performance overview
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <SystemMetricsGrid />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboardPage,
});
