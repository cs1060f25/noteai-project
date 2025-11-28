import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Play,
  Download,
  Share2,
  Sparkles,
  FileText,
  Mic,
  Brain,
  MessageSquare,
  Clock,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobDetails, useJobResults } from '@/hooks/useAppQueries';
import { generatePodcast, getPodcastUrl } from '@/services/uploadService';
import { api } from '@/types/api';
import type { ClipMetadata, QuizQuestion } from '@/types/api';

import { ImageWithFallback } from './ImageWithFallback';
import { QuizPage } from './QuizPage';
import { VideoPlayer } from './VideoPlayer';
import { ResultsError } from '../services/resultsService';

interface VideoDetailPageProps {
  lectureId: string;
  onBack: () => void;
  initialQuizId?: string;
}

// Helper function to format duration from seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function VideoDetailPage({ lectureId, onBack, initialQuizId }: VideoDetailPageProps) {
  const { data: results, isLoading: loading, error: queryError } = useJobResults(lectureId);
  const [error, setError] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<ClipMetadata | null>(null);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);

  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [numSpeakers, setNumSpeakers] = useState<1 | 2>(2);
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Puck');

  const voiceOptions = [
    'Zephyr',
    'Puck',
    'Charon',
    'Kore',
    'Fenrir',
    'Leda',
    'Orus',
    'Aoede',
    'Callirrhoe',
    'Autonoe',
    'Enceladus',
    'Iapetus',
    'Umbriel',
    'Algieba',
    'Despina',
    'Erinome',
    'Algenib',
    'Rasalgethi',
    'Laomedeia',
    'Achernar',
    'Alnilam',
    'Schedar',
    'Gacrux',
    'Pulcherrima',
    'Achird',
    'Zubenelgenubi',
    'Vindemiatrix',
    'Sadachbia',
    'Sadaltager',
    'Sulafat',
  ];

  const { data: job } = useJobDetails(lectureId);
  const { data: podcastData } = useQuery({
    queryKey: ['podcast', lectureId],
    queryFn: () => getPodcastUrl(lectureId),
    enabled: !!job && job.podcast_status === 'completed',
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleGeneratePodcast = async () => {
    try {
      setIsGeneratingPodcast(true);
      await generatePodcast(lectureId, { numSpeakers, voice1, voice2 });
      toast.success('Podcast generation started', {
        description:
          'We will notify you via email when it is ready. You can also find it in "My Content".',
        action: {
          label: 'View Content',
          onClick: () => navigate({ to: '/content' }),
        },
      });
      setPodcastDialogOpen(false);
      // Invalidate job details to show processing status
      queryClient.invalidateQueries({ queryKey: ['jobs', lectureId] });
    } catch (error) {
      toast.error('Failed to start podcast generation');
      console.error(error);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  // ... (inside render)

  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const handleGenerateQuiz = async () => {
    try {
      setIsGeneratingQuiz(true);
      // Get values from select inputs (using defaults for now as they are not controlled)
      const numQuestions = 5;
      const difficulty = 'medium';

      const response = await api.generateQuiz(lectureId, numQuestions, difficulty);
      setQuizQuestions(response.questions);

      setQuizDialogOpen(false);
      setIsQuizActive(true);
      toast.success('Quiz generated successfully!', {
        action: {
          label: 'View Content',
          onClick: () => navigate({ to: '/content' }),
        },
      });
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  useEffect(() => {
    if (queryError) {
      if (queryError instanceof ResultsError) {
        // Handle specific error codes
        if (queryError.code === 'JOB_NOT_FOUND') {
          setError('Video not found');
        } else if (queryError.code === 'JOB_NOT_COMPLETED') {
          setError('Your video is still being processed. Check back soon!');
        } else if (queryError.code === 'FORBIDDEN') {
          setError("You don't have access to this video");
        } else {
          setError(queryError.message);
        }
      } else {
        setError('Failed to load video details. Please try again.');
      }
    } else {
      setError(null);
    }
  }, [queryError]);

  // Fetch quiz if initialQuizId is provided
  useEffect(() => {
    const fetchQuiz = async () => {
      if (initialQuizId) {
        try {
          const quizResponse = await api.getQuiz(initialQuizId);
          setQuizQuestions(quizResponse.questions);
          setIsQuizActive(true);
        } catch (error) {
          console.error('Failed to fetch quiz:', error);
          toast.error('Failed to load quiz');
        }
      }
    };

    if (initialQuizId) {
      fetchQuiz();
    }
  }, [initialQuizId]);

  const handleClipClick = (clip: ClipMetadata) => {
    if (!clip.url) {
      toast.error('Video URL not available. Please try again later.');
      return;
    }
    setSelectedClip(clip);
    setVideoPlayerOpen(true);
  };

  const handleWatchFullVideo = () => {
    // Prefer highlight video (compiled clips), fall back to original
    const highlightVideo = results?.metadata?.highlight_video;
    const originalVideo = results?.metadata?.original_video;

    const videoToPlay = highlightVideo?.url ? highlightVideo : originalVideo;

    if (!videoToPlay?.url) {
      toast.error('Video not available. Please try again later.');
      return;
    }

    // Create a special clip object for the full video
    const fullVideoClip: ClipMetadata = {
      clip_id: highlightVideo ? 'highlight' : 'original',
      title: highlightVideo ? 'Highlight Reel' : originalVideo?.filename || 'Original Video',
      start_time: 0,
      end_time: originalVideo?.duration || 0,
      duration: originalVideo?.duration || 0,
      s3_key: videoToPlay.s3_key,
      url: videoToPlay.url,
      thumbnail_url: null,
      subtitle_url: null,
    };
    setSelectedClip(fullVideoClip);
    setVideoPlayerOpen(true);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const aiFeatures = [
    {
      id: 'podcast',
      title: 'Create Podcast',
      description: 'Generate an AI-narrated podcast from your clips',
      icon: Mic,
      color: 'bg-purple-500',
      onClick: () => setPodcastDialogOpen(true),
    },
    {
      id: 'quiz',
      title: 'Generate Quiz',
      description: 'Auto-create questions to test understanding',
      icon: Brain,
      color: 'bg-blue-500',
      onClick: () => setQuizDialogOpen(true),
    },
    {
      id: 'summary',
      title: 'Create Summary',
      description: 'Get a concise text summary',
      icon: FileText,
      color: 'bg-green-500',
      onClick: () => setSummaryDialogOpen(true),
    },
    {
      id: 'transcript',
      title: 'Export Transcript',
      description: 'Download full transcript with timestamps',
      icon: FileText,
      color: 'bg-cyan-500',
      onClick: () => toast.success('Transcript exported!'),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading video details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass-card rounded-xl border border-border/50 p-8 max-w-md text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl mb-2">Unable to Load Video</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={onBack} variant="outline" className="glass-card">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Library
                </Button>
                <Button onClick={handleRetry} className="glass-button bg-primary">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no clips)
  if (!results || results.clips.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass-card rounded-xl border border-border/50 p-8 max-w-md text-center">
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl mb-2">No Clips Generated</h2>
              <p className="text-muted-foreground mb-6">
                This video doesn't have any clips yet. The processing may still be in progress.
              </p>
              <Button onClick={onBack} variant="outline" className="glass-card">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const clips = results.clips;

  if (isQuizActive) {
    return (
      <QuizPage
        onBack={() => setIsQuizActive(false)}
        lectureTitle={results.metadata?.title || 'Video Lecture'}
        questions={quizQuestions}
      />
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border/50 glass-header">
        <div className="max-w-7xl mx-auto p-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Video Thumbnail - Use first clip's thumbnail if available */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div
                className="relative aspect-video rounded-xl overflow-hidden glass-card border border-border/50 group cursor-pointer"
                onClick={handleWatchFullVideo}
              >
                {clips[0]?.thumbnail_url ? (
                  <ImageWithFallback
                    src={clips[0].thumbnail_url}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-8 h-8 text-black ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="mb-2">{job?.filename || 'Video Lecture'}</h1>
                  <p className="text-muted-foreground mb-3">
                    Processed video with {clips.length} highlight{clips.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge className="bg-green-500/10 text-green-500 border-0">Completed</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Clips</span>
                  </div>
                  <div className="text-sm">{clips.length} generated</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Total Duration</span>
                  </div>
                  <div className="text-sm">
                    {formatDuration(clips.reduce((sum, clip) => sum + clip.duration, 0))}
                  </div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    <span>Transcript</span>
                  </div>
                  <div className="text-sm">{results.transcript ? 'Available' : 'N/A'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="glass-button bg-primary flex-1 sm:flex-none"
                  onClick={handleWatchFullVideo}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Full Video
                </Button>
                <Button
                  variant="outline"
                  className="glass-card flex-1 sm:flex-none"
                  onClick={() => {
                    const originalVideo = results?.metadata?.original_video;
                    if (originalVideo?.url) {
                      window.open(originalVideo.url, '_blank');
                    } else {
                      toast.error('Download URL not available');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="glass-card flex-1 sm:flex-none"
                  onClick={() => {
                    const originalVideo = results?.metadata?.original_video;
                    if (originalVideo?.url) {
                      navigator.clipboard.writeText(originalVideo.url);
                      toast.success('Link copied to clipboard!');
                    } else {
                      toast.error('Share URL not available');
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="clips" className="w-full">
          <div className="overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:pb-0">
            <TabsList className="glass-card border border-border/50 mb-6 w-full justify-start sm:justify-center min-w-max">
              <TabsTrigger value="clips">Clips ({clips.length})</TabsTrigger>
              <TabsTrigger value="ai-features">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Features
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Clips Tab */}
          <TabsContent value="clips">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip, index) => (
                <motion.div
                  key={clip.clip_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                  onClick={() => handleClipClick(clip)}
                >
                  <div className="relative aspect-video bg-muted">
                    {clip.thumbnail_url ? (
                      <ImageWithFallback
                        src={clip.thumbnail_url}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-black ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                        {formatDuration(clip.duration)}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm mb-1 line-clamp-1">{clip.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDuration(clip.start_time)} - {formatDuration(clip.end_time)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 glass-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (clip.url) {
                            window.open(clip.url, '_blank');
                          } else {
                            toast.error('Download URL not available');
                          }
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* AI Features Tab */}
          <TabsContent value="ai-features">
            <div className="space-y-6">
              <div>
                <h2 className="mb-2">AI-Powered Features</h2>
                <p className="text-muted-foreground mb-6">
                  Transform your lecture into various formats using AI
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiFeatures.map((feature, index) => (
                  <motion.button
                    key={feature.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={feature.onClick}
                    className="glass-card rounded-xl border border-border/50 p-6 hover:border-primary/20 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center`}
                      >
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-sm mb-2">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Podcast Dialog */}
      <Dialog open={podcastDialogOpen} onOpenChange={setPodcastDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Podcast</DialogTitle>
            <DialogDescription>
              Create an engaging audio summary of this lecture using AI voices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Number of Speakers</Label>
              <Select
                value={numSpeakers.toString()}
                onValueChange={(v) => setNumSpeakers(parseInt(v) as 1 | 2)}
              >
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="1">1 Speaker (Monologue)</SelectItem>
                  <SelectItem value="2">2 Speakers (Dialogue)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Host Voice {numSpeakers === 2 && '(Speaker 1)'}</Label>
              <Select value={voice1} onValueChange={setVoice1}>
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50 max-h-[200px]">
                  {voiceOptions.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {numSpeakers === 2 && (
              <div>
                <Label>Expert Voice (Speaker 2)</Label>
                <Select value={voice2} onValueChange={setVoice2}>
                  <SelectTrigger className="mt-2 glass-card border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50 max-h-[200px]">
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPodcastDialogOpen(false)}
                className="glass-card"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glass-button bg-purple-500 hover:bg-purple-600"
                onClick={handleGeneratePodcast}
                disabled={isGeneratingPodcast}
              >
                {isGeneratingPodcast ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Generate Podcast
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Quiz</DialogTitle>
            <DialogDescription>
              Create an interactive quiz based on your lecture content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Number of Questions</Label>
              <Select defaultValue="10">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                  <SelectItem value="20">20 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty Level</Label>
              <Select defaultValue="medium">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Question Types</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Multiple Choice</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">True/False</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Short Answer</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setQuizDialogOpen(false)}
                className="glass-card"
                disabled={isGeneratingQuiz}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glass-button bg-blue-500 hover:bg-blue-600"
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz}
              >
                {isGeneratingQuiz ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Start Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Summary</DialogTitle>
            <DialogDescription>Generate a concise summary of your lecture</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Summary Type</Label>
              <Select defaultValue="text">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="text">Text Summary</SelectItem>
                  <SelectItem value="bullet">Bullet Points</SelectItem>
                  <SelectItem value="video">Video Summary</SelectItem>
                  <SelectItem value="infographic">Infographic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Length</Label>
              <Select defaultValue="medium">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="brief">Brief (100-200 words)</SelectItem>
                  <SelectItem value="medium">Medium (300-500 words)</SelectItem>
                  <SelectItem value="detailed">Detailed (500+ words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSummaryDialogOpen(false)}
                className="glass-card"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glass-button bg-green-500 hover:bg-green-600"
                onClick={() => {
                  setSummaryDialogOpen(false);
                  toast.success("Summary generation started! You'll be notified when ready.");
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Summary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Media Dialog */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Social Media Posts</DialogTitle>
            <DialogDescription>
              Create engaging posts for your social media platforms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Platforms</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Twitter / X</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">LinkedIn</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Facebook</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Instagram</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Tone</Label>
              <Select defaultValue="professional">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="engaging">Engaging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSocialDialogOpen(false)}
                className="glass-card"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glass-button bg-pink-500 hover:bg-pink-600"
                onClick={() => {
                  setSocialDialogOpen(false);
                  toast.success('Social media posts generated! Check your downloads.');
                }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Generate Posts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={videoPlayerOpen} onOpenChange={setVideoPlayerOpen}>
        <DialogContent className="glass-card border-border/50 sm:max-w-7xl w-full p-0 max-h-[90vh] overflow-y-auto">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/70 hover:bg-black/90 text-white rounded-full"
              onClick={() => setVideoPlayerOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Video Player */}
            {selectedClip && selectedClip.url && (
              <div className="rounded-lg overflow-hidden">
                <VideoPlayer
                  videoKey={selectedClip.s3_key}
                  subtitleUrl={selectedClip.subtitle_url}
                />
                <div className="p-6 bg-background/95 backdrop-blur-sm border-t border-border/50">
                  <h2 className="text-xl mb-2">{selectedClip.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Duration: {formatDuration(selectedClip.duration)}</span>
                    <span>•</span>
                    <span>
                      {formatDuration(selectedClip.start_time)} -{' '}
                      {formatDuration(selectedClip.end_time)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="glass-card"
                      onClick={() => {
                        if (selectedClip.url) {
                          window.open(selectedClip.url, '_blank');
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="glass-card"
                      onClick={() => {
                        if (selectedClip.url) {
                          navigator.clipboard.writeText(selectedClip.url);
                          toast.success('Link copied to clipboard!');
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
