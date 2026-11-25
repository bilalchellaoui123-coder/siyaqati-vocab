/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizQuestion } from '../types/quiz';

export interface SpeechSegment {
  text: string;
  optionId: number | null;
  pauseAfterMs?: number;
}

export interface CleanSpeechOptions {
  stripFrenchParens?: boolean;
}

export function numberToArabicWord(n: number): string {
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
}

/**
 * Strip French/Latin terms and redundant parenthetical clarifications
 * so Arabic TTS reads smoothly without awkward foreign or repeated words.
 */
function stripUnspokenParentheticals(text: string): string {
  return text
    .replace(/\(([^)]*)\)/g, (_match, inner: string) => {
      const trimmed = inner.trim();

      // Remove pure numeric parentheticals like "(1)", "(2)", "(4)"
      if (/^\d+$/.test(trimmed)) {
        return '';
      }

      // Remove French/slang nicknames that duplicate the Arabic term right before them
      if (/^(الكونسطا|الفار|الكلاكسون|الورقة الرمادية|أمامية وخلفية)$/i.test(trimmed)) {
        return trimmed === 'أمامية وخلفية' ? '، أمامية وخلفية' : '';
      }

      // Convert "(سنة واحدة)" / "(سنتين)" / "(ثلاث سنوات)" / "(30 يوماً)" into smooth apposition
      if (/^(سنة|سنة واحدة|سنتين|ثلاث سنوات|30 يوماً)$/i.test(trimmed)) {
        return `، أي ${trimmed}`;
      }

      // Keep "(70m احترموا المسافة القانونية)" clean as Arabic
      if (trimmed.includes('احترموا')) {
        const cleaned = trimmed
          .replace(/(\d+(?:[.,]\d+)?)\s*m\b/gi, '$1 متراً')
          .replace(/[A-Za-zÀ-ÿ]+/g, '')
          .trim();
        return cleaned ? `، ${cleaned}،` : '';
      }

      // Strip Latin words, apostrophes, and units like "1s" inside mixed parentheses
      const arabicOnly = trimmed
        .replace(/\b\d+\s*s\b/gi, '')
        .replace(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’\-\/\s]*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!arabicOnly) return '';
      return `، ${arabicOnly}،`;
    })
    .replace(/\(\s*\)/g, '');
}

/**
 * Normalize Moroccan driving quiz text, Darija contractions, units, and punctuation
 * across all series so speech sounds natural and human rather than robotic.
 */
