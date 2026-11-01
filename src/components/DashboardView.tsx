/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProgress, QuizQuestion, VocabularyTerm } from '../types/quiz';
import { QUESTIONS_DATABASE } from '../data/questions';
import { VOCABULARY_LIST } from '../data/vocabulary';
import { getReadinessLevel } from '../utils/quizEngine';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Flame,
  Scale,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface DashboardViewProps {
  progress: UserProgress;
  onResetProgress: () => void;
  onStartMistakesQuiz: () => void;
  onSelectQuestion: (question: QuizQuestion) => void;
  onSelectTerm: (term: VocabularyTerm) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  progress,
  onResetProgress,
  onStartMistakesQuiz,
  onSelectQuestion,
  onSelectTerm,
}) => {
  const readiness = getReadinessLevel(progress);
  const successRate =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  // Find missed questions
  const mistakeQuestions = QUESTIONS_DATABASE.filter((q) =>
    progress.mistakeQuestionIds.includes(q.id)
  );

  // Extract terms from missed questions
  const weakTermIds = new Set<string>();
  mistakeQuestions.forEach((q) => {
    q.keyTermIds.forEach((tId) => weakTermIds.add(tId));
  });
  const weakTerms = VOCABULARY_LIST.filter((t) => weakTermIds.has(t.id));

  // Compute category statistics dynamically
  const categoriesList = [
    'قواعد السير والأسبقية',
    'التشوير الطرقي والعلامات',
    'الأمان ومسافات السير',
    'الميكانيك والمراقبة التقنية',
    'الرؤية والإنارة',
    'رخصة السياقة والمخالفات والجنح',
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200" dir="rtl">
      {/* Welcome & Readiness Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border bg-slate-800/80 text-amber-400 border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              لوحة تتبع التقدم والجاهزية للامتحان
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              تقييم الأداء ونسبة الإجابات الصحيحة والخاطئة
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              تتبع مستواك في أسئلة كود السياقة المغربي صنف (ب)، واكتشف أسباب الأجوبة الصحيحة والمصطلحات التي تتطلب مراجعة.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-black border ${readiness.badge}`}>
                {readiness.status}
              </span>
              <p className="text-xs text-slate-400">{readiness.advice}</p>
            </div>
          </div>

          {/* Big Gauge Card */}
          <div className="w-full sm:w-auto bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shrink-0 min-w-[200px] text-center shadow-lg">
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
              {successRate}%
            </div>
            <div className="text-xs font-bold text-slate-400 mt-1">نسبة النجاح العامة</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              (عتبة الامتحان بالمغرب: 80% أي 32/40)
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Correct vs Incorrect vs Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400">إجمالي الأسئلة المنجزة</div>
            <div className="text-2xl font-black text-white mt-1">{progress.totalAnswered}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">سؤال تم الإجابة عليه</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-400">الإجابات الصحيحة (Right)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{progress.totalCorrect}</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">
              {progress.totalAnswered > 0
                ? `${Math.round((progress.totalCorrect / progress.totalAnswered) * 100)}% من المجموع`
                : '0%'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-400">الإجابات الخاطئة (False)</div>
            <div className="text-2xl font-black text-rose-400 mt-1">{progress.totalIncorrect}</div>
            <div className="text-[11px] text-rose-500/80 mt-0.5">
              {progress.mistakeQuestionIds.length} سؤال في بنك الأخطاء
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-400">تسلسل النجاح المتتالي</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{progress.currentStreak} 🔥</div>
            <div className="text-[11px] text-slate-500 mt-0.5">اختبارات ناجحة متتالية</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ratio Comparison Bar: Right vs Wrong */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            توزيع الإجابات: الصحيحة مقابل الخاطئة
          </h3>
          <span className="text-xs text-slate-400">
            {progress.totalAnswered} سؤال مسجل
          </span>
        </div>

        {progress.totalAnswered > 0 ? (
          <div className="space-y-2">
            <div className="w-full h-5 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${(progress.totalCorrect / progress.totalAnswered) * 100}%` }}
                className="bg-emerald-500 transition-all duration-500 h-full flex items-center justify-center text-[10px] font-bold text-slate-950"
              >
                {progress.totalCorrect > 0 && `${Math.round((progress.totalCorrect / progress.totalAnswered) * 100)}%`}
              </div>
              <div
                style={{ width: `${(progress.totalIncorrect / progress.totalAnswered) * 100}%` }}
                className="bg-rose-500 transition-all duration-500 h-full flex items-center justify-center text-[10px] font-bold text-white"
              >
                {progress.totalIncorrect > 0 && `${Math.round((progress.totalIncorrect / progress.totalAnswered) * 100)}%`}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>إجابات صحيحة ({progress.totalCorrect})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>إجابات خاطئة ({progress.totalIncorrect})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80">
            لم تبدأ الاختبارات بعد. ابدأ الآن بحل سلسلة تدريبية لحساب نسب الإجابات!
          </div>
        )}
      </div>

      {/* Mistakes & Weak Areas Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missed questions with "Why" */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">
                بنك الأخطاء ({mistakeQuestions.length})
              </h3>
            </div>
            {mistakeQuestions.length > 0 && (
              <button
                onClick={onStartMistakesQuiz}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm"
              >
                تدرب على الأخطاء الآن
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            الأسئلة التي أجبت عليها خطأ. انقر على السؤال لمعرفة سبب الجواب الصحيح والمصطلحات المرتبطة به.
          </p>

          {mistakeQuestions.length > 0 ? (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {mistakeQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => onSelectQuestion(q)}
                  className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/60 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        سلسلة {q.serie} - س{q.questionNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{q.category}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors line-clamp-1">
                      {q.questionText}
                    </p>
                    <p className="text-[11px] text-amber-300/80 line-clamp-1">
                      💡 السبب: {q.explanation}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 shrink-0 mt-1 transition-transform group-hover:-translate-x-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/60 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              لا توجد أخطاء حالياً! رائع، إجاباتك كلها موفقة أو لم تبدأ بعد.
            </div>
          )}
        </div>

        {/* Weak Vocabulary Terms to Revise */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              مصطلحات تحتاج مراجعة ({weakTerms.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            مصطلحات وقواعد ظهرت في الأسئلة التي تعثرت فيها؛ انقر لقراءة وفهم الشرح المفصل والنصيحة الرسمية.
          </p>

          {weakTerms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {weakTerms.map((term) => (
                <div
                  key={term.id}
                  onClick={() => onSelectTerm(term)}
                  className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-200 group-hover:text-amber-300">
                      {term.termArabic}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {term.termFrench}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {term.shortDefinition}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/60 text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              كافة المصطلحات مستوعبة حتى الآن! تصفح معجم المصطلحات لاكتشاف المزيد.
            </div>
          )}
        </div>
      </div>

      {/* Recent Exam History */}
      {progress.completedQuizzes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            سجل الاختبارات الأخيرة ({progress.completedQuizzes.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">النمط</th>
                  <th className="p-3">النتيجة</th>
                  <th className="p-3">النسبة</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {progress.completedQuizzes.map((session, i) => (
                  <tr key={session.id || i} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 text-slate-300 font-mono">{session.date}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {session.mode === 'exam' ? 'امتحان رسمي' : 'تدريب حر'}
                    </td>
                    <td className="p-3 font-bold text-white">
                      {session.correctCount} / {session.totalQuestions}
                    </td>
                    <td className="p-3 font-mono font-bold">{session.percentage}%</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.isPassed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {session.isPassed ? 'ناجح' : 'راسب'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Progress Action */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-800">
        <div className="text-xs text-slate-400">
          يتم حفظ تقدمك تلقائياً في المتصفح. يمكنك تصفير الإحصائيات للبدء من جديد.
        </div>
        <button
          onClick={() => {
            soundManager.playClick();
            if (window.confirm('هل أنت متأكد من رغبتك في تصفير جميع الإحصائيات وبنك الأخطاء؟')) {
              onResetProgress();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 text-xs font-bold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تصفير الإحصائيات</span>
        </button>
      </div>
    </div>
  );
};
