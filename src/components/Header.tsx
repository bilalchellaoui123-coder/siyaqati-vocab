/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Car,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  AlertOctagon,
  Volume2,
  VolumeX,
  Flame,
  Award,
} from 'lucide-react';
import { soundManager } from '../utils/sound';

export type ActiveTab = 'practice' | 'exam' | 'vocab' | 'dashboard' | 'mistakes';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  mistakesCount: number;
  streak: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  mistakesCount,
  streak,
  isMuted,
  onToggleMute,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg" dir="rtl">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div
            onClick={() => onTabChange('practice')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform shrink-0">
              <Car className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black text-white tracking-wide whitespace-nowrap">سياقتي فوكاب</h1>
                <span className="text-[11px] text-emerald-400 font-bold whitespace-nowrap">
                  · صنف ب
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400">
                اختبار ومصطلحات كود السياقة المغربي
              </p>
            </div>
          </div>

          {/* Quick controls on mobile */}
          <div className="flex items-center gap-1.5 md:hidden shrink-0">
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-bold tabular-nums">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{streak}</span>
              </div>
            )}
            <button
              onClick={onToggleMute}
              className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-slate-800 text-amber-400 border-amber-500/30'
              }`}
              aria-label={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full md:w-auto py-0.5 scrollbar-none justify-start md:justify-center">
          <button
            onClick={() => {
              soundManager.playClick();
              onTabChange('practice');
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'practice'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">تدريب</span>
            <span className="hidden sm:inline">تدريب ومصطلحات</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onTabChange('exam');
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'exam'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">امتحان (40)</span>
            <span className="hidden sm:inline">محاكاة الامتحان (40)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onTabChange('vocab');
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'vocab'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">المعجم</span>
            <span className="hidden sm:inline">معجم المصطلحات</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onTabChange('mistakes');
            }}
            className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'mistakes'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">الأخطاء</span>
            <span className="hidden sm:inline">بنك الأخطاء</span>
            {mistakesCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums">
                {mistakesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onTabChange('dashboard');
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">التقدم</span>
            <span className="hidden sm:inline">لوحة التقدم</span>
          </button>
        </nav>

        {/* Right Desktop Utilities */}
        <div className="hidden md:flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black tabular-nums">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{streak} تسلسل نجاح</span>
            </div>
          )}

          <button
            onClick={onToggleMute}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-slate-700'
            }`}
            title={isMuted ? 'تفعيل الصوت' : 'كتم المؤثرات الصوتية'}
            aria-label="التحكم بالصوت"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
