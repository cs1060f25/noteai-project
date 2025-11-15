import React, { useEffect, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getAllJobs, AdminError } from '@/services/adminService';
import type { AdminJobResponse, AdminJobsQueryParams } from '@/types/admin';
import type { JobStatus } from '@/types/api';

const STATUS_COLORS: Record<JobStatus, string> = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  queued: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

const STATUS_ICONS: Record<JobStatus, React.ComponentType<{ className?: string }>> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  queued: Clock,
};

export const AdminJobsTable: React.FC = () => {
  const navigate = useNavigate({ from: '/admin/jobs' });
  const [jobs, setJobs] = useState<AdminJobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query params
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: AdminJobsQueryParams = {
        limit,
        offset: (page - 1) * limit,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const data = await getAllJobs(params);
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      const errorMessage = err instanceof AdminError ? err.message : 'Failed to fetch jobs';
      setError(errorMessage);
      toast.error('Failed to load jobs', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, limit, statusFilter]);

  const filteredJobs = searchQuery
    ? jobs.filter(
        (job) =>
          job.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: JobStatus) => {
    const Icon = STATUS_ICONS[status];
    return <Icon className={cn('w-4 h-4', status === 'running' && 'animate-spin')} />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64 border-border border-1 focus-visible:ring-0"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as JobStatus | '');
                setPage(1);
              }}
              className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchJobs} variant="outline" size="sm" className="mt-2">
                Retry
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <FileVideo className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No jobs found</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      Filename
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <motion.tr
                      key={job.job_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate({ to: '/admin/jobs', search: { jobId: job.job_id } })}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileVideo className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate max-w-xs" title={job.filename}>
                            {job.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium">{job.user.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{job.user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('gap-1', STATUS_COLORS[job.status])}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(job.updated_at)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                  jobs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
