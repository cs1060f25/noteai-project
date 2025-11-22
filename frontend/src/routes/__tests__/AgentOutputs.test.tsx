import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { Route as AgentOutputsRoute } from '../_authenticated.agent-outputs';

// Mock the service calls
vi.mock('../../services/agentOutputsService', () => ({
  getClips: vi.fn().mockResolvedValue({
    clips: [
      {
        clip_id: 'clip_1',
        title: 'Test Clip',
        duration: 10,
        start_time: 0,
        end_time: 10,
        s3_key: 'test-key',
        thumbnail_url: 'http://example.com/thumb.jpg',
        url: 'http://example.com/video.mp4'
      }
    ]
  }),
  getTranscripts: vi.fn().mockResolvedValue(null),
  getSilenceRegions: vi.fn().mockResolvedValue(null),
  getContentSegments: vi.fn().mockResolvedValue(null),
  getLayoutAnalysis: vi.fn().mockResolvedValue(null),
  getProcessingLogs: vi.fn().mockResolvedValue({ logs: [] }),
}));

vi.mock('../../services/resultsService', () => ({
  getResults: vi.fn().mockResolvedValue({
    metadata: {
      highlight_video: { url: 'http://example.com/highlight.mp4' }
    }
  })
}));

vi.mock('../../services/uploadService', () => ({
  getJobStatus: vi.fn().mockResolvedValue({ status: 'completed', filename: 'test.mp4' })
}));

// Mock VideoPlayer component to avoid complex rendering
vi.mock('../../components/VideoPlayer', () => ({
  VideoPlayer: ({ className }: { className?: string }) => (
    <div data-testid="video-player" className={className}>Video Player</div>
  )
}));

describe('AgentOutputs View', () => {
  it('renders the video player with size controls', async () => {
    // Setup router for testing
    const rootRoute = createRootRoute();
    const agentOutputsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/agent-outputs',
      component: AgentOutputsRoute.component,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([agentOutputsRoute]),
      history: createMemoryHistory({ initialEntries: ['/agent-outputs?jobId=123'] }),
    });

    render(<RouterProvider router={router} />);

    // Wait for data loading (simplified for this test)
    // In a real scenario we might need waitFor, but let's check for the element
    // This is expected to FAIL because the player isn't there or doesn't have controls yet
    
    // 1. Check if player section exists
    const playerSection = await screen.findByText(/Highlight Video/i);
    expect(playerSection).toBeInTheDocument();

    // 2. Check for size controls (NOTEAI-158 requirement)
    // These buttons/selects don't exist yet
    const sizeControl = screen.queryByText(/Size/i); 
    expect(sizeControl).toBeInTheDocument(); // Should FAIL

    // 3. Check default size (assuming we want "Medium" or similar default)
    // This part depends on implementation, but let's assume we look for a specific class or style
    // For now, just failing on the control presence is enough to prove the feature is missing.
  });
});
