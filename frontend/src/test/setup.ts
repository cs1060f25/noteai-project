import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
    user: null
  })),
  SignIn: vi.fn(() => null),
  SignUp: vi.fn(() => null),
  ClerkProvider: vi.fn(({ children }) => children),
  useAuth: vi.fn(() => ({
    isSignedIn: false,
    isLoaded: true
  }))
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: vi.fn(({ children, to, ...props }) => 
    React.createElement('a', { href: to, ...props }, children)
  ),
  Navigate: vi.fn(() => null),
  createFileRoute: vi.fn(() => ({
    component: vi.fn()
  })),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    navigate: vi.fn()
  }))
}))

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
})

// Mock IntersectionObserver
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

// Mock ResizeObserver
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})
