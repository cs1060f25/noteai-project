import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getProcessingLogs, AdminError } from '@/services/adminService';
import type { ProcessingLog, ProcessingLogsQueryParams, LogLevel } from '@/types/admin';
import { cn } from '@/lib/utils';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  INFO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  WARNING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  ERROR: 'bg-red-500/10 text-red-500 border-red-500/20',
  CRITICAL: 'bg-red-600/10 text-red-600 border-red-600/20',
};

const LOG_LEVEL_ICONS: Record<LogLevel, React.ComponentType<{ className?: string }>> = {
  DEBUG: Bug,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: AlertCircle,
};

export const ProcessingLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query params
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
  const [agentFilter, setAgentFilter] = useState('');

  // Get unique agent names for filter
  const uniqueAgents = Array.from(new Set(logs.map((log) => log.agent_name))).sort();

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ProcessingLogsQueryParams = {
        limit,
        offset: (page - 1) * limit,
      };

      if (levelFilter) {
        params.level = levelFilter;
      }

      if (agentFilter) {
        params.agent_name = agentFilter;
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
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, levelFilter, agentFilter]);

  const totalPages = Math.ceil(total / limit);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLevelIcon = (level: LogLevel) => {
    const Icon = LOG_LEVEL_ICONS[level];
    return <Icon className="w-4 h-4" />;
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
            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value as LogLevel | '');
                setPage(1);
              }}
              className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
            </select>

            {/* Agent Filter */}
            {uniqueAgents.length > 0 && (
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Agents</option>
                {uniqueAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
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
                    <Badge className={cn('gap-1 mt-0.5', LOG_LEVEL_COLORS[log.level])}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{log.agent_name}</span>
                          <span className="text-xs text-muted-foreground">
                            Job: {log.job_id}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground break-words">{log.message}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            View metadata
                          </summary>
                          <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
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
