/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VocabularyTerm } from '../types/quiz';
import { Volume2, X, Bookmark, Lightbulb, Sparkles } from 'lucide-react';
import { soundManager, speakArabic } from '../utils/sound';

interface TermCardProps {
  term: VocabularyTerm;
  onClose: () => void;
  onTestTerm?: (termId: string) => void;
}

export const TermCard: React.FC<TermCardProps> = ({ term, onClose, onTestTerm }) => {
  const handleSpeak = () => {
    soundManager.playClick();
    speakArabic(`${term.termArabic}. ${term.detailedExplanation}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Top Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500" />

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
              {term.category}
            </div>
            <h3 className="text-2xl font-black text-white flex items-center gap-2">
              {term.termArabic}
            </h3>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{term.termFrench}</p>
            {term.darijaPronunciation && (
              <p className="text-xs text-amber-400 mt-1 font-medium">
                بالدارجة: {term.darijaPronunciation}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeak}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-all border border-slate-700"
              title="نطق المصطلح وشرحه"
              aria-label="نطق المصطلح"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Detailed explanation */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              المعنى والشرح في قانون السير
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {term.detailedExplanation}
            </p>
          </div>

          {/* Exam Tip */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">نصيحة الامتحان الرسمي:</div>
              <p className="text-xs text-amber-100 mt-1 leading-relaxed">{term.examTip}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            إغلاق
          </button>
          {onTestTerm && (
            <button
              onClick={() => {
                onClose();
                onTestTerm(term.id);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              اختبرني في أسئلة هذا المصطلح
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
