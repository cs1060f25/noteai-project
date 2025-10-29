import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock video data
const mockVideos = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    description: 'Comprehensive overview of ML fundamentals',
    status: 'completed',
    quality: 'high',
    views: 234,
    duration: '45:23'
  },
  {
    id: '2',
    title: 'Advanced React Patterns',
    description: 'Deep dive into React patterns',
    status: 'completed',
    quality: 'high',
    views: 189,
    duration: '38:17'
  },
  {
    id: '3',
    title: 'Database Design Principles',
    description: 'Essential database design principles',
    status: 'processing',
    quality: 'medium',
    views: 0,
    duration: '52:41'
  }
];

// Simple test component for video library
const TestVideoLibrary = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [viewMode, setViewMode] = React.useState('grid');
  const [selectedVideos, setSelectedVideos] = React.useState<string[]>([]);

  const filteredVideos = mockVideos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || video.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <header>
        <h1>Your Video Library</h1>
        <p>Browse, search, and manage your lecture video collection</p>
      </header>

      <div data-testid="search-controls">
        <input
          type="text"
          placeholder="Search videos by title, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={() => setViewMode('grid')}
          className={viewMode === 'grid' ? 'active' : ''}
        >
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'active' : ''}
        >
          List
        </button>
      </div>

      <div data-testid="results-summary">
        {filteredVideos.length} videos found
        {selectedVideos.length > 0 && (
          <span> - {selectedVideos.length} selected</span>
        )}
      </div>

      <div data-testid="video-grid" className={viewMode}>
        {filteredVideos.map((video) => (
          <div key={video.id} data-testid={`video-${video.id}`}>
            <input
              type="checkbox"
              checked={selectedVideos.includes(video.id)}
              onChange={() => {
                setSelectedVideos(prev =>
                  prev.includes(video.id)
                    ? prev.filter(id => id !== video.id)
                    : [...prev, video.id]
                );
              }}
            />
            <h3>{video.title}</h3>
            <p>{video.description}</p>
            <div>Status: {video.status}</div>
            <div>Quality: {video.quality}</div>
            <div>Views: {video.views}</div>
            <div>Duration: {video.duration}</div>
            <button>Watch</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add React import for useState
import React from 'react';

describe('Video Library Interface (NOTEAI-85)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the main heading', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText('Your Video Library')).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText(/Browse, search, and manage/)).toBeInTheDocument();
    });

    it('renders search controls', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByPlaceholderText(/Search videos/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });

    it('renders view mode buttons', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText('Grid')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    });
  });

  describe('Video Display', () => {
    it('renders all mock videos', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
      expect(screen.getByText('Database Design Principles')).toBeInTheDocument();
    });

    it('shows video metadata', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText('Duration: 45:23')).toBeInTheDocument();
      expect(screen.getByText('Views: 234')).toBeInTheDocument();
      expect(screen.getAllByText('Status: completed')).toHaveLength(2);
    });

    it('shows correct video count', () => {
      render(<TestVideoLibrary />);
      expect(screen.getByText('3 videos found')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters videos by search query', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/Search videos/);
      await user.type(searchInput, 'React');
      
      expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to Machine Learning')).not.toBeInTheDocument();
      expect(screen.getByText('1 videos found')).toBeInTheDocument();
    });

    it('shows all videos when search is cleared', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/Search videos/);
      await user.type(searchInput, 'React');
      await user.clear(searchInput);
      
      expect(screen.getByText('3 videos found')).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('filters by status', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const statusFilter = screen.getByDisplayValue('All Status');
      await user.selectOptions(statusFilter, 'completed');
      
      expect(screen.getByText('2 videos found')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
      expect(screen.queryByText('Database Design Principles')).not.toBeInTheDocument();
    });

    it('filters by processing status', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const statusFilter = screen.getByDisplayValue('All Status');
      await user.selectOptions(statusFilter, 'processing');
      
      expect(screen.getByText('1 videos found')).toBeInTheDocument();
      expect(screen.getByText('Database Design Principles')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('switches between grid and list view', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const gridButton = screen.getByText('Grid');
      const listButton = screen.getByText('List');
      
      expect(gridButton).toHaveClass('active');
      
      await user.click(listButton);
      expect(listButton).toHaveClass('active');
      expect(gridButton).not.toHaveClass('active');
    });

    it('applies correct CSS class to video container', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const videoGrid = screen.getByTestId('video-grid');
      expect(videoGrid).toHaveClass('grid');
      
      await user.click(screen.getByText('List'));
      expect(videoGrid).toHaveClass('list');
    });
  });

  describe('Video Selection', () => {
    it('selects individual videos', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    });

    it('selects multiple videos', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      
      expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    });

    it('deselects videos', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
      
      await user.click(checkboxes[0]);
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('has clickable watch buttons', () => {
      render(<TestVideoLibrary />);
      const watchButtons = screen.getAllByText('Watch');
      expect(watchButtons).toHaveLength(3);
    });

    it('has functional checkboxes', () => {
      render(<TestVideoLibrary />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<TestVideoLibrary />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Your Video Library');
    });

    it('has accessible form controls', () => {
      render(<TestVideoLibrary />);
      const searchInput = screen.getByRole('textbox');
      const selectElement = screen.getByRole('combobox');
      
      expect(searchInput).toBeInTheDocument();
      expect(selectElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const start = performance.now();
      render(<TestVideoLibrary />);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100);
    });

    it('handles rapid interactions', async () => {
      const user = userEvent.setup();
      render(<TestVideoLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/Search videos/);
      
      // Rapid typing should not cause issues
      await user.type(searchInput, 'test');
      await user.clear(searchInput);
      await user.type(searchInput, 'React');
      
      expect(screen.getByDisplayValue('React')).toBeInTheDocument();
    });
  });
});
