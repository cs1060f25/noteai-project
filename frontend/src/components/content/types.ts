export interface Quiz {
  id: string;
  lectureTitle: string;
  lectureId: string | number;
  questionsCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  lastAttempt?: {
    score: number;
    totalQuestions: number;
    completedAt: string;
  };
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface Podcast {
  id: string;
  lectureTitle: string;
  lectureId: number;
  duration: string;
  narrator: string;
  createdAt: string;
  status: 'generating' | 'ready' | 'failed';
  audioUrl?: string;
}
