/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizQuestion, QuizSession, UserAnswer, UserProgress } from '../types/quiz';

/**
 * Checks if the user's selected option IDs match the correct answer IDs exactly
 */
export function evaluateAnswer(selected: number[], correct: number[]): boolean {
  if (!selected || selected.length === 0) return false;
  if (selected.length !== correct.length) return false;

  const sortedSelected = [...selected].sort((a, b) => a - b);
  const sortedCorrect = [...correct].sort((a, b) => a - b);

  return sortedSelected.every((val, index) => val === sortedCorrect[index]);
}

/**
 * Calculates score and whether the user passed the Moroccan driving test criteria (>= 80% or 32/40)
 */
export function calculateQuizResults(answers: Record<number, UserAnswer> | UserAnswer[]): {
  score: number;
  total: number;
  percentage: number;
  isPassed: boolean;
} {
  const answerList = Array.isArray(answers) ? answers : Object.values(answers);
  const total = answerList.length;
  if (total === 0) {
    return { score: 0, total: 0, percentage: 0, isPassed: false };
  }

  const score = answerList.filter((a) => a.isCorrect).length;
  const percentage = Math.round((score / total) * 100);

  // In Morocco driving license exam, passing is 32/40 (80%)
  const isPassed = percentage >= 80;

  return { score, total, percentage, isPassed };
}

/**
 * Initial empty progress for fresh state or after reset
 */
export function getDefaultProgress(): UserProgress {
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    currentStreak: 0,
    bestScore: 0,
    completedQuizzes: [],
    mistakeQuestionIds: [],
    bookmarkedQuestionIds: [],
    categoryStats: {},
    reviewedTermIds: [],
  };
}

/**
 * Updates persistent progress after a quiz session or answer
 */
export function updateUserProgress(prev: UserProgress, session: QuizSession): UserProgress {
  const answersList = Object.values(session.answers);
  const newlyCorrect = answersList.filter((a) => a.isCorrect).length;
  const newlyIncorrect = answersList.filter((a) => !a.isCorrect).length;

  // Mistakes tracker
  const newMistakes = new Set(prev.mistakeQuestionIds);
  answersList.forEach((ans) => {
    if (ans.isCorrect) {
      newMistakes.delete(ans.questionId); // Mastered!
    } else {
      newMistakes.add(ans.questionId);
    }
  });

  // Category stats update
  const updatedCategoryStats = { ...prev.categoryStats };

  // Calculate streak: increment if passed, else reset
  const currentStreak = session.isPassed ? prev.currentStreak + 1 : 0;
  const bestScore = Math.max(prev.bestScore, session.percentage);

  return {
    ...prev,
    totalAnswered: prev.totalAnswered + answersList.length,
    totalCorrect: prev.totalCorrect + newlyCorrect,
    totalIncorrect: prev.totalIncorrect + newlyIncorrect,
    currentStreak,
    bestScore,
    completedQuizzes: [session, ...prev.completedQuizzes].slice(0, 30), // keep latest 30
    mistakeQuestionIds: Array.from(newMistakes),
    categoryStats: updatedCategoryStats,
  };
}

/**
 * Filter questions based on series, category, mistakes, or key terms
 */
export function filterQuestions(
  questions: QuizQuestion[],
  filters: {
    serie?: number | 'all';
    category?: string | 'all';
    mistakeOnly?: boolean;
    mistakeIds?: number[];
    termId?: string;
  }
): QuizQuestion[] {
  return questions.filter((q) => {
    if (filters.serie && filters.serie !== 'all' && q.serie !== filters.serie) {
      return false;
    }
    if (filters.category && filters.category !== 'all' && q.category !== filters.category) {
      return false;
    }
    if (filters.mistakeOnly) {
      const mistakes = filters.mistakeIds || [];
      if (!mistakes.includes(q.id)) {
        return false;
      }
    }
    if (filters.termId && !q.keyTermIds.includes(filters.termId)) {
      return false;
    }
    return true;
  });
}

/**
 * Computes readiness assessment for the official Moroccan exam
 */
export function getReadinessLevel(progress: UserProgress): {
  status: string;
  percentage: number;
  color: string;
  badge: string;
  advice: string;
} {
  if (progress.totalAnswered === 0) {
    return {
      status: 'لم تبدأ بعد',
      percentage: 0,
      color: 'text-slate-400',
      badge: 'bg-slate-700 text-slate-300',
      advice: 'ابدأ بالاختبارات والتدرب على المصطلحات لبناء تقييمك.',
    };
  }

  const successRate = Math.round((progress.totalCorrect / progress.totalAnswered) * 100);

  if (successRate >= 85 && progress.totalAnswered >= 30) {
    return {
      status: 'جاهز للامتحان بنجاح ممتاز',
      percentage: successRate,
      color: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      advice: 'مستواك ممتاز ومطابق لمعايير اجتياز امتحان رخصة السياقة بامتياز!',
    };
  }

  if (successRate >= 75) {
    return {
      status: 'مستوى متقدم - قربت من النجاح',
      percentage: successRate,
      color: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      advice: 'أنت قريب جداً من عتبة النجاح (32/40). راجع بنك الأخطاء ومصطلحات المسافات.',
    };
  }

  return {
    status: 'بحاجة إلى مزيد من التدريب',
    percentage: successRate,
    color: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    advice: 'ركز على مصطلحات التشوير وقواعد أسبقية المرور وعقوبات النقط.',
  };
}
