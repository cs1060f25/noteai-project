import { useState } from 'react';

import { GoogleOneTap } from '@clerk/clerk-react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import {
  Upload,
  Video,
  Settings,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { CustomAuthForm } from './components/CustomAuthForm';
import { CustomUserProfile } from './components/CustomUserProfile';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoUpload } from './components/VideoUpload';

const App = () => {
  const { isLoaded } = useUser();
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'settings'>('upload');

  // show loading spinner while checking auth status
  if (!isLoaded) {
    return (
      <div className="w-screen min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="fluent-body text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleUploadComplete = (jobId: string, s3Key: string) => {
    console.log('Upload complete! Job ID:', jobId, 'S3 Key:', s3Key);
    setUploadedJobId(jobId);
    setUploadedVideoKey(s3Key);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload failed:', error);
  };

  const sidebarItems = [
    { id: 'upload', label: 'Upload', icon: Upload, description: 'Upload new videos' },
    { id: 'library', label: 'Library', icon: FolderOpen, description: 'Browse videos' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences' },
  ];

  return (
    <>
      {/* Show login when signed out */}
      <SignedOut>
        {/* Google One Tap - only show on login page */}
        <GoogleOneTap />
        <div className="w-screen min-h-screen bg-background2 flex items-center justify-center">
          <CustomAuthForm />
        </div>
      </SignedOut>

      {/* Show app when signed in */}
      <SignedIn>
        <div className="w-screen min-h-screen bg-background flex">
          {/* Sidebar */}
          <aside className="w-64 fluent-layer-2 border-r border-border flex flex-col">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="fluent-title text-lg">NoteAI</h1>
                  <p className="fluent-caption">Lecture Dashboard</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id as never)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left fluent-focus fluent-reveal group ${
                          activeTab === item.id
                            ? 'bg-primary text-primary-foreground fluent-shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                        <div className="flex-1">
                          <span className="font-medium">{item.label}</span>
                          <p className="text-xs opacity-75 mt-0.5">{item.description}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col">
            {/* Header */}
            <header className="fluent-layer-1 border-b border-border p-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h1 className="fluent-title text-3xl text-foreground">
                    {activeTab === 'upload' && 'Upload New Lecture'}
                    {activeTab === 'library' && 'Video Library'}
                    {activeTab === 'settings' && 'Settings'}
                  </h1>
                  <p className="fluent-caption mt-1">
                    {activeTab === 'upload' &&
                      'Upload your lecture videos and generate highlight clips with subtitles'}
                    {activeTab === 'library' && 'Browse and manage your uploaded lecture videos'}
                    {activeTab === 'settings' && 'Configure your preferences and account settings'}
                  </p>
                </div>
                <CustomUserProfile />
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-7xl mx-auto space-y-8">
                {activeTab === 'upload' && (
                  <>
                    <VideoUpload
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                      className="fluent-layer-3 fluent-hover-lift fluent-reveal"
                    />

                    {uploadedJobId && (
                      <div className="fluent-layer-2 border-l-4 border-l-primary p-6 rounded-xl fluent-reveal">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="fluent-subtitle text-lg text-foreground mb-1">
                              Upload Successful!
                            </h3>
                            <p className="fluent-body text-muted-foreground mb-3">
                              Your video has been uploaded and processing will begin shortly.
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="fluent-caption">Job ID:</span>
                              <code className="bg-accent px-2 py-1 rounded-md text-xs font-mono text-foreground">
                                {uploadedJobId}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadedVideoKey && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                            <Video className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <h2 className="fluent-title text-2xl text-foreground">Uploaded Video</h2>
                        </div>
                        <VideoPlayer
                          videoKey={uploadedVideoKey}
                          className="fluent-layer-3 fluent-hover-lift fluent-reveal"
                        />
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'library' && (
                  <div className="space-y-6">
                    <div className="fluent-layer-2 p-8 rounded-xl text-center fluent-reveal">
                      <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="fluent-subtitle text-xl text-foreground mb-2">
                        No videos yet
                      </h3>
                      <p className="fluent-body text-muted-foreground mb-6">
                        Upload your first lecture video to get started with generating highlight
                        clips.
                      </p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Video
                      </button>
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
                            <p className="fluent-body text-sm text-foreground">
                              Video processing completed
                            </p>
                            <p className="fluent-caption">2 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <div className="flex-1">
                            <p className="fluent-body text-sm text-foreground">
                              Upload in progress
                            </p>
                            <p className="fluent-caption">5 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="fluent-layer-2 p-8 rounded-xl fluent-reveal">
                    <h3 className="fluent-subtitle text-xl text-foreground mb-6">Settings</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="fluent-body font-medium text-foreground">Theme</label>
                        <p className="fluent-caption">Choose your preferred theme appearance</p>
                      </div>
                      <div className="space-y-2">
                        <label className="fluent-body font-medium text-foreground">
                          Video Quality
                        </label>
                        <p className="fluent-caption">
                          Select the default quality for processed videos
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="fluent-body font-medium text-foreground">
                          Notifications
                        </label>
                        <p className="fluent-caption">Configure notification preferences</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
};

export default App;
