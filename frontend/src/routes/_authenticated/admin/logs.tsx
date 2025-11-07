import { createFileRoute } from '@tanstack/react-router';
import { FileText } from 'lucide-react';

import { ProcessingLogsViewer } from '@/components/admin/ProcessingLogsViewer';

export function AdminLogsPage() {
  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold">Processing Logs</h1>
        </div>
        <p className="text-muted-foreground">
          View system logs and processing activity across all jobs
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <ProcessingLogsViewer />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/admin/logs')({
  component: AdminLogsPage,
});
