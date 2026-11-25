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

/**
 * Normalize Moroccan driving quiz text, abbreviations, and punctuation
 * so Arabic TTS engines read smoothly and fluently without stumbles.
 */
export function cleanArabicForSpeech(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Convert Moroccan Darija prepositions followed by tatweel/colon ("محددة فـ :" -> "محددة في:")
    .replace(/\bفـ+\s*[:：]?/g, 'في ')
    .replace(/\bبـ+\s*[:：]?/g, 'بِ ')
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
    // Replace common English terms embedded in Arabic prompts
    .replace(/\btubeless\b/gi, 'تيوبليس، أي بدون أنبوب داخلي')
    .replace(/\bABS\b/g, 'نظام منع انغلاق العجلات')
    .replace(/بصليب\s*X\s*/gi, 'بعلامة ضرب ')
    .replace(/\bX\b/g, 'إكس')
    // Clean decimal dots inside numbers ("3.5" -> "3 فاصلة 5")
    .replace(/(\d+)\.(\d+)/g, '$1 فاصلة $2')
    // Normalize quotes & slashes
    .replace(/["«»]/g, '')
    .replace(/\s*\/\s*/g, '، أو ')
    // Replace dangling colons at the end of questions with a natural pause
    .replace(/\s*[:：]+\s*$/g, '.')
    .replace(/\s*[:：]+\s*/g, '، ')
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
