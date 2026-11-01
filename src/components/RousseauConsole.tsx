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
    <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 border-t-2 border-slate-700/80 p-3 sm:p-4 shadow-2xl rounded-2xl select-none" dir="rtl">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Controls: Previous / Exit / Next */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => {
              soundManager.playClick();
              onPrevious();
            }}
            disabled={!canGoPrevious}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
              canGoPrevious
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-sm'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onExit();
            }}
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/50 font-bold text-xs sm:text-sm transition-all"
            title="إنهاء والعودة للرئيسية"
          >
            <Power className="w-4 h-4" />
            <span>خروج</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onNext();
            }}
            disabled={!canGoNext}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
              canGoNext
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-sm'
                : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            <span>التالي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Rousseau Numeric Dial Pad: 1, 2, 3, 4 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((num) => {
            const isSelected = selectedAnswers.includes(num);
            return (
              <button
                key={num}
                onClick={() => onToggleAnswer(num)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl font-black text-xl sm:text-2xl transition-all flex items-center justify-center border-2 active:scale-95 shadow-md ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/40 ring-4 ring-emerald-500/30 -translate-y-0.5'
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

        {/* Action Buttons: Correction & Valider */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              soundManager.playClick();
              onClearAnswers();
            }}
            disabled={selectedAnswers.length === 0 || hasValidated}
            className={`flex items-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
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
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm border shadow-lg transition-all ${
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
              disabled={!canGoNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <span>السؤال الموالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
