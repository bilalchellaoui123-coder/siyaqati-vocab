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

export interface CleanSpeechOptions {
  stripFrenchParens?: boolean;
}

/**
 * Strip French/Latin terms inside parentheses while preserving any Arabic meaning inside the same parentheses.
 */
function stripLatinParentheticals(text: string): string {
  return text
    .replace(/\(([^)]*)\)/g, (_match, inner: string) => {
      // Remove Latin words, apostrophes, hyphens, and short unit codes like "1s" or "X" inside parentheses
      const arabicOnly = inner
        .replace(/\b\d+\s*s\b/gi, '')
        .replace(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’\-\/\s]*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return arabicOnly ? `(${arabicOnly})` : '';
    })
    .replace(/\(\s*\)/g, '');
}

/**
 * Normalize Moroccan driving quiz text, abbreviations, and punctuation
 * so Arabic TTS engines read smoothly and fluently without stumbles.
 */
export function cleanArabicForSpeech(raw: string, options?: CleanSpeechOptions): string {
  if (!raw) return '';

  let text = options?.stripFrenchParens ? stripLatinParentheticals(raw) : raw;

  text = text
    // Convert Moroccan Darija prepositions followed by tatweel/colon ("محددة فـ :" -> "محددة في:")
    .replace(/\bفـ+\s*[:：]?/g, 'في ')
    .replace(/\bبـ+\s*[:：]?/g, 'بِ ')
    .replace(/\bكـ+\s*/g, 'مثل ')
    // Remove dangling tatweel elongation characters
    .replace(/\u0640+/g, '')
    // Expand common speed/distance/weight abbreviations
    .replace(/كلم\s*\/\s*س/g, 'كيلومتر في الساعة')
    .replace(/كم\s*\/\s*س/g, 'كيلومتر في الساعة')
    .replace(/\bكلم\b/g, 'كيلومتر')
    .replace(/\bكلغ\b/g, 'كيلوغرام')
    .replace(/(\d+(?:[.,]\d+)?)\s*m\b/gi, '$1 متر')
    .replace(/(\d+(?:[.,]\d+)?)\s*cm\b/gi, '$1 سنتيمتر')
    .replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, '$1 كيلومتر')
    .replace(/(\d+(?:[.,]\d+)?)\s*s\b/gi, '$1 ثانية')
    // Replace math arrows and equations inside calculation explanations
    .replace(/\s*->\s*/g, '، يعني ')
    .replace(/(\d+)\s*[×xX]\s*(\d+)/g, '$1 ضرب $2')
    .replace(/\s*=\s*/g, ' يساوي ')
    // Replace common English/French terms embedded in Arabic prompts
    .replace(/\btubeless\b/gi, 'تيوبليس، أي بدون أنبوب داخلي')
    .replace(/\bABS\b/g, 'نظام منع انغلاق العجلات')
    .replace(/بصليب\s*X\s*/gi, 'بعلامة ضرب ')
    .replace(/\bX\b/g, 'إكس')
    .replace(/من صنف\s*"?\s*ب\s*"?/g, 'من صنف باء')
    // Clean decimal dots inside numbers ("3.5" -> "3 فاصلة 5")
    .replace(/(\d+)\.(\d+)/g, '$1 فاصلة $2')
    // Normalize quotes & slashes
    .replace(/["«»]/g, '')
    .replace(/\s*\/\s*/g, '، أو ')
    // Replace dangling colons at the end of questions with a natural pause
    .replace(/\s*[:：]+\s*$/g, '.')
    .replace(/\s*[:：]+\s*/g, '، ')
    // Remove stray spacing before punctuation
    .replace(/\s+([.،؟!])/g, '$1')
    // Clean extra whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Fix common colloquial spelling quirks for clearer Arabic TTS pronunciation
  text = text
    .replace(/\bألي قدامي\b/g, 'اللي قدامي')
    .replace(/\bاللي غادي\b/g, 'التي سوف')
    .replace(/\bيوحدهم\b/g, 'بوحدهم')
    .replace(/\bضواو\b/g, 'أضواء')
    .replace(/\bبالصوار ديال الضبابة\b/g, 'بأضواء الضباب')
    .replace(/\bديال\b/g, 'ديال')
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
 * Build fluent sequential speech segments for a question and its answer choices.
 */
export function buildQuestionSpeechSegments(question: QuizQuestion): SpeechSegment[] {
  const hasPartOptions = question.options.some((o) => typeof o.part === 'number');
  const basePrompt = hasPartOptions
    ? stripInlineChoiceHints(question.questionText)
    : question.questionText;

  let questionLine = cleanArabicForSpeech(basePrompt);
  if (question.subQuestionText) {
    const sub = cleanArabicForSpeech(question.subQuestionText);
    if (sub) {
      questionLine = `${questionLine}، ${sub}`;
    }
  }
  if (questionLine && !/[.؟!]$/.test(questionLine)) {
    questionLine += '.';
  }

  const segments: SpeechSegment[] = [];
  if (questionLine) {
    segments.push({
      text: questionLine,
      optionId: null,
      pauseAfterMs: 320,
    });
  }

  question.options.forEach((opt, idx) => {
    const cleanOpt = cleanArabicForSpeech(opt.text);
    const isLast = idx === question.options.length - 1;
    segments.push({
      text: `رقم ${numberToArabicWord(opt.id)}، ${cleanOpt}.`,
      optionId: opt.id,
      pauseAfterMs: isLast ? 0 : 220,
    });
  });

  return segments;
}

export function buildSingleOptionSpeech(optId: number, optText: string): string {
  const cleanOpt = cleanArabicForSpeech(optText);
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
          const cleanOpt = cleanArabicForSpeech(explicitPartText, { stripFrenchParens: true });
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
