import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
  })),
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: vi.fn(({ children, to, className, ...props }: any) => {
    return {
      type: 'a',
      props: { href: to, className, ...props, children }
    };
  }),
  Navigate: vi.fn(({ to }: { to: string }) => {
    return {
      type: 'div',
      props: { 'data-testid': 'navigate', 'data-to': to }
    };
  }),
  createFileRoute: vi.fn(() => ({
    component: vi.fn(),
  })),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
