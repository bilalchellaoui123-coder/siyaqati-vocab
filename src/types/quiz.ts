/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestionCategory =
  | 'قواعد السير والأسبقية'
  | 'التشوير الطرقي والعلامات'
  | 'الأمان ومسافات السير'
  | 'الميكانيك والمراقبة التقنية'
  | 'الرؤية والإنارة'
  | 'رخصة السياقة والمخالفات والجنح';

export interface VocabularyTerm {
  id: string;
  termArabic: string;
  termFrench: string;
  darijaPronunciation?: string;
  category: QuestionCategory;
  shortDefinition: string;
  detailedExplanation: string;
  examTip: string;
  audioText: string;
  relatedQuestionIds?: number[];
}

export interface QuestionOption {
  id: number;
  text: string;
  part?: 1 | 2; // For questions with two sub-parts (e.g. 1/2 and 3/4)
}

export interface QuizQuestion {
  id: number;
  serie: number; // 1, 2, 5, 6
  questionNumber: number;
  category: QuestionCategory;
  questionText: string;
  subQuestionText?: string;
  sceneType:
    | 'dashboard'
    | 'highway'
    | 'intersection'
    | 'night'
    | 'snow'
    | 'inspection'
    | 'police'
    | 'urban'
    | 'curves'
    | 'signs'
    | 'alcohol'
    | 'bus'
    | 'seatbelt';
  badgeTitle?: string;
  imageUrl?: string; // Path to cropped scene photo
  fullSlideUrl?: string; // Path to full original PDF slide
  options: QuestionOption[];
  correctAnswers: number[]; // e.g. [2] or [1, 3] or [2, 4]
  explanation: string; // لماذا تم اختيار هذا الجواب؟
  legalRule: string; // القاعدة في مدونة السير المغربية
  keyTermIds: string[]; // Associated vocabulary terms
}

export interface UserAnswer {
  questionId: number;
  selectedOptionIds: number[];
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface QuizSession {
  id: string;
  mode: 'exam' | 'practice' | 'vocab_drill' | 'mistakes';
  date: string;
  serie?: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  percentage: number;
  isPassed: boolean;
  answers: Record<number, UserAnswer>;
}

export interface UserProgress {
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  currentStreak: number;
  bestScore: number;
  completedQuizzes: QuizSession[];
  mistakeQuestionIds: number[];
  bookmarkedQuestionIds: number[];
  categoryStats: Record<string, { total: number; correct: number }>;
  reviewedTermIds: string[];
}
