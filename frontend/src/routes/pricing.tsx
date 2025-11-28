import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Zap, Crown } from 'lucide-react';

const PricingPage = () => {
    const tiers = [
        {
            name: 'Free',
            icon: null,
            price: '$0',
            period: 'forever',
            description: 'Perfect for trying out NoteAI and occasional use',
            features: [
                'Up to 5 videos in library',
                'Basic highlight generation',
                'Auto-generated subtitles',
                'Standard processing speed',
                'Layout detection',
                'Silence removal',
                '720p export quality',
                'Community support'
            ],
            limitations: [
                'Limited to 5 stored videos',
                'Basic AI pipeline',
                'Standard processing priority'
            ],
            cta: 'Get Started Free',
            popular: false
        },
        {
            name: 'Pro',
            icon: Zap,
            price: '$9.99',
            period: 'per month',
            description: 'For students and educators processing lectures regularly',
            features: [
                'Up to 100 videos in library',
                'Advanced highlight generation',
                'High-accuracy transcription',
                'Priority processing (2x faster)',
                'All layout types supported',
                'Smart content analysis',
                '1080p export quality',
                'Custom clip durations',
                'Batch processing',
                'Email support'
            ],
            limitations: [],
            cta: 'Start Pro Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            icon: Crown,
            price: '$49.99',
            period: 'per month',
            description: 'For institutions and content creators needing maximum power',
            features: [
                'Unlimited video library',
                'Premium AI pipeline',
                'Context-aware summaries',
                'Automatic concept linking',
                'Fastest processing (5x speed)',
                'Multi-speaker diarization',
                '4K export quality',
                'Custom AI instructions',
                'API access',
                'White-label export',
                'Team collaboration',
                'Dedicated support',
                'SLA guarantee'
            ],
            limitations: [],
            cta: 'Contact Sales',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-muted-foreground">
                        Choose the plan that fits your needs. Upgrade or downgrade anytime.
                    </p>
                </div>
            </section>

            {/* Pricing Tiers */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {tiers.map((tier, index) => (
                            <div
                                key={index}
                                className={`glass-card rounded-xl p-8 border transition-all ${tier.popular
                                    ? 'border-primary shadow-lg scale-105'
                                    : 'border-border/50 hover:border-border'
                                    }`}
                            >
                                {tier.popular && (
                                    <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
                                        Most Popular
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-2">
                                    {tier.icon && <tier.icon className="w-6 h-6 text-primary" />}
                                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold">{tier.price}</span>
                                        <span className="text-muted-foreground">/ {tier.period}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
                                </div>

                                <Link to="/login" className="block">
                                    <button
                                        className={`w-full py-3 rounded-md font-medium transition-colors mb-6 ${tier.popular
                                            ? 'bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black'
                                            : 'bg-muted hover:bg-muted/80 text-foreground'
                                            }`}
                                    >
                                        {tier.cta}
                                    </button>
                                </Link>

                                <div className="space-y-3 mb-6">
                                    <div className="text-sm font-semibold text-muted-foreground mb-2">What's included:</div>
                                    {tier.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {tier.limitations.length > 0 && (
                                    <div className="pt-6 border-t border-border/50">
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {tier.limitations.map((limitation, idx) => (
                                                <div key={idx}>• {limitation}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature Comparison */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
                    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                        <table className="w-full">
                            <thead className="border-b border-border/50">
                                <tr>
                                    <th className="text-left p-4 font-semibold">Feature</th>
                                    <th className="text-center p-4 font-semibold">Free</th>
                                    <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                                    <th className="text-center p-4 font-semibold">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="p-4">Video Library Size</td>
                                    <td className="text-center p-4 text-muted-foreground">5 videos</td>
                                    <td className="text-center p-4 bg-primary/5">100 videos</td>
                                    <td className="text-center p-4 text-muted-foreground">Unlimited</td>
                                </tr>
                                <tr>
                                    <td className="p-4">AI Pipeline Quality</td>
                                    <td className="text-center p-4 text-muted-foreground">Basic</td>
                                    <td className="text-center p-4 bg-primary/5">Advanced</td>
                                    <td className="text-center p-4 text-muted-foreground">Premium</td>
                                </tr>
                                <tr>
                                    <td className="p-4">Processing Speed</td>
                                    <td className="text-center p-4 text-muted-foreground">Standard</td>
                                    <td className="text-center p-4 bg-primary/5">2x faster</td>
                                    <td className="text-center p-4 text-muted-foreground">5x faster</td>
                                </tr>
                                <tr>
                                    <td className="p-4">Export Quality</td>
                                    <td className="text-center p-4 text-muted-foreground">720p</td>
                                    <td className="text-center p-4 bg-primary/5">1080p</td>
                                    <td className="text-center p-4 text-muted-foreground">4K</td>
                                </tr>
                                <tr>
                                    <td className="p-4">Context Summaries</td>
                                    <td className="text-center p-4 text-muted-foreground">—</td>
                                    <td className="text-center p-4 bg-primary/5">—</td>
                                    <td className="text-center p-4"><Check className="w-5 h-5 text-primary mx-auto" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">API Access</td>
                                    <td className="text-center p-4 text-muted-foreground">—</td>
                                    <td className="text-center p-4 bg-primary/5">—</td>
                                    <td className="text-center p-4"><Check className="w-5 h-5 text-primary mx-auto" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <h3 className="font-semibold mb-2">Can I change plans later?</h3>
                            <p className="text-sm text-muted-foreground">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
                        </div>
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <h3 className="font-semibold mb-2">What happens when I hit my video limit?</h3>
                            <p className="text-sm text-muted-foreground">On the Free plan, you'll need to delete old videos to process new ones, or upgrade to Pro for 100 videos or Enterprise for unlimited storage.</p>
                        </div>
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <h3 className="font-semibold mb-2">What's the difference between AI pipeline tiers?</h3>
                            <p className="text-sm text-muted-foreground">Basic uses standard models, Advanced adds improved accuracy and smarter segmentation, Premium includes context-aware features like automatic summaries and concept linking.</p>
                        </div>
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <h3 className="font-semibold mb-2">Do you offer educational discounts?</h3>
                            <p className="text-sm text-muted-foreground">Yes! Students and educators get 50% off Pro plans with a valid .edu email. Contact support for institutional pricing.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/pricing')({
    component: PricingPage,
});
