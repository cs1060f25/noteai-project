import { Link, createFileRoute } from '@tanstack/react-router';
import { AlertCircle, CheckCircle, Clock, FolderOpen, Upload } from 'lucide-react';

const LibraryComponent = () => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="fluent-title text-3xl text-foreground mb-2">Video Library</h1>
        <p className="fluent-body text-muted-foreground">
          Browse and manage your uploaded lecture videos
        </p>
      </div>

      {/* Empty State */}
      <div className="fluent-layer-2 p-8 rounded-xl text-center fluent-reveal">
        <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="fluent-subtitle text-xl text-foreground mb-2">No videos yet</h3>
        <p className="fluent-body text-muted-foreground mb-6">
          Upload your first lecture video to get started with generating highlight clips.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus"
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h4 className="fluent-subtitle text-lg text-foreground">Recent Activity</h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div className="flex-1">
              <p className="fluent-body text-sm text-foreground">Video processing completed</p>
              <p className="fluent-caption">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <div className="flex-1">
              <p className="fluent-body text-sm text-foreground">Upload in progress</p>
              <p className="fluent-caption">5 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/library')({
  component: LibraryComponent,
});
