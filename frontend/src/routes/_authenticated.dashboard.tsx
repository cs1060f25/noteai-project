import { Link, createFileRoute } from '@tanstack/react-router';
import { FolderOpen, Upload } from 'lucide-react';

const DashboardComponent = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="fluent-layer-2 p-8 rounded-xl fluent-reveal">
        <h2 className="fluent-title text-2xl text-foreground mb-4">
          Welcome to NoteAI Lecture Dashboard
        </h2>
        <p className="fluent-body text-muted-foreground mb-6">
          Get started by uploading your first lecture video or browse your existing library.
        </p>
        <div className="flex gap-4">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus fluent-shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Upload Video
          </Link>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors fluent-focus"
          >
            <FolderOpen className="w-5 h-5" />
            View Library
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
          <div className="flex items-center justify-between mb-2">
            <h3 className="fluent-subtitle text-lg text-foreground">Total Videos</h3>
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">0</p>
          <p className="fluent-caption mt-1">No videos uploaded yet</p>
        </div>

        <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
          <div className="flex items-center justify-between mb-2">
            <h3 className="fluent-subtitle text-lg text-foreground">Processing</h3>
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">0</p>
          <p className="fluent-caption mt-1">Videos in queue</p>
        </div>

        <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
          <div className="flex items-center justify-between mb-2">
            <h3 className="fluent-subtitle text-lg text-foreground">Completed</h3>
            <FolderOpen className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">0</p>
          <p className="fluent-caption mt-1">Ready to view</p>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardComponent,
});
