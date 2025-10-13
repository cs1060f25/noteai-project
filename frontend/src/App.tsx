import { useState } from 'react';

import { VideoPlayer } from './components/VideoPlayer';
import { VideoUpload } from './components/VideoUpload';

const App = () => {
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);

  const handleUploadComplete = (jobId: string, s3Key: string) => {
    console.log('Upload complete! Job ID:', jobId, 'S3 Key:', s3Key);
    setUploadedJobId(jobId);
    setUploadedVideoKey(s3Key);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload failed:', error);
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Video Lecture Clip Generator
          </h1>
          <p className="text-gray-600">
            Upload your lecture videos and generate highlight clips with subtitles
          </p>
        </header>

        <main className="space-y-8">
          {/* upload section */}
          <VideoUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            className="shadow-lg"
          />

          {/* display job id after upload */}
          {uploadedJobId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Your video has been uploaded successfully!
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Job ID: <code className="bg-blue-100 px-2 py-0.5 rounded">{uploadedJobId}</code>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Processing will begin shortly. You can check the status using the job ID.
              </p>
            </div>
          )}

          {/* uploaded video player */}
          {uploadedVideoKey && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Uploaded Video</h2>
              <VideoPlayer videoKey={uploadedVideoKey} className="shadow-2xl" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
