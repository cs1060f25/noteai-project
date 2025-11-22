import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { createMemoryHistory, createRouter, RouterProvider, createRootRoute } from '@tanstack/react-router';
import { Footer } from '../Footer'; // Assuming we will extract it here

expect.extend(matchers);

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
            expect(link).toBeInTheDocument();
            // Verify it's an anchor tag (or Link component rendering an anchor)
            expect(link.closest('a')).toHaveAttribute('href');
        });
    });
});
