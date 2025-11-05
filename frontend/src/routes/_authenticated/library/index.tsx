import { useState } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Play,
  Clock,
  Calendar,
  Filter,
  SortAsc,
} from 'lucide-react';

import { ImageWithFallback } from '@/components/ImageWithFallback';
import * as badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockLectures = [
  {
    id: 1,
    title: 'Introduction to Machine Learning',
    date: 'Nov 3, 2025',
    duration: '1:24:30',
    status: 'completed',
    clipsGenerated: 12,
    thumbnail:
      'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWN0dXJlJTIwaGFsbCUyMG1vZGVybnxlbnwxfHx8fDE3NjIzMDQwNDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: 2,
    title: 'Advanced Calculus - Derivatives',
    date: 'Nov 2, 2025',
    duration: '55:12',
    status: 'processing',
    clipsGenerated: 0,
    thumbnail:
      'https://images.unsplash.com/photo-1575320854760-bfffc3550640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMGVkaXRpbmclMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzYyMjcyMDM1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: 3,
    title: 'Organic Chemistry Fundamentals',
    date: 'Nov 1, 2025',
    duration: '1:15:45',
    status: 'completed',
    clipsGenerated: 8,
    thumbnail:
      'https://images.unsplash.com/photo-1758874573116-2bc02232eef1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGVhcm5pbmclMjBvbmxpbmV8ZW58MXx8fHwxNzYyMjM2MzgzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: 4,
    title: 'World History - Industrial Revolution',
    date: 'Oct 30, 2025',
    duration: '48:22',
    status: 'completed',
    clipsGenerated: 6,
    thumbnail:
      'https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWN0dXJlJTIwaGFsbCUyMG1vZGVybnxlbnwxfHx8fDE3NjIzMDQwNDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: 5,
    title: 'Quantum Physics Basics',
    date: 'Oct 28, 2025',
    duration: '1:32:15',
    status: 'failed',
    clipsGenerated: 0,
    thumbnail:
      'https://images.unsplash.com/photo-1575320854760-bfffc3550640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMGVkaXRpbmclMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzYyMjcyMDM1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: 6,
    title: 'Introduction to Philosophy',
    date: 'Oct 27, 2025',
    duration: '1:05:33',
    status: 'completed',
    clipsGenerated: 9,
    thumbnail:
      'https://images.unsplash.com/photo-1758874573116-2bc02232eef1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGVhcm5pbmclMjBvbmxpbmV8ZW58MXx8fHwxNzYyMjM2MzgzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
];

export function LibraryPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  const handleLectureClick = (lectureId: number) => {
    navigate({ to: '/library/$lectureId', params: { lectureId: String(lectureId) } });
  };

  let filteredLectures = mockLectures.filter((lecture) => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lecture.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort lectures
  filteredLectures = [...filteredLectures].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'clips-desc':
        return b.clipsGenerated - a.clipsGenerated;
      default:
        return 0;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <badge.Badge className="bg-primary/10 text-primary border-0">Completed</badge.Badge>;
      case 'processing':
        return (
          <badge.Badge className="bg-blue-500/10 text-blue-500 border-0">Processing</badge.Badge>
        );
      case 'failed':
        return (
          <badge.Badge variant="destructive" className="bg-destructive/10 border-0">
            Failed
          </badge.Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold">Library</h1>
        <p className="text-muted-foreground">Manage your uploaded lectures and generated clips</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-card border-border/50"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
                <SelectItem value="clips-desc">Most Clips</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'glass-button' : 'glass-card'}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'glass-button' : 'glass-card'}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredLectures.length} videos</span>
          <span>•</span>
          <span>{filteredLectures.filter((l) => l.status === 'completed').length} completed</span>
          <span>•</span>
          <span>{filteredLectures.reduce((acc, l) => acc + l.clipsGenerated, 0)} total clips</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filteredLectures.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">No videos found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Upload your first lecture to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="glass-button bg-primary">Upload Your First Video</Button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lecture) => (
              <div
                key={lecture.id}
                className="glass-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => lecture.status === 'completed' && handleLectureClick(lecture.id)}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <ImageWithFallback
                    src={lecture.thumbnail}
                    alt={lecture.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {lecture.status === 'completed' && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-black ml-1" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">{getStatusBadge(lecture.status)}</div>
                </div>
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-1">{lecture.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{lecture.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{lecture.duration}</span>
                    </div>
                  </div>
                  {lecture.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                      {lecture.clipsGenerated} clips generated
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLectures.map((lecture) => (
              <div
                key={lecture.id}
                className="glass-card rounded-lg border border-border/50 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => lecture.status === 'completed' && handleLectureClick(lecture.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <ImageWithFallback
                      src={lecture.thumbnail}
                      alt={lecture.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{lecture.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{lecture.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{lecture.duration}</span>
                      </div>
                      {lecture.status === 'completed' && (
                        <span>{lecture.clipsGenerated} clips</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(lecture.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-accent">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reprocess</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/library/')({
  component: LibraryPage,
});
