/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, Image as ImageIcon, ZoomIn, X, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface SceneIllustrationProps {
  sceneType: string;
  badgeTitle?: string;
  questionNumber?: number;
  imageUrl?: string;
  fullSlideUrl?: string;
  hasValidated?: boolean;
}

export const SceneIllustration: React.FC<SceneIllustrationProps> = ({
  sceneType,
  badgeTitle,
  questionNumber,
  imageUrl,
  fullSlideUrl,
  hasValidated,
}) => {
  const [showFullModal, setShowFullModal] = useState(false);
  const [activeView, setActiveView] = useState<'photo' | 'slide'>('photo');
  const [imageError, setImageError] = useState(false);

  const currentDisplaySrc = activeView === 'slide' && fullSlideUrl ? fullSlideUrl : imageUrl;

  return (
    <>
      <div className="w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-xl select-none">
        {/* Image Frame */}
        <div className="relative w-full h-[185px] sm:h-auto sm:aspect-[16/9] sm:max-h-[340px] bg-slate-950 flex items-center justify-center group overflow-hidden">
          {currentDisplaySrc && !imageError ? (
            <img
              src={currentDisplaySrc}
              alt={`صورة السؤال ${questionNumber || ''}`}
              onError={() => setImageError(true)}
              onClick={() => setShowFullModal(true)}
              className="w-full h-full object-contain bg-slate-950 cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
              <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
              <div className="text-xs sm:text-sm font-bold text-slate-300">
                {badgeTitle || 'مشهد السؤال من الامتحان'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">سياقتي - كود السياقة المغربي</div>
            </div>
          )}
        </div>

        {/* Clean Toolbar Below Image (never covers road signs on small phones) */}
        <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {fullSlideUrl ? (
              <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveView('photo');
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                    activeView === 'photo'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  صورة المشهد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveView('slide');
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                    activeView === 'slide'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  الشريحة الكاملة
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {badgeTitle || 'امتحان رخصة السياقة بالمغرب'}
              </span>
            )}
          </div>

          {(imageUrl || fullSlideUrl) && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setShowFullModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 border border-slate-700 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold shrink-0"
              title="تكبير الصورة بالحجم الكامل"
              aria-label="تكبير صورة السؤال"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>تكبير</span>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal for Original Picture */}
      {showFullModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-150"
          dir="rtl"
          onClick={() => setShowFullModal(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">
                    صورة السؤال {questionNumber || ''}
                  </h3>
                  {badgeTitle && (
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {badgeTitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {fullSlideUrl && (
                  <div className="bg-slate-900 p-0.5 rounded-xl border border-slate-800 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveView('photo')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeView === 'photo'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      المشهد
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('slide')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        activeView === 'slide'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الشريحة
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullModal(false)}
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="إغلاق التكبير"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="p-2 sm:p-4 bg-slate-950/90 flex-1 flex items-center justify-center overflow-auto min-h-[220px]">
              <img
                src={currentDisplaySrc || ''}
                alt={`صورة السؤال ${questionNumber || ''}`}
                className="max-w-full max-h-[72dvh] object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 px-4">
              <span className="truncate">يمكنك التدقيق في علامات المرور والتشوير.</span>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shrink-0"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
