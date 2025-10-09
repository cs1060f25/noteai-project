import { VideoPlayer } from './components/VideoPlayer';

const App = () => {
  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Video Player</h1>
          <p className="text-gray-600">Streaming from S3 using pre-signed URLs</p>
        </header>

        <main>
          <VideoPlayer videoKey="recording.mov" className="shadow-2xl" />
        </main>
      </div>
    </div>
  );
};

export default App;
