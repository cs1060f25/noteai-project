import { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { 
  Search, 
  Grid3X3, 
  List, 
  Play, 
  Download, 
  Share2, 
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  X
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  uploadDate: string;
  status: 'processing' | 'completed' | 'failed';
  quality: 'high' | 'medium' | 'low';
  views: number;
  size: string;
  tags: string[];
}

const LibraryTestComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('uploadDate');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Mock video data
  const [videos] = useState<Video[]>([
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      description: 'Comprehensive overview of ML fundamentals and applications',
      thumbnail: 'https://via.placeholder.com/320x180/4F46E5/white?text=ML+Intro',
      duration: '45:23',
      uploadDate: '2024-01-15',
      status: 'completed',
      quality: 'high',
      views: 234,
      size: '1.2 GB',
      tags: ['machine-learning', 'ai', 'fundamentals']
    },
    {
      id: '2',
      title: 'Advanced React Patterns',
      description: 'Deep dive into advanced React patterns and best practices',
      thumbnail: 'https://via.placeholder.com/320x180/059669/white?text=React+Advanced',
      duration: '38:17',
      uploadDate: '2024-01-12',
      status: 'completed',
      quality: 'high',
      views: 189,
      size: '890 MB',
      tags: ['react', 'javascript', 'frontend']
    },
    {
      id: '3',
      title: 'Database Design Principles',
      description: 'Essential principles for designing scalable databases',
      thumbnail: 'https://via.placeholder.com/320x180/DC2626/white?text=Database+Design',
      duration: '52:41',
      uploadDate: '2024-01-10',
      status: 'processing',
      quality: 'medium',
      views: 0,
      size: '1.5 GB',
      tags: ['database', 'sql', 'design']
    },
    {
      id: '4',
      title: 'Python Data Analysis',
      description: 'Complete guide to data analysis using Python and pandas',
      thumbnail: 'https://via.placeholder.com/320x180/7C3AED/white?text=Python+Data',
      duration: '41:55',
      uploadDate: '2024-01-08',
      status: 'completed',
      quality: 'high',
      views: 156,
      size: '1.1 GB',
      tags: ['python', 'data-analysis', 'pandas']
    },
    {
      id: '5',
      title: 'Web Security Fundamentals',
      description: 'Understanding common web vulnerabilities and security measures',
      thumbnail: 'https://via.placeholder.com/320x180/EA580C/white?text=Web+Security',
      duration: '36:29',
      uploadDate: '2024-01-05',
      status: 'failed',
      quality: 'medium',
      views: 0,
      size: '780 MB',
      tags: ['security', 'web', 'cybersecurity']
    },
    {
      id: '6',
      title: 'Cloud Architecture Patterns',
      description: 'Modern cloud architecture patterns and microservices',
      thumbnail: 'https://via.placeholder.com/320x180/0891B2/white?text=Cloud+Architecture',
      duration: '49:12',
      uploadDate: '2024-01-03',
      status: 'completed',
      quality: 'high',
      views: 298,
      size: '1.3 GB',
      tags: ['cloud', 'architecture', 'microservices']
    }
  ]);

  // Filtered and sorted videos
  const filteredVideos = useMemo(() => {
    let filtered = videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'all' || video.status === selectedStatus;
      const matchesQuality = selectedQuality === 'all' || video.quality === selectedQuality;
      
      return matchesSearch && matchesStatus && matchesQuality;
    });

    // Sort videos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return a.duration.localeCompare(b.duration);
        case 'views':
          return b.views - a.views;
        case 'uploadDate':
        default:
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
    });

    return filtered;
  }, [videos, searchQuery, selectedStatus, selectedQuality, sortBy]);

  const getStatusIcon = (status: Video['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: Video['status']) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-300 border-green-500/30',
      processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      failed: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getQualityBadge = (quality: Video['quality']) => {
    const colors = {
      high: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      low: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[quality]}`}>
        {quality.toUpperCase()}
      </span>
    );
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full mb-6">
            <span className="text-sm font-medium text-blue-300">🎬 NOTEAI-85: Video Library Interface</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your Video <span className="text-blue-400">Library</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Browse, search, and manage your lecture video collection with powerful AI-driven insights
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  placeholder="Search videos by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all" className="text-gray-900">All Status</option>
                <option value="completed" className="text-gray-900">Completed</option>
                <option value="processing" className="text-gray-900">Processing</option>
                <option value="failed" className="text-gray-900">Failed</option>
              </select>

              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all" className="text-gray-900">All Quality</option>
                <option value="high" className="text-gray-900">High</option>
                <option value="medium" className="text-gray-900">Medium</option>
                <option value="low" className="text-gray-900">Low</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="uploadDate" className="text-gray-900">Upload Date</option>
                <option value="title" className="text-gray-900">Title</option>
                <option value="duration" className="text-gray-900">Duration</option>
                <option value="views" className="text-gray-900">Views</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex border border-white/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-3 transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-3 transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-6 flex items-center justify-between text-sm text-gray-300">
            <span className="font-medium">{filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} found</span>
            {selectedVideos.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-blue-300 font-medium">{selectedVideos.length} selected</span>
                <button
                  onClick={() => setSelectedVideos([])}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Grid/List */}
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }
        `}>
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className={`
                bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:scale-105 transition-all duration-300 hover:bg-white/15
                ${viewMode === 'list' ? 'flex' : ''}
              `}
            >
              {/* Thumbnail */}
              <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className={`w-full object-cover ${viewMode === 'list' ? 'h-28' : 'h-48'}`}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setPreviewVideo(video)}
                    className="opacity-0 hover:opacity-100 transition-opacity bg-white bg-opacity-90 rounded-full p-3"
                  >
                    <Play className="w-6 h-6 text-gray-900" />
                  </button>
                </div>
                <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                  {video.duration}
                </div>
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedVideos.includes(video.id)}
                    onChange={() => toggleVideoSelection(video.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white text-lg line-clamp-2">{video.title}</h3>
                  <button className="text-gray-300 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-300 mb-4 line-clamp-2">{video.description}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  {getStatusIcon(video.status)}
                  {getStatusBadge(video.status)}
                  {getQualityBadge(video.quality)}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(video.uploadDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.views} views
                    </span>
                  </div>
                  <span className="text-gray-300">{video.size}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {video.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all duration-300 hover:scale-105 font-medium">
                    <Play className="w-3 h-3 inline mr-2" />
                    Watch
                  </button>
                  <button className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-sm hover:bg-white/30 transition-colors text-white">
                    <Download className="w-3 h-3" />
                  </button>
                  <button className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-sm hover:bg-white/30 transition-colors text-white">
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video Preview Modal */}
        {previewVideo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-sm border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-white">{previewVideo.title}</h3>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <img
                  src={previewVideo.thumbnail}
                  alt={previewVideo.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
                <p className="text-gray-300 mb-6 text-lg">{previewVideo.description}</p>
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Duration: {previewVideo.duration}
                  </span>
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Views: {previewVideo.views}
                  </span>
                  <span>Size: {previewVideo.size}</span>
                  <span>Uploaded: {formatDate(previewVideo.uploadDate)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export const Route = createFileRoute('/library-test')({
  component: LibraryTestComponent,
});
