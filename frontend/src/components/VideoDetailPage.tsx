import { useState } from 'react';

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
  BookOpen,
  BarChart3,
  Clock,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { ImageWithFallback } from './ImageWithFallback';

interface VideoDetailPageProps {
  lectureId: number;
  onBack: () => void;
}

const mockLecture = {
  id: 1,
  title: 'Introduction to Machine Learning',
  description:
    'A comprehensive introduction to machine learning concepts, algorithms, and practical applications.',
  date: 'Nov 3, 2025',
  duration: '1:24:30',
  status: 'completed',
  clipsGenerated: 12,
  views: 234,
  thumbnail:
    'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWN0dXJlJTIwaGFsbCUyMG1vZGVybnxlbnwxfHx8fDE3NjIzMDQwNDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  tags: ['Machine Learning', 'AI', 'Data Science'],
  processingTime: '3m 24s',
};

const mockClips = [
  {
    id: 1,
    title: 'What is Machine Learning?',
    duration: '2:45',
    thumbnail: 'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7',
    views: 89,
    description: 'Introduction to core ML concepts',
  },
  {
    id: 2,
    title: 'Supervised vs Unsupervised Learning',
    duration: '3:12',
    thumbnail: 'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7',
    views: 76,
    description: 'Key differences explained',
  },
  {
    id: 3,
    title: 'Neural Networks Basics',
    duration: '4:30',
    thumbnail: 'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7',
    views: 102,
    description: 'Understanding neural network architecture',
  },
  {
    id: 4,
    title: 'Training Models',
    duration: '3:45',
    thumbnail: 'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7',
    views: 65,
    description: 'How to train your first model',
  },
];

export function VideoDetailPage({ lectureId: _lectureId, onBack }: VideoDetailPageProps) {
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);

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
      description: 'Get a concise text or video summary',
      icon: FileText,
      color: 'bg-green-500',
      onClick: () => setSummaryDialogOpen(true),
    },
    {
      id: 'social',
      title: 'Social Media Posts',
      description: 'Generate posts for Twitter, LinkedIn, etc.',
      icon: MessageSquare,
      color: 'bg-pink-500',
      onClick: () => setSocialDialogOpen(true),
    },
    {
      id: 'study',
      title: 'Study Guide',
      description: 'Create comprehensive study materials',
      icon: BookOpen,
      color: 'bg-orange-500',
      onClick: () => toast.success('Study guide generation started!'),
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
            {/* Video Thumbnail */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="relative aspect-video rounded-xl overflow-hidden glass-card border border-border/50 group">
                <ImageWithFallback
                  src={mockLecture.thumbnail}
                  alt={mockLecture.title}
                  className="w-full h-full object-cover"
                />
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
                  <h1 className="mb-2">{mockLecture.title}</h1>
                  <p className="text-muted-foreground mb-3">{mockLecture.description}</p>
                </div>
                <Badge className="bg-green-500/10 text-green-500 border-0">Completed</Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {mockLecture.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="glass-card">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Duration</span>
                  </div>
                  <div className="text-sm">{mockLecture.duration}</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Clips</span>
                  </div>
                  <div className="text-sm">{mockLecture.clipsGenerated} generated</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Eye className="w-4 h-4" />
                    <span>Views</span>
                  </div>
                  <div className="text-sm">{mockLecture.views}</div>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Uploaded</span>
                  </div>
                  <div className="text-sm">{mockLecture.date}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="glass-button bg-primary">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Full Video
                </Button>
                <Button variant="outline" className="glass-card">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="glass-card">
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
          <TabsList className="glass-card border border-border/50 mb-6">
            <TabsTrigger value="clips">Clips ({mockClips.length})</TabsTrigger>
            <TabsTrigger value="ai-features">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Features
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Clips Tab */}
          <TabsContent value="clips">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockClips.map((clip, index) => (
                <motion.div
                  key={clip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="relative aspect-video bg-muted">
                    <ImageWithFallback
                      src={clip.thumbnail}
                      alt={clip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-black ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                        {clip.duration}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm mb-1 line-clamp-1">{clip.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {clip.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{clip.views} views</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="flex-1 glass-card">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="glass-card">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="glass-card text-destructive">
                        <Trash2 className="w-3 h-3" />
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

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <div>
                <h2 className="mb-2">Performance Analytics</h2>
                <p className="text-muted-foreground mb-6">
                  Track engagement and performance metrics
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm">Total Views</h3>
                  </div>
                  <p className="text-3xl mb-1">{mockLecture.views}</p>
                  <p className="text-xs text-muted-foreground">Across all clips</p>
                </div>

                <div className="glass-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    <h3 className="text-sm">Watch Time</h3>
                  </div>
                  <p className="text-3xl mb-1">12.4h</p>
                  <p className="text-xs text-muted-foreground">Cumulative time</p>
                </div>

                <div className="glass-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm">Engagement</h3>
                  </div>
                  <p className="text-3xl mb-1">87%</p>
                  <p className="text-xs text-muted-foreground">Average completion</p>
                </div>
              </div>

              <div className="glass-card rounded-xl border border-border/50 p-6">
                <h3 className="text-sm mb-4">Clip Performance</h3>
                <div className="space-y-4">
                  {mockClips.slice(0, 3).map((clip) => (
                    <div key={clip.id}>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="truncate mr-4">{clip.title}</span>
                        <span className="text-muted-foreground">{clip.views} views</span>
                      </div>
                      <Progress value={(clip.views / mockLecture.views) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="mb-2">Video Settings</h2>
                <p className="text-muted-foreground mb-6">Manage settings for this video</p>
              </div>

              <div className="glass-card rounded-xl border border-border/50 p-6 space-y-4">
                <div>
                  <Label>Video Title</Label>
                  <input
                    type="text"
                    defaultValue={mockLecture.title}
                    className="w-full mt-2 px-3 py-2 bg-background border border-border/50 rounded-lg"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea defaultValue={mockLecture.description} className="mt-2" rows={4} />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" className="glass-card text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Video
                  </Button>
                  <Button className="ml-auto glass-button bg-primary">Save Changes</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Podcast Dialog */}
      <Dialog open={podcastDialogOpen} onOpenChange={setPodcastDialogOpen}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create AI Podcast</DialogTitle>
            <DialogDescription>
              Generate an audio podcast with AI narration from your video clips
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Voice Style</Label>
              <Select defaultValue="professional">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="professional">Professional Male</SelectItem>
                  <SelectItem value="friendly">Friendly Female</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="calm">Calm & Soothing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Background Music</Label>
              <Select defaultValue="none">
                <SelectTrigger className="mt-2 glass-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="ambient">Ambient</SelectItem>
                  <SelectItem value="upbeat">Upbeat</SelectItem>
                  <SelectItem value="classical">Classical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Include Clips</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select which clips to include in the podcast
              </p>
              <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                {mockClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
                  >
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm flex-1">{clip.title}</span>
                    <span className="text-xs text-muted-foreground">{clip.duration}</span>
                  </div>
                ))}
              </div>
            </div>

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
                onClick={() => {
                  setPodcastDialogOpen(false);
                  toast.success("Podcast generation started! You'll be notified when ready.");
                }}
              >
                <Mic className="w-4 h-4 mr-2" />
                Generate Podcast
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
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glass-button bg-blue-500 hover:bg-blue-600"
                onClick={() => {
                  setQuizDialogOpen(false);
                  toast.success("Quiz generation started! You'll be notified when ready.");
                }}
              >
                <Brain className="w-4 h-4 mr-2" />
                Generate Quiz
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
    </div>
  );
}
