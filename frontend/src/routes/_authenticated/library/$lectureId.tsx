import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { VideoDetailPage } from '@/components/VideoDetailPage';

function VideoDetailComponent() {
  const { lectureId } = Route.useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/library' });
  };

  return <VideoDetailPage lectureId={lectureId} onBack={handleBack} />;
}

export const Route = createFileRoute('/_authenticated/library/$lectureId')({
  component: VideoDetailComponent,
});
