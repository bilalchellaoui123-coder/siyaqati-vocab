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
      <div className="relative w-full aspect-[16/9] max-h-[360px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl flex items-center justify-center select-none group">
        {/* Actual PDF Extracted Picture */}
        {currentDisplaySrc && !imageError ? (
          <img
            src={currentDisplaySrc}
            alt={`صورة السؤال ${questionNumber || ''}`}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain bg-slate-950 transition-transform duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          /* SVG Fallback when no image or error */
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
            <ImageIcon className="w-12 h-12 text-slate-500 mb-2" />
            <div className="text-sm font-bold text-slate-300">
              {badgeTitle || 'مشهد السؤال من الامتحان'}
            </div>
            <div className="text-xs text-slate-500 mt-1">سياقتي - كود السياقة المغربي</div>
          </div>
        )}

        {/* Top Overlay Badge */}
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-bold text-amber-400 flex items-center gap-2 shadow-lg z-10">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{badgeTitle || 'امتحان رخصة السياقة بالمغرب'}</span>
        </div>

        {questionNumber && (
          <div className="absolute top-3 right-3 bg-red-600/95 text-white font-black text-xs sm:text-sm px-3.5 py-1 rounded-xl shadow-lg border border-red-500/50 z-10">
            السؤال {questionNumber}
          </div>
        )}

        {/* Bottom Bar: Toggle between Scene Photo and Original Full Slide + Fullscreen Zoom */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            {fullSlideUrl && (
              <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 flex items-center gap-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveView('photo');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'photo'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'slide'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  الشريحة الأصلية الكاملة
                </button>
              </div>
            )}
          </div>

          {/* Zoom modal trigger */}
          {(imageUrl || fullSlideUrl) && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setShowFullModal(true);
              }}
              className="pointer-events-auto p-2 rounded-xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 hover:text-amber-400 border border-slate-700/80 transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold"
              title="تكبير الصورة بالحجم الكامل"
              aria-label="تكبير صورة السؤال"
            >
              <ZoomIn className="w-4 h-4" />
              <span className="hidden sm:inline">تكبير</span>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal for Original Picture */}
      {showFullModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-150"
          dir="rtl"
          onClick={() => setShowFullModal(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    الصورة الأصلية للسؤال من ملف الامتحان (PDF)
                  </h3>
                  <p className="text-xs text-slate-400">
                    {badgeTitle || ''} • السؤال {questionNumber || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {fullSlideUrl && (
                  <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveView('photo')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        activeView === 'photo'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      صورة المشهد
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('slide')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        activeView === 'slide'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الشريحة الكاملة
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="إغلاق التكبير"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="p-4 bg-slate-950/90 flex-1 flex items-center justify-center overflow-auto min-h-[300px]">
              <img
                src={currentDisplaySrc || ''}
                alt={`صورة السؤال ${questionNumber || ''}`}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
              <span>يمكنك التدقيق في تفاصيل الطريق، التشوير وعلامات المرور بالصورة.</span>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
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
