import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_landing/legal/terms')({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto space-y-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: November 2025</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By accessing or using NoteAI, you agree to be bound by these Terms of Service and all
          applicable laws and regulations. If you do not agree with any of these terms, you are
          prohibited from using or accessing this site.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Use License</h2>
        <p className="text-muted-foreground">
          Permission is granted to temporarily download one copy of the materials (information or
          software) on NoteAI's website for personal, non-commercial transitory viewing only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Service Description</h2>
        <p className="text-muted-foreground">
          NoteAI provides AI-powered video processing services. We reserve the right to modify,
          suspend, or discontinue the service at any time without notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. User Content</h2>
        <p className="text-muted-foreground">
          You retain all rights to the video content you upload. By uploading content, you grant
          NoteAI a license to process and store your content solely for the purpose of providing the
          service to you.
        </p>
      </section>
    </div>
  ),
});
