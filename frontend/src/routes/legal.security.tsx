import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/legal/security')({
    component: () => <div className="p-8 max-w-7xl mx-auto"><h1 className="text-3xl font-bold mb-4">Security</h1><p className="text-muted-foreground">Coming soon...</p></div>,
})
