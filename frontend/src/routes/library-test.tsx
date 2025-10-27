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
  X,
  Upload
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
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getQualityBadge = (quality: Video['quality']) => {
    const colors = {
      high: 'bg-purple-100 text-purple-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[quality]}`}>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NOTEAI-85: Video Library Interface Test</h1>
          <p className="text-gray-600">
            Browse, search, and manage your lecture video collection
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Quality</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="uploadDate">Upload Date</option>
                <option value="title">Title</option>
                <option value="duration">Duration</option>
                <option value="views">Views</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>{filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} found</span>
            {selectedVideos.length > 0 && (
              <div className="flex items-center gap-2">
                <span>{selectedVideos.length} selected</span>
                <button
                  onClick={() => setSelectedVideos([])}
                  className="text-blue-600 hover:text-blue-700"
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
                bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow
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
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  {getStatusIcon(video.status)}
                  {getStatusBadge(video.status)}
                  {getQualityBadge(video.quality)}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
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
                  <span>{video.size}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {video.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    <Play className="w-3 h-3 inline mr-1" />
                    Watch
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">
                    <Download className="w-3 h-3" />
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video Preview Modal */}
        {previewVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{previewVideo.title}</h3>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <img
                  src={previewVideo.thumbnail}
                  alt={previewVideo.title}
                  className="w-full h-64 object-cover rounded mb-4"
                />
                <p className="text-gray-600 mb-4">{previewVideo.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Duration: {previewVideo.duration}</span>
                  <span>Views: {previewVideo.views}</span>
                  <span>Size: {previewVideo.size}</span>
                  <span>Uploaded: {formatDate(previewVideo.uploadDate)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Demo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">NOTEAI-85 Features Demonstrated:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time search across titles, descriptions, tags</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Advanced filtering by status and quality</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Dynamic sorting by multiple criteria</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Grid/List view toggle with responsive design</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Video preview modal with detailed information</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Batch selection with checkboxes and counters</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/library-test')({
  component: LibraryTestComponent,
});
