/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAnswer,
  calculateQuizResults,
  getDefaultProgress,
  updateUserProgress,
  filterQuestions,
  getReadinessLevel,
} from './quizEngine';
import { QuizQuestion, QuizSession } from '../types/quiz';

test('evaluateAnswer correctly evaluates single and multi-select answers', () => {
  // Single choice
  assert.equal(evaluateAnswer([2], [2]), true);
  assert.equal(evaluateAnswer([1], [2]), false);
  assert.equal(evaluateAnswer([], [2]), false);

  // Multi-choice (order-independent)
  assert.equal(evaluateAnswer([1, 3], [1, 3]), true);
  assert.equal(evaluateAnswer([3, 1], [1, 3]), true);
  assert.equal(evaluateAnswer([1], [1, 3]), false);
  assert.equal(evaluateAnswer([1, 3, 4], [1, 3]), false);
});

test('calculateQuizResults accurately computes pass/fail according to Moroccan 80% threshold', () => {
  const passingAnswers = [
    { questionId: 1, selectedOptionIds: [1], isCorrect: true },
    { questionId: 2, selectedOptionIds: [2], isCorrect: true },
    { questionId: 3, selectedOptionIds: [1], isCorrect: true },
    { questionId: 4, selectedOptionIds: [2], isCorrect: true },
    { questionId: 5, selectedOptionIds: [1], isCorrect: false },
  ]; // 4 out of 5 = 80%

  const resultPass = calculateQuizResults(passingAnswers);
  assert.equal(resultPass.score, 4);
  assert.equal(resultPass.total, 5);
  assert.equal(resultPass.percentage, 80);
  assert.equal(resultPass.isPassed, true);

  const failingAnswers = [
    { questionId: 1, selectedOptionIds: [1], isCorrect: true },
    { questionId: 2, selectedOptionIds: [2], isCorrect: false },
    { questionId: 3, selectedOptionIds: [1], isCorrect: false },
    { questionId: 4, selectedOptionIds: [2], isCorrect: true },
  ]; // 2 out of 4 = 50%

  const resultFail = calculateQuizResults(failingAnswers);
  assert.equal(resultFail.percentage, 50);
  assert.equal(resultFail.isPassed, false);
});

test('updateUserProgress tracks mistakes and maintains streak', () => {
  const initial = getDefaultProgress();
  assert.equal(initial.totalAnswered, 0);
  assert.equal(initial.currentStreak, 0);

  const session1: QuizSession = {
    id: 's1',
    mode: 'exam',
    date: '2026-10-31',
    totalQuestions: 2,
    correctCount: 1,
    incorrectCount: 1,
    score: 1,
    percentage: 50,
    isPassed: false,
    answers: {
      101: { questionId: 101, selectedOptionIds: [2], isCorrect: true },
      102: { questionId: 102, selectedOptionIds: [3], isCorrect: false },
    },
  };

  const updated1 = updateUserProgress(initial, session1);
  assert.equal(updated1.totalAnswered, 2);
  assert.equal(updated1.totalCorrect, 1);
  assert.equal(updated1.totalIncorrect, 1);
  assert.deepEqual(updated1.mistakeQuestionIds, [102]);
  assert.equal(updated1.currentStreak, 0);

  // Now user retakes question 102 and passes
  const session2: QuizSession = {
    id: 's2',
    mode: 'practice',
    date: '2026-10-31',
    totalQuestions: 1,
    correctCount: 1,
    incorrectCount: 0,
    score: 1,
    percentage: 100,
    isPassed: true,
    answers: {
      102: { questionId: 102, selectedOptionIds: [1], isCorrect: true },
    },
  };

  const updated2 = updateUserProgress(updated1, session2);
  // Mistake 102 should now be removed from mistakeQuestionIds because it was answered correctly
  assert.equal(updated2.mistakeQuestionIds.includes(102), false);
  assert.equal(updated2.currentStreak, 1);
});

test('filterQuestions properly filters by series and key term', () => {
  const mockQuestions: QuizQuestion[] = [
    {
      id: 1,
      serie: 5,
      questionNumber: 1,
      category: 'الأمان ومسافات السير',
      questionText: 'Q1',
      options: [],
      correctAnswers: [1],
      explanation: '',
      legalRule: '',
      keyTermIds: ['term_a'],
      sceneType: 'dashboard',
    },
    {
      id: 2,
      serie: 1,
      questionNumber: 1,
      category: 'التشوير الطرقي والعلامات',
      questionText: 'Q2',
      options: [],
      correctAnswers: [2],
      explanation: '',
      legalRule: '',
      keyTermIds: ['term_b'],
      sceneType: 'signs',
    },
  ];

  const serie5 = filterQuestions(mockQuestions, { serie: 5 });
  assert.equal(serie5.length, 1);
  assert.equal(serie5[0].id, 1);

  const termFilter = filterQuestions(mockQuestions, { termId: 'term_b' });
  assert.equal(termFilter.length, 1);
  assert.equal(termFilter[0].id, 2);
});

test('getReadinessLevel computes appropriate guidance based on stats', () => {
  const initial = getDefaultProgress();
  const unstarted = getReadinessLevel(initial);
  assert.equal(unstarted.status, 'لم تبدأ بعد');

  const readyProgress = {
    ...initial,
    totalAnswered: 40,
    totalCorrect: 36,
    totalIncorrect: 4,
  };
  const ready = getReadinessLevel(readyProgress);
  assert.equal(ready.percentage, 90);
  assert.equal(ready.status.includes('جاهز'), true);
});
