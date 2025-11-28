import { createFileRoute, Link } from '@tanstack/react-router';
import { GraduationCap, School, Users, Video, BookOpen, Trophy } from 'lucide-react';

const UseCasesPage = () => {
    const useCases = [
        {
            icon: GraduationCap,
            persona: 'Students',
            title: 'Study Smarter, Not Harder',
            description: 'Transform lengthy lecture recordings into digestible highlight clips for efficient review and exam preparation.',
            benefits: [
                'Create study materials from recorded lectures',
                'Focus on key concepts and important moments',
                'Review content faster with auto-generated clips',
                'Share highlights with study groups'
            ],
            example: 'A college student records a 2-hour biology lecture. NoteAI automatically extracts 8 key segments covering cell division, protein synthesis, and DNA replication - turning hours of review into 20 minutes of focused study.'
        },
        {
            icon: School,
            persona: 'Educators & Professors',
            title: 'Enhance Your Teaching Materials',
            description: 'Create engaging supplemental content from your lectures to improve student comprehension and retention.',
            benefits: [
                'Generate shareable lecture highlights',
                'Create flipped classroom materials',
                'Build a library of concept explanations',
                'Provide review materials before exams'
            ],
            example: 'A physics professor uploads semester lectures. NoteAI creates highlight reels for each major topic, which students can review before exams and reference throughout the year.'
        },
        {
            icon: Video,
            persona: 'Content Creators & EdTech',
            title: 'Scale Your Educational Content',
            description: 'Transform educational videos into bite-sized, shareable content optimized for social media and online platforms.',
            benefits: [
                'Create social media snippets from long videos',
                'Generate preview clips for courses',
                'Repurpose content across platforms',
                'Increase engagement with highlight reels'
            ],
            example: 'An online course creator has 50+ hours of recorded content. NoteAI automatically generates promotional clips for each module, dramatically reducing editing time and boosting course discovery.'
        },
        {
            icon: Users,
            persona: 'Corporate Trainers',
            title: 'Streamline Employee Training',
            description: 'Extract key moments from training sessions and create focused learning modules for new hires and continuing education.',
            benefits: [
                'Distill training sessions into essentials',
                'Create onboarding video libraries',
                'Generate procedure documentation',
                'Build searchable training archives'
            ],
            example: 'An HR team records quarterly training sessions. NoteAI processes each recording to create a searchable library of policy updates, software tutorials, and best practices.'
        },
        {
            icon: BookOpen,
            persona: 'Online Course Platforms',
            title: 'Improve Course Discovery',
            description: 'Automatically generate preview content and chapter highlights to improve course completion rates.',
            benefits: [
                'Auto-generate course previews',
                'Create chapter summaries',
                'Highlight learning outcomes',
                'Reduce video editing costs'
            ],
            example: 'An e-learning platform processes all instructor uploads through NoteAI, automatically creating course trailers and chapter highlights that increase enrollment by 35%.'
        },
        {
            icon: Trophy,
            persona: 'Academic Institutions',
            title: 'Build Digital Learning Resources',
            description: 'Create a comprehensive library of lecture highlights and key moments for your institutional learning management system.',
            benefits: [
                'Build institutional knowledge bases',
                'Support hybrid and remote learning',
                'Create accessible content libraries',
                'Preserve important lectures'
            ],
            example: 'A university processes guest lectures and special seminars through NoteAI, creating a permanent archive of key insights available to all students and faculty.'
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">Use Cases</h1>
                    <p className="text-xl text-muted-foreground">
                        Discover how NoteAI helps different users transform their lecture content
                    </p>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-16">
                    {useCases.map((useCase, index) => (
                        <div
                            key={index}
                            className="glass-card rounded-xl p-8 border border-border/50"
                        >
                            <div className="grid lg:grid-cols-3 gap-8">
                                {/* Left: Icon & Persona */}
                                <div className="lg:col-span-1">
                                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                        <useCase.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="text-sm font-medium text-primary mb-2">{useCase.persona}</div>
                                    <h2 className="text-2xl font-bold mb-3">{useCase.title}</h2>
                                    <p className="text-muted-foreground">{useCase.description}</p>
                                </div>

                                {/* Middle: Benefits */}
                                <div className="lg:col-span-1 border-l border-border/50 pl-8">
                                    <h3 className="text-lg font-semibold mb-4">Key Benefits</h3>
                                    <ul className="space-y-3">
                                        {useCase.benefits.map((benefit, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-primary mt-1">✓</span>
                                                <span className="text-sm text-muted-foreground">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Right: Example */}
                                <div className="lg:col-span-1 border-l border-border/50 pl-8">
                                    <h3 className="text-lg font-semibold mb-4">Real-World Example</h3>
                                    <p className="text-sm text-muted-foreground italic">{useCase.example}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">See yourself in these use cases?</h2>
                    <p className="text-xl text-muted-foreground mb-8">
                        Join thousands of users who are transforming their lecture content with NoteAI
                    </p>
                    <Link to="/login">
                        <button className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black px-8 py-3 rounded-md font-medium transition-colors">
                            Get Started Free
                        </button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/use-cases')({
    component: UseCasesPage,
});
