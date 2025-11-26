import { useUser } from '@clerk/clerk-react';
import { GoogleOneTap } from '@clerk/clerk-react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Video, Scissors, Subtitles, Clock, Share2, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

import { ImageWithFallback } from '@/components/ImageWithFallback';
import { LandingNavbar } from '@/components/LandingNavbar';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useUser();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <GoogleOneTap />
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 backdrop-blur-sm border border-border/50 glass-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">AI-Powered Video Processing</span>
              </motion.div>
              <h1 className="text-5xl lg:text-6xl">Transform Your Lectures into Highlight Clips</h1>
              <p className="text-xl text-muted-foreground">
                Automatically extract the most valuable moments from your lecture videos and add
                professional subtitles in seconds. Save hours of manual editing time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black shadow-lg"
                >
                  Start Generating Clips
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="glass-card border-border/50">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-2xl text-foreground">10,000+</div>
                  <div className="text-sm text-muted-foreground">Videos Processed</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-2xl text-foreground">500+ Hours</div>
                  <div className="text-sm text-muted-foreground">Time Saved</div>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                className="glass-card rounded-2xl overflow-hidden border border-border/50 shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758413350815-7b06dbbfb9a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWN0dXJlJTIwaGFsbCUyMG1vZGVybnxlbnwxfHx8fDE3NjIzMDQwNDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Lecture Hall"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <motion.div
                className="absolute -bottom-6 -right-6 glass-card bg-card/90 backdrop-blur-md rounded-xl p-4 border border-border/50 shadow-lg"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm">Processing Complete</div>
                    <div className="text-xs text-muted-foreground">12 clips generated</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform your lectures into engaging highlight clips
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Video,
                title: 'Upload Your Lecture',
                description:
                  'Simply drag and drop your lecture video or paste a YouTube link. We support all major video formats.',
              },
              {
                step: '02',
                icon: Sparkles,
                title: 'AI Analyzes Content',
                description:
                  'Our AI identifies key moments, important concepts, and the most valuable segments of your lecture automatically.',
              },
              {
                step: '03',
                icon: Scissors,
                title: 'Get Your Clips',
                description:
                  'Download professional highlight clips with auto-generated subtitles, ready to share on any platform.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-8 border border-border/50 hover:border-border transition-all"
              >
                <div className="text-5xl text-muted-foreground/20 mb-4">{item.step}</div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Features & Benefits</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create professional lecture highlights
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: 'Save Time',
                description:
                  'Reduce hours of manual editing to just minutes with our AI-powered automation.',
              },
              {
                icon: Subtitles,
                title: 'Auto Subtitles',
                description:
                  'Professional, accurate subtitles are automatically generated for every clip.',
              },
              {
                icon: Sparkles,
                title: 'Smart Detection',
                description:
                  'AI identifies the most important moments and key concepts in your lectures.',
              },
              {
                icon: Share2,
                title: 'Easy Sharing',
                description:
                  'Export clips optimized for YouTube, Instagram, TikTok, and other platforms.',
              },
              {
                icon: Video,
                title: 'HD Quality',
                description:
                  'Maintain the highest quality from your original video in every exported clip.',
              },
              {
                icon: Scissors,
                title: 'Customizable',
                description:
                  'Fine-tune clip timing, edit subtitles, and adjust settings to your needs.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-6 border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card rounded-2xl p-12 border border-border/50 bg-card/50 backdrop-blur-md">
            <h2 className="text-4xl mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of educators and content creators who are transforming their lectures
              into engaging highlight clips.
            </p>
            <Button
              size="lg"
              className="bg-black hover:bg-black/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black shadow-lg"
            >
              Start Generating Clips Now
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  className="w-8 h-8 flex items-center justify-center"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <img src="/logo.png" alt="NoteAI Logo" className="w-full h-full object-contain" />
                </motion.div>
                <span className="text-foreground">NoteAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transform lectures into highlight clips with AI.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Use Cases
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © 2025 NoteAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: LandingPage,
});
