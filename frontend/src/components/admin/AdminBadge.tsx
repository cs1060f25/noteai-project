import React from 'react';
import { Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useRole } from '@/hooks/useRole';

export const AdminBadge: React.FC = () => {
  const { isAdmin, isLoading } = useRole();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 gap-1">
      <Shield className="w-3 h-3" />
      Admin
    </Badge>
  );
};
