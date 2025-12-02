import { createFileRoute } from '@tanstack/react-router';

import { MyContentPage } from '@/components/MyContentPage';

export const Route = createFileRoute('/_authenticated/content')({
  component: ContentRouteComponent,
});

function ContentRouteComponent() {
  const navigate = Route.useNavigate();

  const handleStartQuiz = (quizId: string, lectureId: string | number) => {
    navigate({
      to: '/library/$lectureId',
      params: { lectureId: lectureId.toString() },
      search: { quizId },
    });
  };

  return <MyContentPage onStartQuiz={handleStartQuiz} />;
}
