import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { VideoDetailPage } from '@/components/VideoDetailPage';

function VideoDetailComponent() {
  const { lectureId } = Route.useParams();
  const { quizId } = Route.useSearch();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/library' });
  };

  return <VideoDetailPage lectureId={lectureId} onBack={handleBack} initialQuizId={quizId} />;
}

export const Route = createFileRoute('/_authenticated/library/$lectureId')({
  component: VideoDetailComponent,
  validateSearch: (search: Record<string, unknown>): { quizId?: string } => {
    return {
      quizId: search.quizId as string | undefined,
    };
  },
});
