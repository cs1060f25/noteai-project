import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/legal/terms')({
    component: () => <div className="p-8 max-w-7xl mx-auto"><h1 className="text-3xl font-bold mb-4">Terms of Service</h1><p className="text-muted-foreground">Coming soon...</p></div>,
})
