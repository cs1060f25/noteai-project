import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Link } from '@tanstack/react-router';

import { Footer } from '../Footer';

// Mock Link component to avoid router context issues
vi.mock('@tanstack/react-router', () => ({
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
        <a href={to}>{children}</a>
    ),
}));

describe('Footer Component', () => {
    it('renders all 9 navigation links', () => {
        render(<Footer />);

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
