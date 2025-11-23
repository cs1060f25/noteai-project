import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { createMemoryHistory, createRouter, RouterProvider, createRootRoute } from '@tanstack/react-router';

import { AgentOutputsDetailView } from '../../components/AgentOutputsDetailView';
// Mock axios to prevent network calls and support create()
vi.mock('axios', () => {
    const mockApi = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        patch: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    };
    return {
        default: {
            create: vi.fn(() => mockApi),
            ...mockApi
        },
        AxiosError: class extends Error {
            response: any;
            constructor(message?: string) {
                super(message);
                this.name = 'AxiosError';
            }
        }
    };
});

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({
        isSignedIn: true,
        user: {
            id: 'test-user',
            fullName: 'Test User',
        },
        isLoaded: true,
    }),
    useAuth: () => ({
        getToken: vi.fn().mockResolvedValue('test-token'),
        userId: 'test-user',
    }),
}));

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
            highlight_video: { url: 'http://example.com/highlight.mp4', s3_key: 'test-key' }
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
        // Create a root route that renders the component directly
        const rootRoute = createRootRoute({
            component: () => <AgentOutputsDetailView jobId="123" />
        });

        const router = createRouter({
            routeTree: rootRoute,
            history: createMemoryHistory(),
        });

        render(<RouterProvider router={router} />);

        // 1. Wait for the size control to appear
        const sizeControl = await screen.findByText(/Size:/i);
        expect(sizeControl).toBeInTheDocument();

        // 2. Check if player section exists
        const playerSection = screen.getByText(/Highlight Video/i);
        expect(playerSection).toBeInTheDocument();

        // 3. Check for buttons
        expect(screen.getByText('Compact')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Large')).toBeInTheDocument();
    });
});
