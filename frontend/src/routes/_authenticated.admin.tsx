import { Outlet, createFileRoute } from '@tanstack/react-router';

import { AdminRoute } from '@/components/admin/AdminRoute';

const AdminLayout = () => {
  return (
    <AdminRoute>
      <Outlet />
    </AdminRoute>
  );
};

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
});
