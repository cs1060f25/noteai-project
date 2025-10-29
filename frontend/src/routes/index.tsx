import { useUser } from '@clerk/clerk-react';
import { Link, Navigate, createFileRoute } from '@tanstack/react-router';
import { ArrowRight, PlayCircle, Video } from 'lucide-react';

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  
  console.log('🔍 Landing Page - Clerk integrated, isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
  
  // Redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">NoteAI</span>
        </div>
        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-6 py-2 text-white hover:text-blue-300 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full mb-6">
            <span className="text-sm font-medium text-blue-300">✨ AI-Powered Lecture Processing</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Transform Your Lectures into
            <span className="text-blue-400"> Highlight Clips</span>
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Upload your lecture videos and let AI automatically generate highlight clips with
            subtitles. Save time and focus on what matters most.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 hover:scale-105 text-lg font-medium"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button 
              onClick={() => alert('🎬 Demo video would play here!\n\nIn full implementation, this would:\n• Open video modal\n• Show sample lecture processing\n• Demonstrate AI capabilities')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 hover:scale-105 text-lg font-medium"
            >
              <PlayCircle className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">10,000+</div>
              <div className="text-sm text-gray-400">Hours Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">5,000+</div>
              <div className="text-sm text-gray-400">Students Helped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">50+</div>
              <div className="text-sm text-gray-400">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">85%</div>
              <div className="text-sm text-gray-400">Time Saved</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powerful Features for Modern Learning
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-400 text-2xl">📹</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">Easy Upload</h3>
              <p className="text-gray-300">
                Drag and drop your lecture videos. Support for all major video formats.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-400 text-2xl">🧠</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">AI Processing</h3>
              <p className="text-gray-300">
                Advanced AI analyzes content and generates accurate transcriptions automatically.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 text-2xl">✂️</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">Smart Clips</h3>
              <p className="text-gray-300">
                Get perfectly timed clips with accurate subtitles, ready to share immediately.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-yellow-400 text-2xl">📝</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">Auto Subtitles</h3>
              <p className="text-gray-300">
                Accurate transcriptions with perfect timing for accessibility and engagement.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-pink-400 text-2xl">📤</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">Easy Sharing</h3>
              <p className="text-gray-300">
                Share clips directly to social media or embed in your learning management system.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-center hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-400 text-2xl">⚡</span>
              </div>
              <h3 className="text-lg text-white mb-2 font-semibold">Lightning Fast</h3>
              <p className="text-gray-300">
                Optimized pipeline processes hours of content in minutes with cloud acceleration.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: LandingPage,
});
