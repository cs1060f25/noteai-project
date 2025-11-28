import { createFileRoute } from '@tanstack/react-router';
import { Mail, MessageSquare, Send } from 'lucide-react';

const ContactPage = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">Contact Us</h1>
                    <p className="text-xl text-muted-foreground">
                        Have questions? We'd love to hear from you
                    </p>
                </div>
            </section>

            {/* Contact Content */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                                <p className="text-muted-foreground mb-6">
                                    Whether you have a question about features, pricing, or anything else,
                                    our team is ready to answer all your questions.
                                </p>
                            </div>

                            <div className="glass-card rounded-xl p-6 border border-border/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Email Us</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Send us an email and we'll get back to you within 24 hours
                                        </p>
                                        <a
                                            href="mailto:eliotatlani@g.harvard.edu"
                                            className="text-primary hover:underline"
                                        >
                                            eliotatlani@g.harvard.edu
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-6 border border-border/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MessageSquare className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Support</h3>
                                        <p className="text-sm text-muted-foreground">
                                            For technical support and bug reports, please include your job ID
                                            and a description of the issue.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="glass-card rounded-xl p-8 border border-border/50">
                            <h3 className="text-xl font-semibold mb-6">Send us a Message</h3>
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-md border border-border bg-background"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 rounded-md border border-border bg-background"
                                        placeholder="your.email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-md border border-border bg-background"
                                        placeholder="How can we help?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        rows={5}
                                        className="w-full px-4 py-2 rounded-md border border-border bg-background resize-none"
                                        placeholder="Tell us more about your question or feedback..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black px-6 py-3 rounded-md font-medium transition-colors inline-flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Quick Links */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4">Looking for Something Specific?</h2>
                    <p className="text-muted-foreground mb-8">
                        Check out these resources for quick answers
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a href="/pricing" className="px-6 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors">
                            View Pricing
                        </a>
                        <a href="/features" className="px-6 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors">
                            Explore Features
                        </a>
                        <a href="/use-cases" className="px-6 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors">
                            Use Cases
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/contact')({
    component: ContactPage,
});
