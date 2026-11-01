/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QuizQuestion, VocabularyTerm } from '../types/quiz';
import { SceneIllustration } from './SceneIllustration';
import { RousseauConsole } from './RousseauConsole';
import { VOCABULARY_LIST } from '../data/vocabulary';
import { Volume2, BookOpen, CheckCircle2, XCircle, Bookmark, Star, HelpCircle } from 'lucide-react';
import { soundManager, speakArabic } from '../utils/sound';

interface QuestionCardProps {
  question: QuizQuestion;
  currentIndex: number;
  totalQuestions: number;
  selectedAnswers: number[];
  hasValidated: boolean;
  isCorrect?: boolean;
  onToggleAnswer: (id: number) => void;
  onClearAnswers: () => void;
  onValidate: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
  onOpenDetailedModal: () => void;
  onSelectTerm: (term: VocabularyTerm) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isExamMode?: boolean;
  timeLeftSeconds?: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswers,
  hasValidated,
  isCorrect,
  onToggleAnswer,
  onClearAnswers,
  onValidate,
  onNext,
  onPrevious,
  onExit,
  onOpenDetailedModal,
  onSelectTerm,
  isBookmarked,
  onToggleBookmark,
  isExamMode,
  timeLeftSeconds,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingOptionId, setPlayingOptionId] = useState<number | null>(null);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(() => {
    try {
      return localStorage.getItem('siyaqati_autoplay') === 'true';
    } catch {
      return false;
    }
  });

  const relatedTerms = VOCABULARY_LIST.filter((t) => question.keyTermIds.includes(t.id));

  // Subscribe to global speech engine state
  useEffect(() => {
    const unsubscribe = soundManager.subscribeSpeaking((speaking) => {
      setIsPlayingAudio(speaking);
      if (!speaking) {
        setPlayingOptionId(null);
      }
    });
    return () => {
      unsubscribe();
      soundManager.stopSpeaking();
    };
  }, [question.id]);

  const numberToArabicWord = (n: number): string => {
    switch (n) {
      case 1:
        return 'واحد';
      case 2:
        return 'اثنان';
      case 3:
        return 'ثلاثة';
      case 4:
        return 'أربعة';
      default:
        return `${n}`;
    }
  };

  const handleSpeakQuestion = () => {
    if (isPlayingAudio) {
      soundManager.stopSpeaking();
    } else {
      setPlayingOptionId(null);
      // Announce question prompt and all options in Arabic like official exam audio
      const optionsAnnouncement = question.options
        .map((opt) => `الجواب رقم ${numberToArabicWord(opt.id)}: ${opt.text}`)
        .join('. ');
      const speechText = `${question.questionText}. ${optionsAnnouncement}.`;
      speakArabic(speechText);
    }
  };

  // Auto-play question and options when enabled and navigating to a new question
  useEffect(() => {
    if (!autoPlayAudio || hasValidated) return;
    const timer = setTimeout(() => {
      const optionsAnnouncement = question.options
        .map((opt) => `الجواب رقم ${numberToArabicWord(opt.id)}: ${opt.text}`)
        .join('. ');
      const speechText = `${question.questionText}. ${optionsAnnouncement}.`;
      speakArabic(speechText);
    }, 450);

    return () => {
      clearTimeout(timer);
      soundManager.stopSpeaking();
    };
  }, [question.id, autoPlayAudio]);

  const handleSpeakSingleOption = (optId: number, optText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.stopSpeaking();
    setPlayingOptionId(optId);
    speakArabic(`الجواب رقم ${numberToArabicWord(optId)}: ${optText}.`);
  };

  const toggleAutoPlay = () => {
    const nextVal = !autoPlayAudio;
    setAutoPlayAudio(nextVal);
    soundManager.playClick();
    try {
      localStorage.setItem('siyaqati_autoplay', String(nextVal));
    } catch {}
    if (!nextVal) {
      soundManager.stopSpeaking();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 animate-in fade-in duration-200" dir="rtl">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between bg-slate-800/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="bg-red-600 text-white font-black text-xs sm:text-sm px-3 py-1 rounded-lg shadow-sm">
            السؤال {currentIndex + 1} / {totalQuestions}
          </div>
          <div className="bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-lg">
            سلسلة {question.serie} • صنف ب
          </div>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
            {question.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-play toggle button */}
          <button
            onClick={toggleAutoPlay}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              autoPlayAudio
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="تشغيل القراءة الصوتية باللغة العربية تلقائياً عند ظهور أي سؤال جديد"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">صوت تلقائي:</span>
            <span>{autoPlayAudio ? 'مُفعّل' : 'معطّل'}</span>
          </button>

          {isExamMode && typeof timeLeftSeconds === 'number' && (
            <div
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 border ${
                timeLeftSeconds <= 10
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-900 text-slate-200 border-slate-700'
              }`}
            >
              ⏱ {Math.floor(timeLeftSeconds / 60)}:
              {(timeLeftSeconds % 60).toString().padStart(2, '0')}
            </div>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleBookmark();
            }}
            className={`p-2 rounded-xl transition-all border ${
              isBookmarked
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-amber-400 border-slate-700'
            }`}
            title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ السؤال للمراجعة لاحقاً'}
            aria-label="حفظ السؤال"
          >
            <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
        {/* Driving Scene Graphic from PDF */}
        <SceneIllustration
          sceneType={question.sceneType}
          badgeTitle={question.badgeTitle}
          questionNumber={question.questionNumber}
          imageUrl={question.imageUrl}
          fullSlideUrl={question.fullSlideUrl}
          hasValidated={hasValidated}
        />

        {/* Question Text Box with Speech */}
        <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 flex items-start justify-between gap-3 shadow-inner">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-white leading-relaxed">
              {question.questionText}
            </h2>
            {question.subQuestionText && (
              <p className="text-sm font-semibold text-slate-300">{question.subQuestionText}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPlayingAudio && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
                <span className="flex items-end gap-0.5 h-3">
                  <span className="w-1 bg-amber-400 h-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 bg-amber-400 h-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 bg-amber-400 h-1.5 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>جاري قراءة السؤال...</span>
              </span>
            )}
            <button
              onClick={handleSpeakQuestion}
              className={`px-3.5 py-2.5 rounded-xl transition-all border flex items-center gap-2 active:scale-95 shadow-md ${
                isPlayingAudio
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/30'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border-slate-700'
              }`}
              title={isPlayingAudio ? 'إيقاف الصوت' : 'استمع للسؤال والخيارات بصوت واضح'}
              aria-label="استمع للسؤال والخيارات"
            >
              <Volume2 className={`w-5 h-5 shrink-0 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-bold whitespace-nowrap">
                {isPlayingAudio ? 'إيقاف الصوت' : 'استمع للسؤال والخيارات'}
              </span>
            </button>
          </div>
        </div>

        {/* Options List */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((opt) => {
            const isSelected = selectedAnswers.includes(opt.id);
            const isAnswerCorrect = question.correctAnswers.includes(opt.id);

            // Styling state after validation
            let optionStyle =
              'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-500';
            if (isSelected && !hasValidated) {
              optionStyle =
                'bg-emerald-950/40 border-emerald-500 text-white ring-2 ring-emerald-500/30';
            } else if (hasValidated) {
              if (isAnswerCorrect) {
                optionStyle =
                  'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/40';
              } else if (isSelected && !isAnswerCorrect) {
                optionStyle =
                  'bg-rose-950/60 border-rose-500 text-rose-100 ring-2 ring-rose-500/40';
              }
            }

            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!hasValidated) {
                    onToggleAnswer(opt.id);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !hasValidated) {
                    e.preventDefault();
                    onToggleAnswer(opt.id);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] select-none ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="leading-snug">{opt.text}</span>
                  <button
                    type="button"
                    onClick={(e) => handleSpeakSingleOption(opt.id, opt.text, e)}
                    className={`p-1.5 rounded-lg transition shrink-0 ${
                      playingOptionId === opt.id
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700/80'
                    }`}
                    title={`استمع للجواب ${opt.id} فقط`}
                    aria-label={`استمع للجواب رقم ${opt.id} فقط`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${playingOptionId === opt.id ? 'animate-bounce' : ''}`} />
                  </button>
                </div>

                {/* Right side check icon */}
                <div className="shrink-0">
                  {hasValidated ? (
                    isAnswerCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        صحيح
                      </span>
                    ) : isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-1 rounded-md border border-rose-500/30">
                        <XCircle className="w-4 h-4" />
                        خطأ
                      </span>
                    ) : null
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanations & Target Terms Preview (Visible after validation or in practice mode) */}
        {hasValidated && (
          <div className="pt-2 border-t border-slate-800 space-y-4 animate-in fade-in duration-300">
            {/* Quick explanation banner */}
            <div
              className={`p-4 rounded-xl border flex flex-col gap-2 ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      أحسنت! إجابتك صحيحة
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      إجابة غير صحيحة
                    </>
                  )}
                </span>
                <button
                  onClick={onOpenDetailedModal}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-4"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  عرض الشرح الكامل والمصطلحات
                </button>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                {question.explanation}
              </p>
            </div>

            {/* Vocabulary Terms Chips */}
            {relatedTerms.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>المصطلحات المستفادة من هذا السؤال (انقر للتعريف):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {relatedTerms.map((term) => (
                    <button
                      key={term.id}
                      onClick={() => onSelectTerm(term)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                    >
                      <span>{term.termArabic}</span>
                      <span className="text-[10px] text-indigo-300/80 font-mono">
                        ({term.termFrench})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rousseau Console Bottom Bar */}
      <RousseauConsole
        selectedAnswers={selectedAnswers}
        onToggleAnswer={onToggleAnswer}
        onClearAnswers={onClearAnswers}
        onValidate={onValidate}
        onNext={onNext}
        onPrevious={onPrevious}
        onExit={onExit}
        canGoNext={currentIndex < totalQuestions - 1}
        canGoPrevious={currentIndex > 0}
        hasValidated={hasValidated}
        isExamMode={isExamMode}
      />
    </div>
  );
};
