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
