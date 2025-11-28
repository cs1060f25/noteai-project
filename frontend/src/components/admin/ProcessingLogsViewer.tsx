import React, { useCallback, useEffect, useState } from 'react';

import {
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getProcessingLogs, AdminError } from '@/services/adminService';
import type { ProcessingLog, ProcessingLogsQueryParams, ProcessingLogStatus } from '@/types/admin';

const STATUS_COLORS: Record<ProcessingLogStatus, string> = {
  started: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const STATUS_ICONS: Record<ProcessingLogStatus, React.ComponentType<{ className?: string }>> = {
  started: PlayCircle,
  completed: CheckCircle,
  failed: XCircle,
};

export const ProcessingLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query params
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [stageFilter, setStageFilter] = useState('');
  const [jobIdFilter, setJobIdFilter] = useState('');

  // Get unique stages for filter
  const uniqueStages = Array.from(new Set(logs.map((log) => log.stage))).sort();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ProcessingLogsQueryParams = {
        limit,
        offset: (page - 1) * limit,
      };

      if (stageFilter) {
        params.stage = stageFilter;
      }

      if (jobIdFilter) {
        params.job_id = jobIdFilter;
      }

      const data = await getProcessingLogs(params);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      const errorMessage = err instanceof AdminError ? err.message : 'Failed to fetch logs';
      setError(errorMessage);
      toast.error('Failed to load logs', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, stageFilter, jobIdFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: ProcessingLogStatus) => {
    const Icon = STATUS_ICONS[status];
    return <Icon className="w-4 h-4" />;
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Processing Logs
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Job ID Filter */}
            <input
              type="text"
              placeholder="Filter by Job ID"
              value={jobIdFilter}
              onChange={(e) => {
                setJobIdFilter(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />

            {/* Stage Filter */}
            {uniqueStages.length > 0 && (
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Stages</option>
                {uniqueStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            )}

            <Button onClick={fetchLogs} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchLogs} variant="outline" size="sm" className="mt-2">
                Retry
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No logs found</p>
            </div>
          </div>
        ) : (
          <>
            {/* Logs List */}
            <div className="space-y-2">
              {logs.map((log, index) => (
                <motion.div
                  key={log.log_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="glass-card rounded-lg border border-border/50 p-4 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Badge className={cn('gap-1 mt-0.5', STATUS_COLORS[log.status])}>
                      {getStatusIcon(log.status)}
                      {log.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{log.stage}</span>
                            {log.agent_name && (
                              <Badge variant="outline" className="text-xs">
                                {log.agent_name}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">Job: {log.job_id}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {log.duration_seconds !== null && log.duration_seconds !== undefined && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(log.duration_seconds)}</span>
                          </div>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                          <strong>Error:</strong> {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                  logs
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
