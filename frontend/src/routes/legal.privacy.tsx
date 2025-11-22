import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/legal/privacy')({
    component: () => (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: November 2025</p>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">1. Introduction</h2>
                <p className="text-muted-foreground">
                    NoteAI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our video processing service.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">2. Information We Collect</h2>
                <p className="text-muted-foreground">
                    We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Account information (name, email, password)</li>
                    <li>Video content you upload for processing</li>
                    <li>Usage data and processing logs</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
                <p className="text-muted-foreground">
                    We use the collected information to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process your videos and generate highlights</li>
                    <li>Send you technical notices and support messages</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">4. Data Security</h2>
                <p className="text-muted-foreground">
                    We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                </p>
            </section>
        </div>
    ),
})
