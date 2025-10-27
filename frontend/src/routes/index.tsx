import { useUser } from '@clerk/clerk-react';
import { Link, Navigate, createFileRoute } from '@tanstack/react-router';
import { ArrowRight, PlayCircle, Sparkles, Video, Zap, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { theme, toggleTheme } = useTheme();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

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
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors fluent-focus"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" />
              )}
            </button>
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

          <div className="flex gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus fluent-shadow-lg text-lg font-medium"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors fluent-focus text-lg font-medium">
              <PlayCircle className="w-5 h-5" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="fluent-subtitle text-lg text-foreground mb-2">Easy Upload</h3>
            <p className="fluent-body text-muted-foreground">
              Drag and drop your lecture videos. Support for all major video formats.
            </p>
          </div>

          <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="fluent-subtitle text-lg text-foreground mb-2">AI Processing</h3>
            <p className="fluent-body text-muted-foreground">
              Automated highlight detection and subtitle generation powered by AI.
            </p>
          </div>

          <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="fluent-subtitle text-lg text-foreground mb-2">Smart Clips</h3>
            <p className="fluent-body text-muted-foreground">
              Get perfectly timed clips with accurate subtitles ready to share.
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
