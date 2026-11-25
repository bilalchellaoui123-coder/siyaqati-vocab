/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Check, Power } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface RousseauConsoleProps {
  selectedAnswers: number[];
  onToggleAnswer: (num: number) => void;
  onClearAnswers: () => void;
  onValidate: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  hasValidated: boolean;
  isExamMode?: boolean;
}

export const RousseauConsole: React.FC<RousseauConsoleProps> = ({
  selectedAnswers,
  onToggleAnswer,
  onClearAnswers,
  onValidate,
  onNext,
  onPrevious,
  onExit,
  canGoNext,
  canGoPrevious,
  hasValidated,
  isExamMode,
}) => {
  // Keyboard bindings like real Rousseau test machines
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        onToggleAnswer(parseInt(e.key, 10));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!hasValidated && selectedAnswers.length > 0) {
          onValidate();
        } else if (hasValidated && canGoNext) {
          onNext();
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onClearAnswers();
      } else if (e.key === 'ArrowLeft' && canGoNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowRight' && canGoPrevious) {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnswers, hasValidated, canGoNext, canGoPrevious, onToggleAnswer, onValidate, onNext, onPrevious, onClearAnswers]);

  return (
    <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 border-t-2 border-slate-700/80 p-2.5 sm:p-4 shadow-2xl rounded-xl sm:rounded-2xl select-none pb-safe" dir="rtl">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Rousseau Numeric Dial Pad: 1, 2, 3, 4 (Top row on mobile for immediate thumb reach) */}
        <div className="grid grid-cols-4 md:flex items-center gap-2 sm:gap-3 w-full md:w-auto md:order-2">
          {[1, 2, 3, 4].map((num) => {
            const isSelected = selectedAnswers.includes(num);
            return (
              <button
                key={num}
                onClick={() => onToggleAnswer(num)}
                className={`relative h-12 md:w-14 md:h-14 rounded-xl font-black text-xl sm:text-2xl transition-all flex items-center justify-center border-2 active:scale-95 shadow-md tabular-nums ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/40 ring-2 sm:ring-4 ring-emerald-500/30 -translate-y-0.5'
                    : 'bg-slate-900/90 border-slate-600 hover:border-slate-400 text-white hover:bg-slate-800'
                }`}
                aria-label={`الزر رقم ${num}`}
              >
                {num}
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action + Navigation Deck (Single compact row on mobile, split on desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto md:order-1">
          <button
            onClick={() => {
              soundManager.playClick();
              onPrevious();
            }}
            disabled={!canGoPrevious}
            className={`min-h-[44px] flex items-center justify-center gap-1 px-2.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm border transition-all shrink-0 ${
              canGoPrevious
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-sm'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            aria-label="السابق"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">السابق</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onExit();
            }}
            className="min-h-[44px] flex items-center justify-center gap-1 px-2.5 sm:px-3.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/50 font-bold text-xs sm:text-sm transition-all shrink-0"
            title="إنهاء والعودة للرئيسية"
            aria-label="خروج"
          >
            <Power className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>

          {/* Mobile inline Clear + Validate/Next buttons; Desktop shows Next here and Actions on right */}
          <button
            onClick={() => {
              soundManager.playClick();
              onNext();
            }}
            disabled={!canGoNext}
            className={`hidden md:flex min-h-[44px] items-center gap-1.5 px-4 rounded-xl font-bold text-sm border transition-all ${
              canGoNext
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-sm'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <span>التالي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Mobile-only compact Clear + Validate/Next in same row */}
          <button
            onClick={() => {
              soundManager.playClick();
              onClearAnswers();
            }}
            disabled={selectedAnswers.length === 0 || hasValidated}
            className={`md:hidden min-h-[44px] flex items-center justify-center gap-1 px-3 rounded-xl font-bold text-xs border transition-all shrink-0 ${
              selectedAnswers.length > 0 && !hasValidated
                ? 'bg-slate-700 text-amber-300 border-slate-600'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصحيح</span>
          </button>

          {!hasValidated ? (
            <button
              onClick={() => {
                soundManager.playClick();
                onValidate();
              }}
              disabled={selectedAnswers.length === 0}
              className={`md:hidden flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 rounded-xl font-black text-xs border shadow-lg transition-all ${
                selectedAnswers.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30 active:scale-95'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>تأكيد (Valider)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                soundManager.playClick();
                onNext();
              }}
              className="md:hidden flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <span>{canGoNext ? 'السؤال الموالي' : 'إنهاء وعرض النتيجة'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {!hasValidated && (
            <button
              onClick={() => {
                soundManager.playClick();
                onNext();
              }}
              disabled={!canGoNext}
              className={`md:hidden min-h-[44px] flex items-center justify-center px-2.5 rounded-xl font-bold text-xs border transition-all shrink-0 ${
                canGoNext
                  ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-sm'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
              aria-label="التالي"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Desktop Action Buttons: Correction & Valider */}
        <div className="hidden md:flex items-center gap-2 md:order-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onClearAnswers();
            }}
            disabled={selectedAnswers.length === 0 || hasValidated}
            className={`min-h-[44px] flex items-center gap-1 px-3.5 rounded-xl font-bold text-sm border transition-all ${
              selectedAnswers.length > 0 && !hasValidated
                ? 'bg-slate-700 hover:bg-amber-600/30 hover:border-amber-500 text-amber-300 border-slate-600'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصحيح</span>
          </button>

          {!hasValidated ? (
            <button
              onClick={() => {
                soundManager.playClick();
                onValidate();
              }}
              disabled={selectedAnswers.length === 0}
              className={`min-h-[44px] flex items-center gap-1.5 px-6 rounded-xl font-bold text-sm border shadow-lg transition-all ${
                selectedAnswers.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30 active:scale-95'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>تأكيد (Valider)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                soundManager.playClick();
                onNext();
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <span>{canGoNext ? 'السؤال الموالي' : 'إنهاء وعرض النتيجة'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
