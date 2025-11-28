import {
  BookOpen,
  Calendar,
  ChevronRight,
  MoreVertical,
  Trash2,
  Share2,
  Eye,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Quiz } from './types';

interface QuizCardProps {
  quiz: Quiz;
  index: number;
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}

export function QuizCard({ quiz, index, onStart, onDelete, formatDate }: QuizCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'not-started':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-card border-border/50 p-6 hover:border-primary/20 transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg mb-1 truncate">{quiz.lectureTitle}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(quiz.createdAt)}
                  </span>
                  <span>•</span>
                  <span>{quiz.questionsCount} questions</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card border-border/50">
                  <DropdownMenuItem onClick={() => onStart(quiz.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Quiz
                  </DropdownMenuItem>
                  {quiz.status === 'completed' && (
                    <DropdownMenuItem onClick={() => onStart(quiz.id)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake Quiz
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(quiz.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
              <Badge className={getStatusColor(quiz.status)}>
                {quiz.status === 'not-started' && 'Not Started'}
                {quiz.status === 'in-progress' && 'In Progress'}
                {quiz.status === 'completed' && 'Completed'}
              </Badge>
            </div>

            {quiz.lastAttempt && (
              <div className="glass-card rounded-lg p-4 mb-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="text-sm">Last Score</div>
                      <div className="text-lg">
                        {quiz.lastAttempt.score}/{quiz.lastAttempt.totalQuestions}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                    <div className="text-lg">
                      {Math.round((quiz.lastAttempt.score / quiz.lastAttempt.totalQuestions) * 100)}
                      %
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => onStart(quiz.id)} className="gap-2">
                {quiz.status === 'completed' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Retake Quiz
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    {quiz.status === 'in-progress' ? 'Continue' : 'Start Quiz'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
