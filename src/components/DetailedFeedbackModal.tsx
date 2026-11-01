/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QuizQuestion, VocabularyTerm } from '../types/quiz';
import { VOCABULARY_LIST } from '../data/vocabulary';
import { Volume2, CheckCircle2, XCircle, BookOpen, AlertTriangle, Scale, X } from 'lucide-react';
import { soundManager, speakArabic } from '../utils/sound';

interface DetailedFeedbackModalProps {
  question: QuizQuestion;
  userSelection: number[];
  isCorrect: boolean;
  onClose: () => void;
  onOpenTermDetails?: (term: VocabularyTerm) => void;
}

export const DetailedFeedbackModal: React.FC<DetailedFeedbackModalProps> = ({
  question,
  userSelection,
  isCorrect,
  onClose,
  onOpenTermDetails,
}) => {
  const relatedTerms = VOCABULARY_LIST.filter((t) => question.keyTermIds.includes(t.id));

  const handleSpeak = (text: string) => {
    soundManager.playClick();
    speakArabic(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between border-b ${
            isCorrect ? 'bg-emerald-950/60 border-emerald-800/60' : 'bg-rose-950/60 border-rose-800/60'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                <XCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {isCorrect ? 'إجابة صحيحة وممتازة!' : 'إجابة غير صحيحة'}
              </h3>
              <p className="text-xs text-slate-300">
                السؤال {question.questionNumber} • {question.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Question Scenario Image from PDF */}
          {question.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-700 max-h-52 bg-slate-950 flex items-center justify-center shadow-lg">
              <img
                src={question.imageUrl}
                alt={`صورة السؤال ${question.questionNumber}`}
                className="w-full h-full object-contain max-h-52"
              />
            </div>
          )}

          {/* Question Summary & Selected Answers */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-slate-200 leading-relaxed">
                {question.questionText}
              </p>
              <button
                onClick={() => handleSpeak(question.questionText)}
                className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition"
                title="استمع للسؤال"
                aria-label="قراءة السؤال صوتياً"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 font-medium">الجواب الصحيح:</span>
              {question.correctAnswers.map((ansId) => {
                const opt = question.options.find((o) => o.id === ansId);
                return (
                  <span
                    key={ansId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    رقم {ansId} ({opt?.text})
                  </span>
                );
              })}
            </div>
          </div>

          {/* Section: Why the correct answer was chosen */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <BookOpen className="w-4 h-4" />
              <h4>لماذا تم اختيار هذا الجواب؟ (الشرح والتعليل)</h4>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm leading-relaxed">
              {question.explanation}
            </div>
          </div>

          {/* Section: Legal basis according to Moroccan Highway code */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Scale className="w-4 h-4" />
              <h4>القاعدة في مدونة السير المغربية</h4>
            </div>
            <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/50 text-slate-200 text-sm leading-relaxed">
              {question.legalRule}
            </div>
          </div>

          {/* Section: Key Vocabulary Terms */}
          {relatedTerms.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <h4>المصطلحات المستهدفة في هذا السؤال ({relatedTerms.length})</h4>
                </div>
                <span className="text-xs text-slate-400">انقر على المصطلح لعرض بطاقته كاملة</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedTerms.map((term) => (
                  <div
                    key={term.id}
                    onClick={() => onOpenTermDetails && onOpenTermDetails(term)}
                    className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-100 text-sm group-hover:text-indigo-300 transition-colors">
                          {term.termArabic}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {term.termFrench}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(`${term.termArabic}. ${term.shortDefinition}`);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition"
                        title="استمع لنطق وشرح المصطلح"
                        aria-label={`استمع لنطق ${term.termArabic}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {term.shortDefinition}
                    </p>
                    <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded">
                      💡 {term.examTip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            فهمت، تابع الاختبار
          </button>
        </div>
      </div>
    </div>
  );
};
