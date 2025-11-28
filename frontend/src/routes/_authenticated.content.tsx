import { createFileRoute } from '@tanstack/react-router';

import { MyContentPage } from '@/components/MyContentPage';

export const Route = createFileRoute('/_authenticated/content')({
  component: MyContentPage,
});
