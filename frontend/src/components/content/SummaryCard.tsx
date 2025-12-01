import { useState } from 'react';

import {
  FileText,
  Calendar,
  Type,
  MoreVertical,
  Trash2,
  Share2,
  Download,
  BookOpen,
  Target,
  Lightbulb,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { SummaryItem } from './types';

interface SummaryCardProps {
  summary: SummaryItem;
  index: number;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}

export function SummaryCard({ summary, index, onDelete, formatDate }: SummaryCardProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'brief':
        return 'Brief';
      case 'medium':
        return 'Medium';
      case 'detailed':
        return 'Detailed';
      default:
        return 'Medium';
    }
  };

  const getStyleLabel = (style: string) => {
    switch (style) {
      case 'academic':
        return 'Academic';
      case 'casual':
        return 'Casual';
      case 'concise':
        return 'Concise';
      default:
        return 'Academic';
    }
  };

  const handleDownload = () => {
    const content = `# ${summary.lectureTitle}\n\n## Summary\n\n${summary.summaryText}\n\n## Key Takeaways\n\n${summary.keyTakeaways.map((t) => `- ${t}`).join('\n')}\n\n## Topics Covered\n\n${summary.topicsCovered.map((t) => `- ${t}`).join('\n')}\n\n## Learning Objectives\n\n${summary.learningObjectives.map((o) => `- ${o}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-${summary.lectureTitle}.md`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(summary.summaryText);
    toast.success('Summary text copied to clipboard!');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="glass-card border-border/50 p-6 hover:border-primary/20 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg mb-1 truncate">{summary.lectureTitle}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(summary.createdAt)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Type className="w-3.5 h-3.5" />
                      {summary.wordCount} words
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-border/50">
                    <DropdownMenuItem onClick={() => setViewDialogOpen(true)}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Full Summary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(summary.id)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                  {getSizeLabel(summary.size)}
                </Badge>
                <Badge variant="outline" className="border-border/50">
                  {getStyleLabel(summary.style)}
                </Badge>
                <Badge variant="outline" className="border-border/50">
                  {summary.keyTakeaways.length} Takeaways
                </Badge>
              </div>

              <div className="glass-card rounded-lg p-4 border border-border/50 mb-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{summary.summaryText}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setViewDialogOpen(true)} className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  View Full Summary
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-border/50"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* view full summary dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{summary.lectureTitle}</DialogTitle>
            <DialogDescription>
              {getStyleLabel(summary.style)} summary • {summary.wordCount} words • Created{' '}
              {formatDate(summary.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* summary text */}
            <div>
              <h3 className="text-sm mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Summary
              </h3>
              <div className="glass-card rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {summary.summaryText}
                </p>
              </div>
            </div>

            {/* key takeaways */}
            {summary.keyTakeaways.length > 0 && (
              <div>
                <h3 className="text-sm mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Key Takeaways
                </h3>
                <div className="glass-card rounded-lg p-4 border border-border/50">
                  <ul className="space-y-2">
                    {summary.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* learning objectives */}
            {summary.learningObjectives.length > 0 && (
              <div>
                <h3 className="text-sm mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Learning Objectives
                </h3>
                <div className="glass-card rounded-lg p-4 border border-border/50">
                  <ul className="space-y-2">
                    {summary.learningObjectives.map((objective, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* topics covered */}
            {summary.topicsCovered.length > 0 && (
              <div>
                <h3 className="text-sm mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Topics Covered
                </h3>
                <div className="glass-card rounded-lg p-4 border border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {summary.topicsCovered.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="border-border/50">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download as Markdown
              </Button>
              <Button variant="outline" className="gap-2 border-border/50" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
