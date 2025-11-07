import { createFileRoute } from '@tanstack/react-router';
import { Briefcase } from 'lucide-react';

import { AdminJobsTable } from '@/components/admin/AdminJobsTable';

export function AdminJobsPage() {
  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold">All Jobs</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage all processing jobs across all users
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <AdminJobsTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/admin/jobs')({
  component: AdminJobsPage,
});
