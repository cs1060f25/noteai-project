import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_landing/legal/security')({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto space-y-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Security</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: November 2025</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Infrastructure Security</h2>
        <p className="text-muted-foreground">
          NoteAI is built on enterprise-grade cloud infrastructure. We use Amazon Web Services (AWS)
          for secure storage and processing. All data is encrypted at rest and in transit using
          industry-standard TLS 1.2+ protocols.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data Protection</h2>
        <p className="text-muted-foreground">
          Your video content is processed in isolated environments. We employ strict access controls
          and regular security audits to ensure your data remains private. Original uploads are
          automatically deleted after processing is complete, unless otherwise configured.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Compliance</h2>
        <p className="text-muted-foreground">
          We adhere to modern security best practices and compliance standards. Our authentication
          system is powered by Clerk, ensuring secure identity management and protection against
          common attacks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reporting Vulnerabilities</h2>
        <p className="text-muted-foreground">
          If you discover a security vulnerability, please report it to security@noteai.com. We
          appreciate your help in keeping NoteAI secure.
        </p>
      </section>
    </div>
  ),
});
