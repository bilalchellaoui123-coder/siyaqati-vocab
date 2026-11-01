/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VOCABULARY_LIST } from '../data/vocabulary';
import { VocabularyTerm } from '../types/quiz';
import {
  Search,
  Volume2,
  BookOpen,
  Lightbulb,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { soundManager, speakArabic } from '../utils/sound';

interface VocabularyHubProps {
  onSelectTerm: (term: VocabularyTerm) => void;
  onTestTerm: (termId: string) => void;
}

export const VocabularyHub: React.FC<VocabularyHubProps> = ({ onSelectTerm, onTestTerm }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'flashcards'>('grid');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const categories = [
    { id: 'all', label: 'جميع المصطلحات' },
    { id: 'رخصة السياقة والمخالفات والجنح', label: 'رخصة السياقة والنقط' },
    { id: 'الأمان ومسافات السير', label: 'مسافات الأمان ورد الفعل' },
    { id: 'التشوير الطرقي والعلامات', label: 'التشوير والعلامات' },
    { id: 'الميكانيك والمراقبة التقنية', label: 'الميكانيك والفحص التقني' },
    { id: 'الرؤية والإنارة', label: 'الأضواء والرؤية' },
    { id: 'قواعد السير والأسبقية', label: 'قواعد السير والأسبقية' },
  ];

  const filteredTerms = useMemo(() => {
    return VOCABULARY_LIST.filter((t) => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.termArabic.toLowerCase().includes(q) ||
        t.termFrench.toLowerCase().includes(q) ||
        (t.darijaPronunciation && t.darijaPronunciation.toLowerCase().includes(q)) ||
        t.shortDefinition.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleSpeak = (term: VocabularyTerm) => {
    soundManager.playClick();
    speakArabic(`${term.termArabic}. ${term.shortDefinition}`);
  };

  const currentFlashcard = filteredTerms[flashcardIndex] || filteredTerms[0];

  const handleNextFlashcard = () => {
    soundManager.playClick();
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev + 1) % filteredTerms.length);
  };

  const handlePrevFlashcard = () => {
    soundManager.playClick();
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev - 1 + filteredTerms.length) % filteredTerms.length);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-900/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            معجم مصطلحات وقواعد السياقة بالمغرب
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            دليلك الشامل لمصطلحات كود السياقة
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            تعلم المفاهيم الأساسية المستعملة في امتحانات البيرمي: زمن رد الفعل، مسافة الأمان، الفحص التقني، علامات الإلزام، بالدارجة المغربية والعربية والفرنسية.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => {
              soundManager.playClick();
              setViewMode('grid');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>عرض المعجم</span>
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setViewMode('flashcards');
              setIsFlipped(false);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'flashcards'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>بطاقات الحفظ (Flashcards)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مصطلح (مثال: مسافة الأمان، الحصارات، Tubeless، الفترة الاختبارية)..."
            className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              مسح
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundManager.playClick();
                setSelectedCategory(cat.id);
                setFlashcardIndex(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'flashcards' && currentFlashcard ? (
        /* Flashcard Study Mode */
        <div className="max-w-xl mx-auto py-4 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-2">
            <span>
              البطاقة {flashcardIndex + 1} من {filteredTerms.length}
            </span>
            <span className="text-amber-400">انقر على البطاقة لقلبها وقراءة الشرح</span>
          </div>

          {/* Flip Card */}
          <div
            onClick={() => {
              soundManager.playClick();
              setIsFlipped(!isFlipped);
            }}
            className="cursor-pointer min-h-[320px] rounded-3xl p-8 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-indigo-500/40 shadow-2xl flex flex-col justify-between transition-all hover:border-indigo-400 group relative select-none"
          >
            <div className="flex items-start justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentFlashcard.category}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentFlashcard);
                }}
                className="p-2 rounded-xl bg-slate-900/80 text-amber-400 hover:text-amber-300 border border-slate-700"
                title="استمع للمصطلح"
                aria-label="نطق المصطلح"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {!isFlipped ? (
              /* Front of card */
              <div className="text-center py-8 space-y-3">
                <h3 className="text-3xl font-black text-white group-hover:text-indigo-200 transition">
                  {currentFlashcard.termArabic}
                </h3>
                <p className="text-sm font-mono text-slate-400">{currentFlashcard.termFrench}</p>
                {currentFlashcard.darijaPronunciation && (
                  <p className="text-xs text-amber-400 font-medium">
                    {currentFlashcard.darijaPronunciation}
                  </p>
                )}
                <div className="pt-6 inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>انقر لكشف المعنى والنصيحة</span>
                </div>
              </div>
            ) : (
              /* Back of card */
              <div className="py-2 space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400">التعريف والشرح:</div>
                  <p className="text-sm text-slate-100 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {currentFlashcard.detailedExplanation}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{currentFlashcard.examTip}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/60 text-xs text-slate-400">
              <span>{isFlipped ? 'الوجه الخلفي (الشرح)' : 'الوجه الأمامي (المصطلح)'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTestTerm(currentFlashcard.id);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
              >
                أسئلة هذا المصطلح
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevFlashcard}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>البطاقة السابقة</span>
            </button>
            <button
              onClick={handleNextFlashcard}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <span>البطاقة الموالية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Dictionary Grid Mode */
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400">
            تم العثور على {filteredTerms.length} مصطلح
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTerms.map((term) => (
              <div
                key={term.id}
                onClick={() => onSelectTerm(term)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-md group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {term.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(term);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title="استمع للمصطلح"
                      aria-label={`استمع لنطق ${term.termArabic}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                      {term.termArabic}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{term.termFrench}</p>
                    {term.darijaPronunciation && (
                      <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                        {term.darijaPronunciation}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {term.shortDefinition}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>نصيحة الامتحان</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestTerm(term.id);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    <span>تدرب</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTerms.length === 0 && (
            <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
              <p className="font-bold text-sm">لم يتم العثور على أي مصطلح يطابق بحثك</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-indigo-400 underline font-bold"
              >
                إلغاء الفلترة وعرض الكل
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
