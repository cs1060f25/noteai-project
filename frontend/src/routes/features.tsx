import { createFileRoute, Link } from '@tanstack/react-router';
import { Video, Scissors, Subtitles, Brain, Layout, Zap, FileVideo, Sparkles, Download, Clock } from 'lucide-react';

const FeaturesPage = () => {
    const features = [
        {
            icon: Brain,
            title: 'AI-Powered Content Analysis',
            description: 'Advanced AI identifies the most important moments in your lectures by analyzing both audio transcripts and visual content.',
            details: [
                'Semantic understanding of lecture content',
                'Automatic importance scoring',
                'Smart segment extraction',
                'Contextual keyword detection'
            ]
        },
        {
            icon: Scissors,
            title: 'Intelligent Highlight Generation',
            description: 'Automatically extract engaging highlight clips from lengthy lectures with precision timing and smooth transitions.',
            details: [
                'Customizable clip duration',
                'Automatic scene detection',
                'Smart content boundaries',
                'Multi-clip compilation'
            ]
        },
        {
            icon: Subtitles,
            title: 'Professional Auto-Subtitles',
            description: 'Generate accurate, professionally formatted subtitles for every clip with speaker-aware transcription.',
            details: [
                'High-accuracy transcription',
                'Speaker diarization',
                'Customizable styling',
                'Multi-language support'
            ]
        },
        {
            icon: Layout,
            title: 'Video Layout Detection',
            description: 'Automatically detect and optimize for different video layouts including side-by-side, picture-in-picture, and screen-only.',
            details: [
                'Automatic layout recognition',
                'Screen content extraction',
                'Camera region isolation',
                'Optimized cropping'
            ]
        },
        {
            icon: Sparkles,
            title: 'Silence Detection & Removal',
            description: 'Clean up your videos by automatically detecting and removing awkward pauses and dead air.',
            details: [
                'Smart silence detection',
                'Configurable thresholds',
                'Smooth transitions',
                'Preserve natural pacing'
            ]
        },
        {
            icon: FileVideo,
            title: 'Multiple Input Sources',
            description: 'Process videos from file uploads or YouTube links with support for all major video formats.',
            details: [
                'Direct file upload',
                'YouTube URL support',
                'Format auto-detection',
                'Quality preservation'
            ]
        },
        {
            icon: Zap,
            title: 'Fast Processing Pipeline',
            description: 'Optimized processing pipeline delivers results quickly without compromising quality.',
            details: [
                'Parallel processing',
                'GPU acceleration',
                'Progress tracking',
                'Real-time updates'
            ]
        },
        {
            icon: Download,
            title: 'Export & Sharing',
            description: 'Download your processed videos in various formats or share directly to social media platforms.',
            details: [
                'Multiple export formats',
                'Platform-optimized output',
                'Batch downloads',
                'Direct sharing links'
            ]
        },
        {
            icon: Clock,
            title: 'Video Library Management',
            description: 'Organize and manage your processed videos with a comprehensive library system.',
            details: [
                'Searchable video library',
                'Tag and categorize',
                'Processing history',
                'Agent output inspection'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">Features</h1>
                    <p className="text-xl text-muted-foreground">
                        Everything you need to transform lectures into engaging highlight clips
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="glass-card rounded-xl p-6 border border-border/50 hover:border-border transition-all"
                            >
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground mb-4">{feature.description}</p>
                                <ul className="space-y-2">
                                    {feature.details.map((detail, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <span className="text-primary mt-1">•</span>
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
                    <p className="text-xl text-muted-foreground mb-8">
                        Sign up today and start creating professional highlight clips in minutes
                    </p>
                    <Link to="/login">
                        <button className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black px-8 py-3 rounded-md font-medium transition-colors">
                            Start Free Trial
                        </button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/features')({
    component: FeaturesPage,
});
