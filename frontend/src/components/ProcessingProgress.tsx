import React, { useState, useEffect } from 'react';

import {
  Upload,
  Volume2,
  FileText,
  Brain,
  Scissors,
  Video,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  Activity,
  Zap,
  Layout,
} from 'lucide-react';
import { motion } from 'motion/react';

import type {
  JobProgress,
  ProcessingMode,
  ProcessingStage as ProcessingStageType,
} from '@/types/api';

import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

export interface ProcessStage {
  id: ProcessingStageType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  isParallel?: boolean;
  parallelGroup?: number;
}

interface ProcessingProgressProps {
  videoName: string;
  processingMode?: ProcessingMode;
  currentProgress?: JobProgress;
  onComplete?: () => void;
  startTime?: Date;
}

const stageConfigs: Record<
  ProcessingStageType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { name: string; description: string; icon: React.ComponentType<any>; color: string }
> = {
  uploading: {
    name: 'Uploading Video',
    description: 'Transferring file to server',
    icon: Upload,
    color: 'bg-blue-500',
  },
  silence_detection: {
    name: 'Detecting Silence',
    description: 'Analyzing audio patterns',
    icon: Volume2,
    color: 'bg-purple-500',
  },
  transcription: {
    name: 'Transcribing',
    description: 'Converting speech to text',
    icon: FileText,
    color: 'bg-green-500',
  },
  layout_analysis: {
    name: 'Layout Detection',
    description: 'Detecting screen/camera regions',
    icon: Layout,
    color: 'bg-indigo-500',
  },
  content_analysis: {
    name: 'Content Analysis',
    description: 'Understanding key topics',
    icon: Brain,
    color: 'bg-orange-500',
  },
  segmentation: {
    name: 'Segment Extractor',
    description: 'Identifying highlights',
    icon: Scissors,
    color: 'bg-pink-500',
  },
  compilation: {
    name: 'Video Compilation',
    description: 'Generating final clips',
    icon: Video,
    color: 'bg-cyan-500',
  },
  complete: {
    name: 'Complete',
    description: 'Processing finished',
    icon: CheckCircle2,
    color: 'bg-green-500',
  },
};

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  videoName,
  processingMode = 'vision',
  currentProgress,
  onComplete,
  startTime = new Date(),
}) => {
  const [stages, setStages] = useState<ProcessStage[]>(() => {
    const allStages = Object.entries(stageConfigs)
      .filter(([key]) => key !== 'complete')
      .map(([id, config]) => ({
        id: id as ProcessingStageType,
        ...config,
        status: 'pending' as const,
        progress: 0,
      }));

    // filter out layout_analysis for audio mode
    if (processingMode === 'audio') {
      return allStages.filter((stage) => stage.id !== 'layout_analysis');
    }

    // for vision mode, mark silence, transcription and layout_analysis as parallel
    // audio track: silence → transcription (sequential)
    // video track: layout analysis
    // both tracks run in parallel
    return allStages.map((stage) => {
      if (
        stage.id === 'silence_detection' ||
        stage.id === 'transcription' ||
        stage.id === 'layout_analysis'
      ) {
        return {
          ...stage,
          isParallel: true,
          parallelGroup: 1,
        };
      }
      return stage;
    });
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage] = useState<string | null>(null);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Update stages based on current progress
  useEffect(() => {
    if (!currentProgress) return;

    if (currentProgress.stage === 'complete') {
      setIsCompleted(true);
      setStages((prev) =>
        prev.map((stage) => ({
          ...stage,
          status: 'completed',
          progress: 100,
        }))
      );
      setOverallProgress(100);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    setStages((prev) => {
      const updatedStages = prev.map((stage) => {
        if (stage.id === currentProgress.stage) {
          return {
            ...stage,
            status: 'processing' as const,
            progress: currentProgress.percent,
          };
        }

        // Mark previous stages as completed
        const currentIndex = prev.findIndex((s) => s.id === currentProgress.stage);
        const stageIndex = prev.findIndex((s) => s.id === stage.id);

        if (stageIndex < currentIndex) {
          return {
            ...stage,
            status: 'completed' as const,
            progress: 100,
          };
        }

        return stage;
      });

      // Calculate overall progress based on the updated stages
      const totalStages = updatedStages.length;
      const currentStageIndex = updatedStages.findIndex((s) => s.id === currentProgress.stage);

      if (currentStageIndex === -1) {
        return updatedStages;
      }

      // Calculate: (completed stages + current stage progress) / total stages
      const currentStageProgress = currentProgress.percent / 100;
      const overall = ((currentStageIndex + currentStageProgress) / totalStages) * 100;
      setOverallProgress(Math.min(100, Math.max(0, Math.floor(overall))));

      return updatedStages;
    });
  }, [currentProgress, onComplete]);

  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const currentStage = stages.find((s) => s.status === 'processing');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (stage: ProcessStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl border border-border/50 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg">{videoName}</h2>
              {isCompleted ? (
                <Badge className="bg-green-500/10 text-green-500 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              ) : errorMessage ? (
                <Badge className="bg-destructive/10 text-destructive border-0">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              ) : (
                <Badge className="bg-blue-500/10 text-blue-500 border-0">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  Processing
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>
                  Stage {completedStages + (currentStage ? 1 : 0)} of {stages.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`${
                    processingMode === 'vision'
                      ? 'bg-indigo-500/10 text-indigo-500'
                      : 'bg-purple-500/10 text-purple-500'
                  } border-0 text-xs`}
                >
                  {processingMode === 'vision' ? (
                    <>
                      <Layout className="w-3 h-3 mr-1" />
                      Vision Mode
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 mr-1" />
                      Audio Mode
                    </>
                  )}
                </Badge>
              </div>
              {currentProgress?.agent_name && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/10 text-amber-500 border-0 text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    {currentProgress.agent_name}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-mono">{overallProgress}%</span>
          </div>
          <div className="relative overflow-hidden">
            <Progress value={overallProgress} className="h-3" />
            {!isCompleted && (
              <motion.div
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                style={{ width: '30%' }}
                animate={{
                  x: ['-100%', '300%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}
          </div>
        </div>

        {/* Current stage message */}
        {currentProgress?.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            {currentProgress.message}
          </motion.div>
        )}

        {/* ETA */}
        {currentProgress?.eta_seconds && (
          <div className="mt-2 text-xs text-muted-foreground">
            Estimated time remaining: {formatTime(currentProgress.eta_seconds)}
          </div>
        )}
      </motion.div>

      {/* Processing Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`glass-card rounded-xl border p-4 transition-all ${
              stage.status === 'processing'
                ? 'border-primary shadow-lg shadow-primary/10'
                : 'border-border/50'
            } ${stage.isParallel ? 'ring-2 ring-blue-500/20' : ''}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-lg ${stage.color} flex items-center justify-center flex-shrink-0`}
              >
                <stage.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm truncate">{stage.name}</h3>
                  {stage.isParallel && (
                    <Badge className="bg-blue-500/10 text-blue-500 border-0 text-[10px] px-1.5 py-0">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      Parallel
                    </Badge>
                  )}
                  {getStatusIcon(stage)}
                </div>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>
            </div>

            {stage.status !== 'pending' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {stage.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                  <span className="font-mono">{Math.floor(stage.progress)}%</span>
                </div>
                <Progress value={stage.progress} className="h-1.5" />
              </div>
            )}

            {stage.status === 'pending' && (
              <div className="text-xs text-muted-foreground">Waiting...</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-destructive mb-1">Processing Error</h3>
              <p className="text-xs text-destructive/80">{errorMessage}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
