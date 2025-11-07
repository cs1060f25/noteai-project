import { createFileRoute } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { UsersTable } from '@/components/admin/UsersTable';

export function AdminUsersPage() {
  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold">User Management</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage all registered users and their roles
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <UsersTable />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: AdminUsersPage,
});
