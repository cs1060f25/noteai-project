import { useState, useEffect } from 'react';

import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  Target,
  Brain,
  ArrowRight,
  RotateCcw,
  Share2,
  Sparkles,
  ChevronRight,
  Award,
  Check,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { QuizQuestion } from '@/types/api';

interface QuizPageProps {
  onBack: () => void;
  lectureTitle: string;
  questions: QuizQuestion[];
}

interface Answer {
  questionId: number;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
}

export function QuizPage({ onBack, lectureTitle, questions }: QuizPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Use provided questions or fallback to empty array
  const quizQuestions = questions || [];
  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress =
    quizQuestions.length > 0 ? ((currentQuestionIndex + 1) / quizQuestions.length) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

  // Timer effect
  useEffect(() => {
    if (!isQuizComplete && !showExplanation && quizQuestions.length > 0) {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isQuizComplete, showExplanation, quizQuestions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) {
      toast.error('Please select an answer');
      return;
    }

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedOption,
      isCorrect,
      timeSpent,
    };

    setAnswers([...answers, newAnswer]);
    setShowExplanation(true);

    // Update streak
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
      if (newStreak >= 3) {
        toast.success(`🔥 ${newStreak} question streak!`);
      }
    } else {
      setStreak(0);
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      setIsQuizComplete(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
    }
  };

  const calculateScore = () => {
    if (quizQuestions.length === 0) return 0;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    return Math.round((correctAnswers / quizQuestions.length) * 100);
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90)
      return {
        title: '🎉 Outstanding!',
        message: 'You mastered this material!',
        color: 'text-green-500',
      };
    if (score >= 70)
      return {
        title: '👏 Great Job!',
        message: 'You have a solid understanding!',
        color: 'text-blue-500',
      };
    if (score >= 50)
      return {
        title: '👍 Good Effort!',
        message: 'Keep studying to improve!',
        color: 'text-yellow-500',
      };
    return {
      title: '📚 Keep Learning!',
      message: 'Review the material and try again!',
      color: 'text-orange-500',
    };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-500 bg-green-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'hard':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const retakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
    setIsQuizComplete(false);
    setTimeElapsed(0);
    setQuestionStartTime(Date.now());
    setStreak(0);
  };

  if (quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground mb-6">
            Could not load quiz questions. Please try generating the quiz again.
          </p>
          <Button onClick={onBack}>Back to Video</Button>
        </Card>
      </div>
    );
  }

  if (isQuizComplete) {
    const score = calculateScore();
    const scoreInfo = getScoreMessage(score);
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const avgTime =
      answers.length > 0
        ? Math.round(answers.reduce((acc, a) => acc + a.timeSpent, 0) / answers.length)
        : 0;

    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    y: -20,
                    x: Math.random() * window.innerWidth,
                    rotate: 0,
                    opacity: 1,
                  }}
                  animate={{
                    y: window.innerHeight + 100,
                    rotate: Math.random() * 720,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    ease: 'easeOut',
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][
                      Math.floor(Math.random() * 5)
                    ],
                  }}
                />
              ))}
            </div>
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={onBack}
              variant="ghost"
              className="mb-4 glass-card border border-border/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Video
            </Button>
            <h1 className="text-muted-foreground mb-2">Quiz Complete!</h1>
            <p className="text-muted-foreground">{lectureTitle}</p>
          </motion.div>

          {/* Results Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl border border-border/50 p-8 mb-6"
          >
            {/* Score Display */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4"
              >
                <div className="text-center">
                  <div className="text-4xl mb-1">{score}%</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
              </motion.div>
              <h2 className={`mb-2 ${scoreInfo.color}`}>{scoreInfo.title}</h2>
              <p className="text-muted-foreground">{scoreInfo.message}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-2xl p-4 border border-border/50 text-center"
              >
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl mb-1">
                  {correctCount}/{quizQuestions.length}
                </div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card rounded-2xl p-4 border border-border/50 text-center"
              >
                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl mb-1">{formatTime(timeElapsed)}</div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card rounded-2xl p-4 border border-border/50 text-center"
              >
                <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl mb-1">{bestStreak}</div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card rounded-2xl p-4 border border-border/50 text-center"
              >
                <Target className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl mb-1">{avgTime}s</div>
                <div className="text-xs text-muted-foreground">Avg Time</div>
              </motion.div>
            </div>

            {/* Achievements */}
            {score >= 90 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="glass-card rounded-2xl p-6 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 mb-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg mb-1">Achievement Unlocked!</h3>
                    <p className="text-sm text-muted-foreground">
                      Quiz Master - Scored 90% or higher
                    </p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={retakeQuiz}
                variant="outline"
                className="flex-1 glass-card border-border/50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Quiz
              </Button>
              <Button
                onClick={() => toast.success('Results shared!')}
                variant="outline"
                className="flex-1 glass-card border-border/50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Results
              </Button>
              <Button
                onClick={onBack}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
              >
                Back to Video
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Question Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="glass-card rounded-3xl border border-border/50 p-6"
          >
            <h3 className="mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Question Review
            </h3>
            <div className="space-y-3">
              {quizQuestions.map((q, index) => {
                const answer = answers.find((a) => a.questionId === q.id);
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      answer?.isCorrect
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Q{index + 1}</span>
                          <Badge className={getDifficultyColor(q.difficulty)}>{q.difficulty}</Badge>
                        </div>
                        <p className="text-sm mb-2">{q.question}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {answer?.timeSpent}s
                        </div>
                      </div>
                      {answer?.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-4 glass-card border border-border/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Quiz
          </Button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-1">Quiz Time!</h1>
              <p className="text-sm text-muted-foreground">{lectureTitle}</p>
            </div>
            <div className="glass-card rounded-2xl px-4 py-2 border border-border/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm tabular-nums">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="glass-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </span>
              <span className="text-sm">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {streak >= 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mt-3 text-sm text-orange-500"
              >
                <Zap className="w-4 h-4" />
                <span>{streak} question streak! 🔥</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card rounded-3xl border border-border/50 p-8 mb-6"
          >
            {/* Question Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
              <Badge variant="outline" className="border-border/50">
                {currentQuestion.type === 'multiple-choice' ? 'Multiple Choice' : 'True/False'}
              </Badge>
            </div>

            {/* Question */}
            <h2 className="mb-8">{currentQuestion.question}</h2>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const showCorrect = showExplanation && isCorrect;
                const showIncorrect = showExplanation && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    whileHover={!showExplanation ? { scale: 1.01, x: 4 } : {}}
                    whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                      showCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : showIncorrect
                          ? 'border-red-500 bg-red-500/10'
                          : isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 hover:border-primary/50 glass-card'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          showCorrect
                            ? 'border-green-500 bg-green-500'
                            : showIncorrect
                              ? 'border-red-500 bg-red-500'
                              : isSelected
                                ? 'border-primary bg-primary'
                                : 'border-border'
                        }`}
                      >
                        {showCorrect && <Check className="w-4 h-4 text-white" />}
                        {showIncorrect && <XCircle className="w-4 h-4 text-white" />}
                        {!showExplanation && (
                          <span
                            className={
                              isSelected
                                ? 'text-primary-foreground text-sm'
                                : 'text-muted-foreground text-sm'
                            }
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                        )}
                      </div>
                      <span className={showExplanation && (showCorrect || showIncorrect) ? '' : ''}>
                        {option}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card rounded-2xl p-6 border border-border/50 bg-blue-500/5 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2">Explanation</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {!showExplanation ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                size="lg"
              >
                Submit Answer
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                size="lg"
              >
                {isLastQuestion ? (
                  <>
                    View Results
                    <Trophy className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next Question
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="glass-card rounded-2xl p-4 border border-border/50 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <div className="text-xl mb-1">{answers.filter((a) => a.isCorrect).length}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-border/50 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
            <div className="text-xl mb-1">{answers.filter((a) => !a.isCorrect).length}</div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-border/50 text-center">
            <Star className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
            <div className="text-xl mb-1">{bestStreak}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
