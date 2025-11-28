import { createFileRoute } from '@tanstack/react-router';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

const BlogPage = () => {
    const posts = [
        {
            title: '5 Ways AI is Transforming Educational Content Creation',
            excerpt: 'Discover how artificial intelligence is revolutionizing the way educators create, share, and optimize learning materials for the digital age.',
            date: 'November 15, 2024',
            readTime: '5 min read',
            category: 'AI & Education'
        },
        {
            title: 'The Science Behind Effective Study Highlights',
            excerpt: 'Research shows that bite-sized content improves retention. Learn why highlight clips are more than just convenient—they\'re backed by cognitive science.',
            date: 'November 8, 2024',
            readTime: '7 min read',
            category: 'Learning Science'
        },
        {
            title: 'From 2-Hour Lecture to 5-Minute Summary: A Case Study',
            excerpt: 'See how one professor used NoteAI to transform a semester of lectures into shareable highlights, improving student engagement by 40%.',
            date: 'November 1, 2024',
            readTime: '6 min read',
            category: 'Case Studies'
        },
        {
            title: 'Best Practices for Recording Lectures',
            excerpt: 'Get the most out of NoteAI by optimizing your video recordings. Tips on audio quality, camera placement, and content structure.',
            date: 'October 25, 2024',
            readTime: '4 min read',
            category: 'Tips & Tricks'
        },
        {
            title: 'Understanding Video Layout Detection',
            excerpt: 'A technical deep-dive into how NoteAI identifies different video layouts and why it matters for creating better highlight clips.',
            date: 'October 18, 2024',
            readTime: '8 min read',
            category: 'Technology'
        },
        {
            title: 'The Future of Hybrid Learning',
            excerpt: 'As education moves between in-person and online, tools like NoteAI bridge the gap by making all content accessible and digestible.',
            date: 'October 10, 2024',
            readTime: '5 min read',
            category: 'Industry Insights'
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">Blog</h1>
                    <p className="text-xl text-muted-foreground">
                        Insights on AI, education, and the future of learning
                    </p>
                </div>
            </section>

            {/* Featured Post */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="glass-card rounded-xl p-8 border border-primary/50 bg-primary/5 mb-16">
                        <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full mb-4">
                            Featured Post
                        </div>
                        <h2 className="text-3xl font-bold mb-4">{posts[0].title}</h2>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{posts[0].date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{posts[0].readTime}</span>
                            </div>
                            <div className="px-2 py-1 bg-muted rounded text-xs">
                                {posts[0].category}
                            </div>
                        </div>
                        <p className="text-lg text-muted-foreground mb-6">{posts[0].excerpt}</p>
                        <button className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
                            Read More <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Recent Posts Grid */}
                    <h2 className="text-2xl font-bold mb-8">Recent Posts</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.slice(1).map((post, index) => (
                            <div
                                key={index}
                                className="glass-card rounded-xl p-6 border border-border/50 hover:border-border transition-all group cursor-pointer"
                            >
                                <div className="inline-block px-2 py-1 bg-muted rounded text-xs mb-3">
                                    {post.category}
                                </div>
                                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{post.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{post.readTime}</span>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                                    Read More <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Newsletter CTA */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
                    <p className="text-muted-foreground mb-6">
                        Subscribe to our newsletter for the latest insights on AI, education technology, and learning science.
                    </p>
                    <div className="flex gap-2 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-1 px-4 py-2 rounded-md border border-border bg-background"
                        />
                        <button className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black px-6 py-2 rounded-md font-medium transition-colors">
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/blog')({
    component: BlogPage,
});
