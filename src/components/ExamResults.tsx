/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { QuizQuestion, QuizSession, VocabularyTerm } from '../types/quiz';
import { QUESTIONS_DATABASE } from '../data/questions';
import { VOCABULARY_LIST } from '../data/vocabulary';
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Filter,
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface ExamResultsProps {
  session: QuizSession;
  onRetake: () => void;
  onGoToDashboard: () => void;
  onSelectTerm: (term: VocabularyTerm) => void;
  onPracticeMistakesOnly: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  session,
  onRetake,
  onGoToDashboard,
  onSelectTerm,
  onPracticeMistakesOnly,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'mistakes'>('all');

  useEffect(() => {
    if (session.isPassed) {
      soundManager.playFanfare();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [session.isPassed]);

  const questionsMap = new Map<number, QuizQuestion>();
  QUESTIONS_DATABASE.forEach((q) => questionsMap.set(q.id, q));

  const answersList = Object.values(session.answers);
  const mistakeAnswers = answersList.filter((a) => !a.isCorrect);

  const displayedAnswers = filterMode === 'mistakes' ? mistakeAnswers : answersList;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200" dir="rtl">
      {/* Result Hero Banner */}
      <div
        className={`relative overflow-hidden p-8 sm:p-10 rounded-3xl border shadow-2xl text-center space-y-4 ${
          session.isPassed
            ? 'bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 border-emerald-600/50'
            : 'bg-gradient-to-b from-rose-950 via-slate-900 to-slate-900 border-rose-600/50'
        }`}
      >
        <div className="inline-flex p-3 rounded-2xl bg-slate-950/70 border border-slate-800 mx-auto">
          {session.isPassed ? (
            <Award className="w-12 h-12 text-emerald-400" />
          ) : (
            <XCircle className="w-12 h-12 text-rose-400" />
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            {session.isPassed ? 'مبروك! اجتزت الاختبار بنجاح' : 'لم توفق هذه المرة'}
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            {session.isPassed
              ? 'أحسنت! نتيجتك تتجاوز الحد الأدنى المطلوب لاجتياز امتحان رخصة السياقة بالمغرب (32/40 أو 80%).'
              : 'تحتاج إلى 32 إجابة صحيحة من أصل 40 (أو 80%) للنجاح في الامتحان الرسمي. راجع أخطاءك وتدرب مجدداً!'}
          </p>
        </div>

        {/* Big Score Display */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400">النتيجة المحصلة</div>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              {session.score} / {session.totalQuestions}
            </div>
          </div>
          <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400">النسبة المئوية</div>
            <div
              className={`text-3xl sm:text-4xl font-black mt-1 ${
                session.isPassed ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {session.percentage}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onRetake();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة الاختبار من جديد</span>
          </button>

          {mistakeAnswers.length > 0 && (
            <button
              onClick={() => {
                soundManager.playClick();
                onPracticeMistakesOnly();
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تدرب على الأخطاء فقط ({mistakeAnswers.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              onGoToDashboard();
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة التقدم والإحصائيات</span>
          </button>
        </div>
      </div>

      {/* Detailed Questions Review */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              مراجعة الأسئلة والشروحات المفصلة
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              اطلع على كل سؤال وأسباب الإجابة الصحيحة والمصطلحات القانونية المستفادة.
            </p>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              جميع الأسئلة ({answersList.length})
            </button>
            <button
              onClick={() => setFilterMode('mistakes')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'mistakes' ? 'bg-rose-900 text-rose-200 shadow-sm' : 'text-slate-400'
              }`}
            >
              الخاطئة فقط ({mistakeAnswers.length})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {displayedAnswers.map((userAns, idx) => {
            const question = questionsMap.get(userAns.questionId);
            if (!question) return null;

            const relatedTerms = VOCABULARY_LIST.filter((t) =>
              question.keyTermIds.includes(t.id)
            );

            return (
              <div
                key={question.id}
                className={`p-5 rounded-2xl border transition-all ${
                  userAns.isCorrect
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-rose-950/20 border-rose-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${
                          userAns.isCorrect
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {userAns.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            صحيح
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            خطأ
                          </>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">
                        سلسلة {question.serie} - السؤال {question.questionNumber}
                      </span>
                      <span className="text-xs text-slate-500">• {question.category}</span>
                    </div>

                    <h4 className="text-base font-bold text-white mt-1">
                      {question.questionText}
                    </h4>

                    {/* Question Image from PDF */}
                    {question.imageUrl && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-700/80 max-h-36 max-w-sm bg-slate-950 flex items-center justify-center">
                        <img
                          src={question.imageUrl}
                          alt={`صورة السؤال ${question.questionNumber}`}
                          className="w-full h-full object-contain max-h-36"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Answers Breakdown */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-bold block mb-1">إجابتك:</span>
                    <div className="flex flex-wrap gap-1">
                      {userAns.selectedOptionIds.map((optId) => {
                        const opt = question.options.find((o) => o.id === optId);
                        return (
                          <span
                            key={optId}
                            className={`px-2 py-0.5 rounded font-bold ${
                              userAns.isCorrect
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            رقم {optId} ({opt?.text})
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-bold block mb-1">الجواب الصحيح:</span>
                    <div className="flex flex-wrap gap-1">
                      {question.correctAnswers.map((optId) => {
                        const opt = question.options.find((o) => o.id === optId);
                        return (
                          <span
                            key={optId}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                          >
                            رقم {optId} ({opt?.text})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Why it was chosen */}
                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                  <strong className="text-amber-300 block mb-1">
                    💡 لماذا تم اختيار هذا الجواب؟
                  </strong>
                  {question.explanation}
                </div>

                {/* Vocabulary pills */}
                {relatedTerms.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 font-bold">مصطلحات السؤال:</span>
                    {relatedTerms.map((term) => (
                      <button
                        key={term.id}
                        onClick={() => onSelectTerm(term)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition"
                      >
                        {term.termArabic} ({term.termFrench})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
