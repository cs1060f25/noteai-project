import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DashboardComponent } from './_authenticated.dashboard';

// mock axios for API calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// mock tanstack router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  createFileRoute: (_path: string) => (config: { component: React.ComponentType }) => config,
}));

describe('Dashboard Statistics Bug Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display real-time statistics from API instead of hardcoded values', async () => {
    // arrange: mock API response with specific values that differ from hardcoded values
    const mockJobsResponse = {
      data: {
        jobs: [],
        total: 42, // different from hardcoded '24'
      },
    };

    const mockJobsProcessingResponse = {
      data: {
        jobs: [],
        total: 5, // count of jobs with status 'running'
      },
    };

    const mockJobsCompletedResponse = {
      data: {
        jobs: [],
        total: 37, // count of jobs with status 'completed'
      },
    };

    // mock API calls
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/jobs') && url.includes('status=running')) {
        return Promise.resolve(mockJobsProcessingResponse);
      }
      if (url.includes('/api/jobs') && url.includes('status=completed')) {
        return Promise.resolve(mockJobsCompletedResponse);
      }
      if (url.includes('/api/jobs')) {
        return Promise.resolve(mockJobsResponse);
      }
      return Promise.reject(new Error('Unexpected API call'));
    });

    // act: render the dashboard component
    render(<DashboardComponent />);

    // assert: verify that API calls were made (this will fail if stats are hardcoded)
    await waitFor(
      () => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/jobs'),
          expect.any(Object)
        );
      },
      { timeout: 3000 }
    );

    // verify that the component displays values from API response, not hardcoded values
    await waitFor(
      () => {
        // the 'Total Videos' stat should show 42, not the hardcoded '24'
        const totalVideosValue = screen.getByText('42');
        expect(totalVideosValue).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        // the 'Processing' count should show 5
        const processingValue = screen.getByText('5');
        expect(processingValue).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        // the 'Completed' count should show 37
        const completedValue = screen.getByText('37');
        expect(completedValue).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // verify that hardcoded value '24' is NOT displayed (this will fail with current implementation)
    expect(screen.queryByText('24')).not.toBeInTheDocument();
  });

  it('should NOT display hardcoded statistics when component mounts', () => {
    // arrange: mock API that returns empty data
    mockedAxios.get.mockResolvedValue({
      data: {
        jobs: [],
        total: 0,
      },
    });

    // act: render the dashboard component
    render(<DashboardComponent />);

    // assert: hardcoded values should not be present
    // these assertions will fail with the current buggy implementation
    expect(screen.queryByText('24')).not.toBeInTheDocument(); // hardcoded 'Total Videos'
    expect(screen.queryByText('156')).not.toBeInTheDocument(); // hardcoded 'Clips Generated'
    expect(screen.queryByText('2.4h')).not.toBeInTheDocument(); // hardcoded 'Processing Time'
    expect(screen.queryByText('8.2K')).not.toBeInTheDocument(); // hardcoded 'Total Views'
  });

  it('should update statistics when API returns different values on re-fetch', async () => {
    // arrange: mock API with initial values
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        jobs: [],
        total: 10,
      },
    });

    // act: render the dashboard component
    const { rerender } = render(<DashboardComponent />);

    // wait for initial render
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // arrange: mock API with updated values
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        jobs: [],
        total: 15,
      },
    });

    // act: re-render component (simulating data refresh)
    rerender(<DashboardComponent />);

    // assert: component should display updated value from API
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    // old value should not be present
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('should handle API errors gracefully and not fall back to hardcoded values', async () => {
    // arrange: mock API that returns an error
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    // act: render the dashboard component
    render(<DashboardComponent />);

    // assert: should show error state or loading state, but NOT hardcoded values
    await waitFor(() => {
      // verify that hardcoded values are not displayed even when API fails
      expect(screen.queryByText('24')).not.toBeInTheDocument();
      expect(screen.queryByText('156')).not.toBeInTheDocument();
    });

    // should display some error indication or empty state
    // (exact implementation depends on error handling design)
  });
});