export function cleanArabicForSpeech(raw: string, options?: CleanSpeechOptions): string {
  if (!raw) return '';

  // Remove quotes before word replacements so "كـ \"جنحة فرار\"" converts cleanly
  let text = raw.replace(/["«»]/g, '');

  if (options?.stripFrenchParens) {
    text = stripUnspokenParentheticals(text);
  }

  text = text
    // Normalize Moroccan Darija standalone prepositions & tatweel (Unicode-safe boundaries)
    .replace(/(^|\s)فـ+(?=\s|$|[:：])/g, '$1في')
    .replace(/(^|\s)ف(?=\s*[:：])/g, '$1في')
    .replace(/(^|\s)بـ+(?=\s|$|[:：])/g, '$1بِ')
    .replace(/(^|\s)كـ+\s+/g, '$1ك')
    .replace(/\u0640+/g, '')

    // Expand fused Darija prefixes (فـ / بـ) that Arabic TTS otherwise mispronounces as single words
    .replace(/(^|\s)فمقدمة(?=$|\s|[،.])/g, '$1في مقدمة')
    .replace(/(^|\s)فمنعرج(?=$|\s|[،.])/g, '$1في منعرج')
    .replace(/(^|\s)فالمنعرج(?=$|\s|[،.])/g, '$1في المنعرج')
    .replace(/(^|\s)فالخلف(?=$|\s|[،.])/g, '$1في الخلف')
    .replace(/(^|\s)فالساعة(?=$|\s|[،.])/g, '$1في الساعة')
    .replace(/(^|\s)فزمن(?=$|\s|[،.])/g, '$1في زمن')
    .replace(/(^|\s)فالفترة(?=$|\s|[،.])/g, '$1في الفترة')
    .replace(/(^|\s)فالسير(?=$|\s|[،.])/g, '$1في السير')
    .replace(/(^|\s)فطريق(?=$|\s|[،.])/g, '$1في طريق')
    .replace(/(^|\s)فالطريق(?=$|\s|[،.])/g, '$1في الطريق')
    .replace(/(^|\s)فالتربية(?=$|\s|[،.])/g, '$1في التربية')
    .replace(/(^|\s)فالثلج(?=$|\s|[،.])/g, '$1في الثلج')
    .replace(/(^|\s)فحادثة(?=$|\s|[،.])/g, '$1في حادثة')
    .replace(/(^|\s)فأجل(?=$|\s|[،.])/g, '$1في أجل')
    .replace(/(^|\s)فالإستخدام(?=$|\s|[،.])/g, '$1في الاستخدام')
    .replace(/(^|\s)فالاستخدام(?=$|\s|[،.])/g, '$1في الاستخدام')
    .replace(/(^|\s)فالاستعمال(?=$|\s|[،.])/g, '$1في استعمال')
    .replace(/(^|\s)فالإستعمال(?=$|\s|[،.])/g, '$1في استعمال')
    .replace(/(^|\s)فهاد الحالة(?=$|\s|[،.])/g, '$1في هذه الحالة')
    .replace(/(^|\s)فهاد الشارع(?=$|\s|[،.])/g, '$1في هذا الشارع')
    .replace(/(^|\s)فهاد المكان(?=$|\s|[،.])/g, '$1في هذا المكان')
    .replace(/(^|\s)فهاد(?=$|\s|[،.])/g, '$1في هذا')
    .replace(/(^|\s)بضواء(?=$|\s|[،.])/g, '$1بأضواء')
    .replace(/(^|\s)بضواو(?=$|\s|[،.])/g, '$1بأضواء')
    .replace(/(^|\s)بالصوار ديال الضبابة(?=$|\s|[،.])/g, '$1بأضواء الضباب')
    .replace(/(^|\s)ضواو(?=$|\s|[،.])/g, '$1أضواء')

    // Smooth Moroccan demonstratives & colloquial spellings for crisp pronunciation
    .replace(/(^|\s)هاد\s+(العلامة|العلامات|اللوحة|الحالة|المحطة|القاعدة|المركبة)/g, '$1هذه $2')
    .replace(/(^|\s)هاد\s+(الشارع|المكان|الشخص|الوزن|السائق|مستعمل)/g, '$1هذا $2')
    .replace(/(^|\s)ألي قدامي(?=$|\s|[،.])/g, '$1اللي قدامي')
    .replace(/(^|\s)يوحدهم(?=$|\s|[،.])/g, '$1بوحدهم')
    .replace(/(^|\s)تاحد ما كاين(?=$|\s|[،.])/g, '$1حتى واحد ما كاين')
    .replace(/(^|\s)مللي كاتزيد(?=$|\s|[،.])/g, '$1ملي كتزيد')
    .replace(/(^|\s)ماكيتغيرش(?=$|\s|[،.])/g, '$1ما كيتغيرش')
    .replace(/(^|\s)مايمكنش لي(?=$|\s|[،.])/g, '$1ما يمكنش لي')
    .replace(/(^|\s)بلا مانوقف(?=$|\s|[،.])/g, '$1بلا ما نوقف')
    .replace(/(^|\s)بعد مانوقف(?=$|\s|[،.])/g, '$1بعد ما نوقف')
    .replace(/(^|\s)إلا مرتكبتش حتا شي مخالفة(?=$|\s|[،.])/g, '$1إذا ما ارتكبتش حتى شي مخالفة')
    .replace(/(^|\s)إلى\s+(ما|بان|فقدت|كان)/g, '$1إذا $2')
    .replace(/(^|\s)وجنب ديال السيارة(?=$|\s|[،.])/g, '$1وجنب السيارة')
    .replace(/(^|\s)لون ديالها(?=$|\s|[،.])/g, '$1اللون ديالها')

    // Expand speed, distance, weight, and time abbreviations (Unicode-safe boundaries)
    .replace(/كلم\s*\/\s*س/g, 'كيلومتر في الساعة')
    .replace(/كم\s*\/\s*س/g, 'كيلومتر في الساعة')
    .replace(/كلم في الساعة/g, 'كيلومتر في الساعة')
    .replace(/(^|[\s،.(])كلم(?=$|[\s،.)])/g, '$1كيلومتر')
    .replace(/(^|[\s،.(])كلغ(?=$|[\s،.)])/g, '$1كيلوغرام')
    .replace(/(\d+(?:[.,]\d+)?)\s*m(?![A-Za-z])/gi, '$1 متر')
    .replace(/(\d+(?:[.,]\d+)?)\s*cm(?![A-Za-z])/gi, '$1 سنتيمتر')
    .replace(/(\d+(?:[.,]\d+)?)\s*km(?![A-Za-z])/gi, '$1 كيلومتر')
    .replace(/(\d+(?:[.,]\d+)?)\s*s(?![A-Za-z])/gi, '$1 ثانية')

    // Natural spoken phrasing for decimals, quantities, and fractions
    .replace(/0[.,]5\s*متر/g, 'نصف متر')
    .replace(/3[.,]5\s*طن/g, 'ثلاثة طن ونصف')
    .replace(/(\d+)\.(\d+)/g, '$1 فاصلة $2')
    .replace(/1\s+نقطة/g, 'نقطة واحدة')
    .replace(/(?:2|جوج)\s+(?:ديال\s+)?(?:النقط|نقط|نقاط)/g, 'نقطتين')
    .replace(/3\s+(?:ديال\s+)?(?:النقط|نقط|نقاط)/g, 'ثلاث نقط')
    .replace(/4\s+(?:ديال\s+)?(?:النقط|نقط|نقاط)/g, 'أربع نقط')
    .replace(/6\s+(?:ديال\s+)?(?:النقط|نقط|نقاط)/g, 'ست نقط')
    .replace(/2\s+ديال\s+الثواني/g, 'ثانيتين')
    .replace(/3\s+ديال\s+الثواني/g, 'ثلاث ثوانٍ')
    .replace(/3\s+سنين/g, 'ثلاث سنين')
    .replace(/5\s+سنين/g, 'خمس سنين')
    .replace(/3\s+أشهر/g, 'ثلاثة أشهر')
    .replace(/8\s+ديال\s+الأشخاص/g, 'ثمانية أشخاص')
    .replace(/زوج\s+ديال\s+الدورات/g, 'دورتين')

    // Replace math arrows, multiplication, and equations
    .replace(/\s*->\s*/g, '، يعني ')
    .replace(/(\d+)\s*[×xX]\s*(\d+)/g, '$1 ضرب $2')
    .replace(/\s*=\s*/g, ' يساوي ')

    // Replace remaining English/French or letter codes
    .replace(/\btubeless\b/gi, 'تيوبليس، أي بدون أنبوب داخلي')
    .replace(/\bABS\b/g, 'نظام منع انغلاق العجلات')
    .replace(/بصليب\s*X\s*/gi, 'بعلامة ضرب ')
    .replace(/\bX\b/g, 'إكس')
    .replace(/(?:من\s+)?صنف\s+ب(?=$|[\s،.])/g, 'من صنف باء')
    .replace(/الصنف\s+ج(?=$|[\s،.])/g, 'الصنف جيم')

    // Clean slashes and punctuation spacing
    .replace(/\s*\/\s*/g, '، أو ')
    .replace(/\s*[:：]+\s*$/g, '.')
    .replace(/\s*[:：]+\s*/g, '، ')
    .replace(/،\s*،+/g, '، ')
    .replace(/\s+([.،؟!])/g, '$1')
    .replace(/([،.])\s*([.])/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Strip inline multi-part option hints like "(1 نعم / 2 لا)" from the question prompt
 * when the full options list will be read sequentially right afterward.
 */
function stripInlineChoiceHints(questionText: string): string {
  return questionText
    // e.g. "(1 نعم / 2 لا)" or "(3 جوج نقط / 4 4 ديال النقط)"
    .replace(/\(\s*[1-4][^)]*\)/g, '')
    // e.g. ": 1 بضواء الوضع / 2 بضواو التقابل / 3 ... / 4 ..."
    .replace(/:\s*1\s+[^:]+(?:\/\s*[2-4]\s+[^:]+)+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build one unified, fluent speech segment for a question and all its answer choices
 * so every series uses the exact same smooth, human-sounding instructor flow.
 */
export function buildQuestionSpeechSegments(question: QuizQuestion): SpeechSegment[] {
  const basePrompt = stripInlineChoiceHints(question.questionText);

  let questionLine = cleanArabicForSpeech(basePrompt, { stripFrenchParens: true });
  if (question.subQuestionText) {
    const sub = cleanArabicForSpeech(question.subQuestionText, { stripFrenchParens: true });
    if (sub) {
      questionLine = `${questionLine}، ${sub}`;
    }
  }
  questionLine = questionLine.replace(/[.:،]+$/, '').trim();
  if (questionLine && !/[؟!]$/.test(questionLine)) {
    questionLine += ':';
  }

  const optionsText = question.options
    .map((opt) => {
      const explicitPartText = opt.text.replace(/\s*[:：]\s*(نعم|لا)\s*$/, '، الجواب $1');
      const cleanOpt = cleanArabicForSpeech(explicitPartText, { stripFrenchParens: true }).replace(
        /[.،]+$/,
        ''
      );
      return `رقم ${numberToArabicWord(opt.id)}، ${cleanOpt}.`;
    })
    .join(' ');

  const fullText = [questionLine, optionsText].filter(Boolean).join(' ').trim();
  if (!fullText) return [];

  return [
    {
      text: fullText,
      optionId: null,
      pauseAfterMs: 0,
    },
  ];
}

export function buildSingleOptionSpeech(optId: number, optText: string): string {
  const explicitPartText = optText.replace(/\s*[:：]\s*(نعم|لا)\s*$/, '، الجواب $1');
  const cleanOpt = cleanArabicForSpeech(explicitPartText, { stripFrenchParens: true }).replace(
    /[.،]+$/,
    ''
  );
  return `رقم ${numberToArabicWord(optId)}، ${cleanOpt}.`;
}

/**
 * Format the real/correct answer(s) into natural spoken Arabic,
 * and if the user's answer was incorrect, follow with a spoken "why" explanation.
 */
export function buildValidationFeedbackSegments(
  question: QuizQuestion,
  isCorrect: boolean
): SpeechSegment[] {
  const correctOptions = question.options.filter((opt) =>
    question.correctAnswers.includes(opt.id)
  );

  const optionPhrases =
    correctOptions.length > 0
      ? correctOptions.map((opt) => {
          const explicitPartText = opt.text.replace(/\s*[:：]\s*(نعم|لا)\s*$/, '، الجواب $1');
          const cleanOpt = cleanArabicForSpeech(explicitPartText, {
            stripFrenchParens: true,
          }).replace(/[.،]+$/, '');
          return `رقم ${numberToArabicWord(opt.id)}، ${cleanOpt}`;
        })
      : question.correctAnswers.map((id) => `رقم ${numberToArabicWord(id)}`);

  let correctSummary = '';
  if (optionPhrases.length === 1) {
    correctSummary = optionPhrases[0];
  } else if (optionPhrases.length > 1) {
    const allExceptLast = optionPhrases.slice(0, -1).join('، ');
    const last = optionPhrases[optionPhrases.length - 1];
    correctSummary = `${allExceptLast}، و${last}`;
  }

  const answerText = isCorrect
    ? `إجابة صحيحة! الجواب الصحيح هو: ${correctSummary}.`
    : `إجابة غير صحيحة. الجواب الصحيح هو: ${correctSummary}.`;

  const cleanExplanation = cleanArabicForSpeech(question.explanation, {
    stripFrenchParens: true,
  });

  if (isCorrect || !cleanExplanation) {
    return [
      {
        text: answerText,
        optionId: null,
        pauseAfterMs: 0,
      },
    ];
  }

  const explanationSentence = /[.?؟!]$/.test(cleanExplanation)
    ? cleanExplanation
    : `${cleanExplanation}.`;

  return [
    {
      text: answerText,
      optionId: null,
      pauseAfterMs: 320,
    },
    {
      text: `السبب: ${explanationSentence}`,
      optionId: null,
      pauseAfterMs: 0,
    },
  ];
}
