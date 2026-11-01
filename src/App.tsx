/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { QuestionCard } from './components/QuestionCard';
import { DashboardView } from './components/DashboardView';
import { VocabularyHub } from './components/VocabularyHub';
import { ExamResults } from './components/ExamResults';
import { DetailedFeedbackModal } from './components/DetailedFeedbackModal';
import { TermCard } from './components/TermCard';
import { QUESTIONS_DATABASE } from './data/questions';
import { VOCABULARY_LIST } from './data/vocabulary';
import {
  QuizQuestion,
  UserAnswer,
  QuizSession,
  UserProgress,
  VocabularyTerm,
} from './types/quiz';
import {
  evaluateAnswer,
  calculateQuizResults,
  getDefaultProgress,
  updateUserProgress,
  filterQuestions,
} from './utils/quizEngine';
import { soundManager } from './utils/sound';
import { BookOpen, GraduationCap, AlertOctagon, RotateCcw, Filter, Sparkles, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'siyaqati_progress_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');
  const [selectedSerie, setSelectedSerie] = useState<number | 'all'>('all');
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Storage fallback
    }
    return getDefaultProgress();
  });

  const [isMuted, setIsMuted] = useState(false);

  // Active Quiz State
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() =>
    filterQuestions(QUESTIONS_DATABASE, { serie: 'all' })
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<number, UserAnswer>>({});
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(null);

  // Modals state
  const [selectedTerm, setSelectedTerm] = useState<VocabularyTerm | null>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);

  // Exam timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(30);

  // Save progress to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage fallback
    }
  }, [progress]);

  // Handle sound mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  // Start a quiz with specific filters
  const startQuiz = (mode: 'practice' | 'exam' | 'mistakes' | 'vocab_drill', serieFilter: number | 'all' = 'all') => {
    let pool: QuizQuestion[] = [];
    if (mode === 'mistakes') {
      pool = filterQuestions(QUESTIONS_DATABASE, {
        mistakeOnly: true,
        mistakeIds: progress.mistakeQuestionIds,
      });
      if (pool.length === 0) {
        // Fallback to all questions if no mistakes yet
        pool = [...QUESTIONS_DATABASE];
      }
    } else {
      pool = filterQuestions(QUESTIONS_DATABASE, { serie: serieFilter });
    }

    // Shuffle slightly for exam mode or take top 40/available
    if (mode === 'exam') {
      pool = [...pool].sort(() => 0.5 - Math.random());
    }

    setActiveQuestions(pool);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setHasValidated(false);
    setAnswersMap({});
    setCompletedSession(null);
    setTimeLeftSeconds(30);
  };

  // Switch tabs
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'exam') {
      startQuiz('exam', 'all');
    } else if (tab === 'practice') {
      startQuiz('practice', selectedSerie);
    } else if (tab === 'mistakes') {
      startQuiz('mistakes');
    }
  };

  const currentQuestion = activeQuestions[currentIndex];

  // Number toggling
  const handleToggleAnswer = (num: number) => {
    if (hasValidated && activeTab !== 'exam') return;
    soundManager.playClick();
    setSelectedAnswers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  const handleClearAnswers = () => {
    setSelectedAnswers([]);
  };

  // Validation
  const handleValidate = () => {
    if (!currentQuestion || selectedAnswers.length === 0) return;

    const isCorrect = evaluateAnswer(selectedAnswers, currentQuestion.correctAnswers);
    if (isCorrect) {
      soundManager.playCorrect();
    } else {
      soundManager.playWrong();
    }

    const answerRecord: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOptionIds: [...selectedAnswers],
      isCorrect,
    };

    const nextAnswers = {
      ...answersMap,
      [currentQuestion.id]: answerRecord,
    };
    setAnswersMap(nextAnswers);
    setHasValidated(true);

    // If it's Practice mode, immediately record and update progress
    if (activeTab === 'practice' || activeTab === 'mistakes') {
      const dummySession: QuizSession = {
        id: `sess_${Date.now()}`,
        mode: activeTab,
        date: new Date().toISOString().split('T')[0],
        totalQuestions: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1,
        score: isCorrect ? 1 : 0,
        percentage: isCorrect ? 100 : 0,
        isPassed: isCorrect,
        answers: { [currentQuestion.id]: answerRecord },
      };
      setProgress((prev) => updateUserProgress(prev, dummySession));
    }
  };

  // Navigation: Next
  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextQ = activeQuestions[nextIdx];
      const existingAns = answersMap[nextQ.id];

      if (existingAns) {
        setSelectedAnswers(existingAns.selectedOptionIds);
        setHasValidated(true);
      } else {
        setSelectedAnswers([]);
        setHasValidated(false);
      }
      setTimeLeftSeconds(30);
    } else {
      // Completed all questions in the quiz!
      finishSession();
    }
  };

  // Navigation: Previous
  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevQ = activeQuestions[prevIdx];
      const existingAns = answersMap[prevQ.id];

      if (existingAns) {
        setSelectedAnswers(existingAns.selectedOptionIds);
        setHasValidated(true);
      } else {
        setSelectedAnswers([]);
        setHasValidated(false);
      }
    }
  };

  const finishSession = () => {
    const results = calculateQuizResults(answersMap);
    const session: QuizSession = {
      id: `session_${Date.now()}`,
      mode: activeTab === 'exam' ? 'exam' : 'practice',
      date: new Date().toLocaleDateString('ar-MA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      totalQuestions: activeQuestions.length,
      correctCount: results.score,
      incorrectCount: results.total - results.score,
      score: results.score,
      percentage: results.percentage,
      isPassed: results.isPassed,
      answers: answersMap,
    };

    setCompletedSession(session);
    setProgress((prev) => updateUserProgress(prev, session));
  };

  // Bookmarking question
  const handleToggleBookmark = (qId: number) => {
    setProgress((prev) => {
      const isBookmarked = prev.bookmarkedQuestionIds.includes(qId);
      return {
        ...prev,
        bookmarkedQuestionIds: isBookmarked
          ? prev.bookmarkedQuestionIds.filter((id) => id !== qId)
          : [...prev.bookmarkedQuestionIds, qId],
      };
    });
  };

  // Filter practice series
  const handleSerieFilterChange = (serie: number | 'all') => {
    setSelectedSerie(serie);
    startQuiz('practice', serie);
  };

  // Direct practice on specific term
  const handleTestTermQuestions = (termId: string) => {
    const related = filterQuestions(QUESTIONS_DATABASE, { termId });
    if (related.length > 0) {
      setActiveQuestions(related);
      setCurrentIndex(0);
      setSelectedAnswers([]);
      setHasValidated(false);
      setAnswersMap({});
      setCompletedSession(null);
      setActiveTab('practice');
    } else {
      startQuiz('practice', 'all');
      setActiveTab('practice');
    }
  };

  // Direct practice on specific mistake question from dashboard
  const handleSelectMistakeQuestion = (q: QuizQuestion) => {
    setActiveQuestions([q]);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setHasValidated(false);
    setAnswersMap({});
    setCompletedSession(null);
    setActiveTab('practice');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]" dir="rtl">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        mistakesCount={progress.mistakeQuestionIds.length}
        streak={progress.currentStreak}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-16">
        {/* VIEW: Vocabulary Hub */}
        {activeTab === 'vocab' && (
          <VocabularyHub
            onSelectTerm={(term) => setSelectedTerm(term)}
            onTestTerm={handleTestTermQuestions}
          />
        )}

        {/* VIEW: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            progress={progress}
            onResetProgress={() => setProgress(getDefaultProgress())}
            onStartMistakesQuiz={() => {
              setActiveTab('mistakes');
              startQuiz('mistakes');
            }}
            onSelectQuestion={handleSelectMistakeQuestion}
            onSelectTerm={(term) => setSelectedTerm(term)}
          />
        )}

        {/* VIEW: Completed Exam Results */}
        {(activeTab === 'exam' || activeTab === 'practice' || activeTab === 'mistakes') &&
          completedSession && (
            <ExamResults
              session={completedSession}
              onRetake={() => startQuiz(completedSession.mode, selectedSerie)}
              onGoToDashboard={() => setActiveTab('dashboard')}
              onSelectTerm={(term) => setSelectedTerm(term)}
              onPracticeMistakesOnly={() => {
                setActiveTab('mistakes');
                startQuiz('mistakes');
              }}
            />
          )}

        {/* VIEW: Practice or Exam Question View */}
        {(activeTab === 'practice' || activeTab === 'exam' || activeTab === 'mistakes') &&
          !completedSession &&
          currentQuestion && (
            <div className="space-y-6">
              {/* Practice Mode Series Filter */}
              {activeTab === 'practice' && (
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <span>اختر السلسلة للتدرب:</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'all', label: 'جميع السلاسل (الكل)' },
                      { id: 5, label: 'سلسلة 5 (Cat B)' },
                      { id: 1, label: 'سلسلة 1 (Cat B)' },
                      { id: 6, label: 'سلسلة 6 (Cat B)' },
                      { id: 2, label: 'سلسلة 2 (Cat B)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSerieFilterChange(s.id as number | 'all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          selectedSerie === s.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mistakes Banner if in Mistakes Tab */}
              {activeTab === 'mistakes' && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl flex items-center justify-between text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>
                      أنت تتدرب الآن على بنك الأخطاء. بمجرد الإجابة الصحيحة سيتم حذف السؤال من قائمة الأخطاء تلقائياً.
                    </span>
                  </div>
                  <button
                    onClick={() => startQuiz('practice', 'all')}
                    className="underline text-rose-300 hover:text-white font-bold whitespace-nowrap"
                  >
                    العودة لجميع الأسئلة
                  </button>
                </div>
              )}

              {/* Interactive Question Card */}
              <QuestionCard
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={activeQuestions.length}
                selectedAnswers={selectedAnswers}
                hasValidated={hasValidated}
                isCorrect={answersMap[currentQuestion.id]?.isCorrect}
                onToggleAnswer={handleToggleAnswer}
                onClearAnswers={handleClearAnswers}
                onValidate={handleValidate}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onExit={() => setActiveTab('dashboard')}
                onOpenDetailedModal={() => setShowDetailedModal(true)}
                onSelectTerm={(term) => setSelectedTerm(term)}
                isBookmarked={progress.bookmarkedQuestionIds.includes(currentQuestion.id)}
                onToggleBookmark={() => handleToggleBookmark(currentQuestion.id)}
                isExamMode={activeTab === 'exam'}
                timeLeftSeconds={timeLeftSeconds}
              />
            </div>
          )}
      </main>

      {/* Modal: Detailed Legal and Reasoning Feedback */}
      {showDetailedModal && currentQuestion && (
        <DetailedFeedbackModal
          question={currentQuestion}
          userSelection={selectedAnswers}
          isCorrect={answersMap[currentQuestion.id]?.isCorrect ?? false}
          onClose={() => setShowDetailedModal(false)}
          onOpenTermDetails={(term) => {
            setShowDetailedModal(false);
            setSelectedTerm(term);
          }}
        />
      )}

      {/* Modal: Single Term Profile */}
      {selectedTerm && (
        <TermCard
          term={selectedTerm}
          onClose={() => setSelectedTerm(null)}
          onTestTerm={handleTestTermQuestions}
        />
      )}
    </div>
  );
}
