import { useUser } from '@clerk/clerk-react';
import { Link, Navigate, createFileRoute } from '@tanstack/react-router';
import { 
  ArrowRight, 
  PlayCircle, 
  Sparkles, 
  Video, 
  Zap, 
  Star,
  Share2,
  Brain,
  Scissors,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Computer Science Professor",
      university: "Stanford University",
      content: "NoteAI has revolutionized how I create study materials. My students love the highlight clips!",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Graduate Student",
      university: "MIT",
      content: "I can review 3-hour lectures in just 20 minutes. This tool is a game-changer for my studies.",
      rating: 5
    },
    {
      name: "Prof. Emily Johnson",
      role: "Physics Department",
      university: "Harvard University",
      content: "The AI accuracy is impressive. It captures exactly the key moments I would highlight manually.",
      rating: 5
    }
  ];

  const stats = [
    { label: "Hours Processed", value: "10,000+" },
    { label: "Students Helped", value: "5,000+" },
    { label: "Universities", value: "50+" },
    { label: "Time Saved", value: "85%" }
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchDemo = () => {
    setIsVideoPlaying(true);
    // In a real implementation, this would open a modal with demo video
    setTimeout(() => setIsVideoPlaying(false), 3000);
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-background via-background2 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="fluent-title text-2xl text-foreground">NoteAI</span>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 text-foreground hover:text-primary transition-colors fluent-focus"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus fluent-shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Lecture Processing</span>
          </div>

          <h1 className="fluent-display text-5xl md:text-6xl font-bold text-foreground mb-6">
            Transform Your Lectures into
            <span className="text-primary"> Highlight Clips</span>
          </h1>

          <p className="fluent-body text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your lecture videos and let AI automatically generate highlight clips with
            subtitles. Save time and focus on what matters most.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 fluent-focus fluent-shadow-lg text-lg font-medium"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button 
              onClick={handleWatchDemo}
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all duration-300 hover:scale-105 fluent-focus text-lg font-medium"
            >
              <PlayCircle className={`w-5 h-5 ${isVideoPlaying ? 'animate-spin' : ''}`} />
              {isVideoPlaying ? 'Loading Demo...' : 'Watch Demo'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Demo Section */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="fluent-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              See NoteAI in Action
            </h2>
            <p className="fluent-body text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch how our AI processes a sample lecture and creates highlight clips in real-time
            </p>
          </div>
          
          <div className="fluent-layer-2 rounded-2xl p-8 fluent-reveal">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center relative overflow-hidden">
              {isVideoPlaying ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-foreground font-medium">Processing demo video...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">Click "Watch Demo" to see the magic happen</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Features Grid */}
        <div className="max-w-7xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="fluent-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Learning
            </h2>
            <p className="fluent-body text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to transform long lectures into digestible, shareable content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">Easy Upload</h3>
              <p className="fluent-body text-muted-foreground">
                Drag and drop your lecture videos. Support for all major video formats including MP4, AVI, MOV.
              </p>
            </div>

            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">AI Processing</h3>
              <p className="fluent-body text-muted-foreground">
                Advanced AI analyzes content, detects key moments, and generates accurate transcriptions automatically.
              </p>
            </div>

            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">Smart Clips</h3>
              <p className="fluent-body text-muted-foreground">
                Get perfectly timed clips with accurate subtitles, ready to share or study from immediately.
              </p>
            </div>

            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">Auto Subtitles</h3>
              <p className="fluent-body text-muted-foreground">
                Accurate, searchable subtitles generated automatically with speaker identification and timestamps.
              </p>
            </div>

            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">Easy Sharing</h3>
              <p className="fluent-body text-muted-foreground">
                Share clips directly to social media, learning platforms, or download for offline use.
              </p>
            </div>

            <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center group hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="fluent-subtitle text-lg text-foreground mb-2">Lightning Fast</h3>
              <p className="fluent-body text-muted-foreground">
                Process hours of content in minutes with our optimized AI pipeline and cloud infrastructure.
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="fluent-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Educators Worldwide
            </h2>
            <p className="fluent-body text-lg text-muted-foreground">
              Join thousands of students and educators who are already saving time with NoteAI
            </p>
          </div>

          <div className="fluent-layer-2 rounded-2xl p-8 fluent-reveal">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="fluent-body text-lg text-foreground mb-4 italic">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div>
                  <div className="font-semibold text-foreground">{testimonials[currentTestimonial].name}</div>
                  <div className="text-sm text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                  <div className="text-sm text-primary">{testimonials[currentTestimonial].university}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentTestimonial ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="fluent-layer-2 rounded-2xl p-12 fluent-reveal">
            <h2 className="fluent-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="fluent-body text-lg text-muted-foreground mb-8">
              Join thousands of students and educators who are already saving hours every week
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 fluent-focus fluent-shadow-lg text-lg font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-all duration-300 fluent-focus text-lg font-medium"
              >
                Sign In
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: LandingPage,
});
