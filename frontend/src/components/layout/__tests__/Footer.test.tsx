import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterProvider, createRootRoute } from '@tanstack/react-router';
import { Footer } from '../Footer';

// Mock Link to avoid router context issues
vi.mock('@tanstack/react-router', async () => {
    const actual = await vi.importActual('@tanstack/react-router');
    return {
        ...actual,
        Link: ({ to, children, className }: any) => <a href={to} className={className}>{children}</a>,
    };
});

describe('Footer Component', () => {
    it('renders all 9 navigation links', () => {
        // Setup router context since we'll use <Link>
        const rootRoute = createRootRoute({
            component: () => <Footer />
        });

        const router = createRouter({
            routeTree: rootRoute,
            history: createMemoryHistory(),
        });

        render(<RouterProvider router={router} />);

        // Check for all 9 links
        const links = [
            'Features', 'Pricing', 'Use Cases',
            'About', 'Blog', 'Contact',
            'Privacy', 'Terms', 'Security'
        ];

        links.forEach(linkText => {
            const link = screen.getByText(linkText);
            expect(link).toBeTruthy();
            // Verify it's an anchor tag (or Link component rendering an anchor)
            const anchor = link.closest('a');
            expect(anchor).toBeTruthy();
            expect(anchor?.getAttribute('href')).toBeTruthy();
        });
    });
});
