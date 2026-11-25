/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanArabicForSpeech, SpeechSegment } from './speechFormatter';

// 1-sample silent WAV used to unlock HTMLAudioElement on iOS Safari & Android Chrome
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const RATE_STORAGE_KEY = 'siyaqati_speech_rate';

interface CachedClientAudio {
  buffer: ArrayBuffer;
  mimeType: string;
}

// Synthesized sound effects + mobile-resilient fluent Arabic speech player
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speechRate: number = 1.0;
  private persistentAudio: HTMLAudioElement | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeFetchControllers: Set<AbortController> = new Set();
  private currentBlobUrl: string | null = null;
  private audioUnlocked: boolean = false;
  private isCurrentlySpeaking: boolean = false;
  private speechRequestId: number = 0;
  private speechChunkTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private speakingListeners: Set<(speaking: boolean) => void> = new Set();
  private audioBufferCache: Map<string, CachedClientAudio> = new Map();
  private inFlightFetches: Map<string, Promise<CachedClientAudio | null>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedRate = parseFloat(localStorage.getItem(RATE_STORAGE_KEY) || '1');
        if ([0.85, 1, 1.15].includes(savedRate)) {
          this.speechRate = savedRate;
        }
      } catch {
        // Ignore storage errors
      }

      const unlockHandler = () => {
        this.unlockAudioSync();
      };
      window.addEventListener('touchstart', unlockHandler, { capture: true, passive: true });
      window.addEventListener('pointerdown', unlockHandler, { capture: true, passive: true });
      window.addEventListener('click', unlockHandler, { capture: true, passive: true });
    }
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  public setSpeechRate(rate: number): void {
    this.speechRate = rate;
    if (this.persistentAudio) {
      this.persistentAudio.playbackRate = rate;
    }
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.playbackRate.value = rate;
      } catch {
        // Ignore
      }
    }
    try {
      localStorage.setItem(RATE_STORAGE_KEY, String(rate));
    } catch {
      // Ignore
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getPersistentAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.persistentAudio) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      this.persistentAudio = audio;
    }
    return this.persistentAudio;
  }

  /**
   * Synchronously unlock Web Audio & HTMLAudioElement inside a user gesture
   * so iOS Safari and mobile Chrome allow playback even after async TTS fetch.
   */
  public unlockAudioSync(): void {
    if (typeof window === 'undefined') return;

    try {
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession && nav.audioSession.type !== 'playback') {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Ignore if audioSession is unsupported
    }

    const ctx = this.getContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const silentBuffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // Safe ignore
      }
    }

    if (!this.audioUnlocked) {
      const audio = this.getPersistentAudio();
      if (audio) {
        try {
          audio.src = SILENT_WAV_DATA_URI;
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                this.audioUnlocked = true;
                if (audio.src === SILENT_WAV_DATA_URI) {
                  audio.pause();
                }
              })
              .catch(() => {
                // Will retry on next gesture
              });
          } else {
            this.audioUnlocked = true;
          }
        } catch {
          // Safe ignore
        }
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public subscribeSpeaking(listener: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(listener);
    listener(this.isCurrentlySpeaking);
    return () => {
      this.speakingListeners.delete(listener);
    };
  }

  private setSpeaking(speaking: boolean) {
    this.isCurrentlySpeaking = speaking;
    this.speakingListeners.forEach((fn) => {
      try {
        fn(speaking);
      } catch {
        // Safe dispatch
      }
    });
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public stopSpeaking() {
    this.speechRequestId += 1;

    if (this.speechChunkTimer) {
      clearTimeout(this.speechChunkTimer);
      this.speechChunkTimer = null;
    }

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    this.activeFetchControllers.forEach((controller) => {
      try {
        controller.abort();
      } catch {
        // Safe ignore
      }
    });
    this.activeFetchControllers.clear();

    if (this.persistentAudio) {
      try {
        this.persistentAudio.onended = null;
        this.persistentAudio.onerror = null;
        this.persistentAudio.pause();
        this.persistentAudio.currentTime = 0;
      } catch {
        // Safe ignore
      }
    }

    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {
        // Safe ignore
      }
      this.currentBlobUrl = null;
    }

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch {
        // Safe ignore
      }
      this.activeSourceNode = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe ignore
      }
    }
    this.activeUtterance = null;
    this.setSpeaking(false);
  }

  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  public playCorrect() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.11, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.11);
      });
    } catch {
      // Audio fallback
    }
  }

  public playWrong() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [220, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.09, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.1);
      });
    } catch {
      // Audio fallback
    }
  }

  public playFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Speak a single Arabic text string fluently
   */
  public async speak(text: string): Promise<void> {
    const clean = cleanArabicForSpeech(text);
    if (!clean) return;
    await this.speakSegments([{ text: clean, optionId: null, pauseAfterMs: 0 }]);
  }

  /**
   * Fluent sequential speech engine:
   * - Unlocks mobile audio synchronously
   * - Pre-fetches upcoming segments in parallel while the current one plays
   * - Emits live option highlighting via onStepChange
   * - Plays natural pauses between question and numbered responses
   */
  public async speakSegments(
    segments: SpeechSegment[],
    onStepChange?: (optionId: number | null) => void,
    leadDelayMs: number = 0
  ): Promise<void> {
    if (this.isMuted || segments.length === 0) return;

    this.unlockAudioSync();
    this.stopSpeaking();
    const requestId = ++this.speechRequestId;
    this.setSpeaking(true);

    // Pre-fetch all segments in parallel while optional chime/lead delay finishes
    const fetchPromises = segments.map((seg) =>
      this.fetchTtsAudioBuffer(seg.text, requestId)
    );

    try {
      if (leadDelayMs > 0) {
        await new Promise<void>((resolve) => {
          this.pauseTimer = setTimeout(() => {
            this.pauseTimer = null;
            resolve();
          }, leadDelayMs);
        });
        if (this.speechRequestId !== requestId) return;
      }

      for (let i = 0; i < segments.length; i++) {
        if (this.speechRequestId !== requestId) return;
        const seg = segments[i];
        onStepChange?.(seg.optionId);

        const cachedAudio = await fetchPromises[i];
        if (this.speechRequestId !== requestId) return;

        let played = false;
        if (cachedAudio) {
          played = await this.playWithAudioElement(cachedAudio, requestId);
          if (this.speechRequestId !== requestId) return;

          if (!played) {
            played = await this.playWithAudioContext(cachedAudio, requestId);
            if (this.speechRequestId !== requestId) return;
          }
        }

        if (!played) {
          await this.playWebSpeech(seg.text, requestId);
          if (this.speechRequestId !== requestId) return;
        }

        if (seg.pauseAfterMs && seg.pauseAfterMs > 0 && i < segments.length - 1) {
          await new Promise<void>((resolve) => {
            this.pauseTimer = setTimeout(() => {
              this.pauseTimer = null;
              resolve();
            }, seg.pauseAfterMs);
          });
        }
      }
    } finally {
      if (this.speechRequestId === requestId) {
        onStepChange?.(null);
        this.setSpeaking(false);
      }
    }
  }

  /**
   * Silently pre-warm TTS audio buffers in background with low concurrency (2)
   * so clicking Valider or Listen starts immediately with zero wait.
   */
  public prefetchTexts(texts: string[]): void {
    if (this.isMuted || typeof window === 'undefined') return;
    const unique = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)));
    const queue = unique.filter((t) => {
      const key = t.toLowerCase();
      return !this.audioBufferCache.has(key) && !this.inFlightFetches.has(key);
    });
    if (queue.length === 0) return;

    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        await this.fetchSharedTtsBuffer(next);
      }
    };

    const workers = Array.from({ length: Math.min(2, queue.length) }, () => worker());
    void Promise.all(workers);
  }

  private fetchSharedTtsBuffer(cleanText: string): Promise<CachedClientAudio | null> {
    const cacheKey = cleanText.toLowerCase();
    const cached = this.audioBufferCache.get(cacheKey);
    if (cached && cached.buffer.byteLength > 0) {
      return Promise.resolve(cached);
    }

    const existingPromise = this.inFlightFetches.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const fetchPromise = (async () => {
      try {
        const url = `/api/tts?text=${encodeURIComponent(cleanText)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'audio/wav, audio/mpeg, audio/*' },
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('audio')) {
          return null;
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength === 0) {
          return null;
        }

        const entry: CachedClientAudio = {
          buffer,
          mimeType: contentType.split(';')[0].trim() || 'audio/mpeg',
        };

        if (this.audioBufferCache.size > 150) {
          const firstKey = this.audioBufferCache.keys().next().value;
          if (firstKey) this.audioBufferCache.delete(firstKey);
        }
        this.audioBufferCache.set(cacheKey, entry);
        return entry;
      } catch {
        return null;
      } finally {
        clearTimeout(timeoutId);
        this.inFlightFetches.delete(cacheKey);
      }
    })();

    this.inFlightFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async fetchTtsAudioBuffer(
    text: string,
    requestId: number
  ): Promise<CachedClientAudio | null> {
    const cleanText = text.trim();
    if (!cleanText) return null;
    const entry = await this.fetchSharedTtsBuffer(cleanText);
    if (this.speechRequestId !== requestId) return null;
    return entry;
  }

  private playWithAudioElement(audioData: CachedClientAudio, requestId: number): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = this.getPersistentAudio();
      if (!audio) {
        resolve(false);
        return;
      }

      let settled = false;
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = (result: boolean) => {
        if (settled) return;
        settled = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        audio.onended = null;
        audio.onerror = null;
        if (this.currentBlobUrl) {
          try {
            URL.revokeObjectURL(this.currentBlobUrl);
          } catch {
            // Safe ignore
          }
          this.currentBlobUrl = null;
        }
        resolve(result);
      };

      try {
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
          this.currentBlobUrl = null;
        }

        const blob = new Blob([audioData.buffer], { type: audioData.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        this.currentBlobUrl = blobUrl;

        watchdogTimer = setTimeout(() => cleanup(false), 60000);

        audio.onended = () => cleanup(true);
        audio.onerror = () => cleanup(false);

        audio.src = blobUrl;
        audio.playbackRate = this.speechRate;
        audio.load();

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              if (this.speechRequestId !== requestId) {
                audio.pause();
                cleanup(false);
              } else {
                this.audioUnlocked = true;
                audio.playbackRate = this.speechRate;
              }
            })
            .catch(() => {
              cleanup(false);
            });
        }
      } catch {
        cleanup(false);
      }
    });
  }

  private async playWithAudioContext(
    audioData: CachedClientAudio,
    requestId: number
  ): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (this.speechRequestId !== requestId) return false;

      const decodedBuffer = await ctx.decodeAudioData(audioData.buffer.slice(0));
      if (this.speechRequestId !== requestId) return false;

      return await new Promise<boolean>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        source.playbackRate.value = this.speechRate;
        source.connect(ctx.destination);
        this.activeSourceNode = source;

        const fallbackTimer = setTimeout(
          () => {
            if (this.activeSourceNode === source) {
              this.activeSourceNode = null;
            }
            resolve(true);
          },
          Math.ceil((decodedBuffer.duration / this.speechRate) * 1000) + 1000
        );

        source.onended = () => {
          clearTimeout(fallbackTimer);
          if (this.activeSourceNode === source) {
            this.activeSourceNode = null;
          }
          resolve(true);
        };

        source.start(0);
      });
    } catch {
      return false;
    }
  }

  private splitArabicForSpeech(text: string, maxLength = 130): string[] {
    const segments = text
      .replace(/([.?!؟؛،:\n])/g, '$1|')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const seg of segments) {
      if ((current + ' ' + seg).trim().length <= maxLength) {
        current = (current + ' ' + seg).trim();
      } else {
        if (current) chunks.push(current);
        if (seg.length > maxLength) {
          const words = seg.split(' ');
          let sub = '';
          for (const w of words) {
            if ((sub + ' ' + w).trim().length <= maxLength) {
              sub = (sub + ' ' + w).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          current = sub;
        } else {
          current = seg;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks.length > 0 ? chunks : [text];
  }

  private async getArabicVoice(): Promise<SpeechSynthesisVoice | null> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const findArabic = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
      const arabicVoices = voices.filter(
        (v) =>
          v.lang.toLowerCase().startsWith('ar') ||
          v.name.toLowerCase().includes('arabic') ||
          v.name.includes('العربية')
      );
      if (arabicVoices.length === 0) return null;
      return (
        arabicVoices.find((v) => v.lang.toLowerCase() === 'ar-ma') ||
        arabicVoices.find((v) => v.lang.toLowerCase() === 'ar-sa') ||
        arabicVoices[0]
      );
    };

    let voices = window.speechSynthesis.getVoices();
    let match = findArabic(voices);
    if (match || voices.length > 0) return match;

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
        resolve();
      }, 450);

      const onVoices = () => {
        clearTimeout(timer);
        window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
        resolve();
      };

      window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
    });

    voices = window.speechSynthesis.getVoices();
    return findArabic(voices);
  }

  private async playWebSpeech(text: string, requestId: number): Promise<boolean> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
        await new Promise((r) => setTimeout(r, 70));
      }
      if (this.speechRequestId !== requestId) return false;

      const arabicVoice = await this.getArabicVoice();
      if (this.speechRequestId !== requestId) return false;

      const chunks = this.splitArabicForSpeech(text, 130);

      for (const chunk of chunks) {
        if (this.speechRequestId !== requestId) return false;

        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = arabicVoice?.lang || 'ar-SA';
          utterance.rate = Math.min(1.25, Math.max(0.8, 0.94 * this.speechRate));
          if (arabicVoice) {
            utterance.voice = arabicVoice;
          }

          this.activeUtterance = utterance;

          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            if (this.speechChunkTimer) {
              clearTimeout(this.speechChunkTimer);
              this.speechChunkTimer = null;
            }
            if (this.activeUtterance === utterance) {
              this.activeUtterance = null;
            }
            resolve();
          };

          utterance.onend = finish;
          utterance.onerror = finish;

          this.speechChunkTimer = setTimeout(finish, Math.max(4500, chunk.length * 160));
          synth.speak(utterance);
        });
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const soundManager = new SoundEffects();

export function speakArabic(text: string): Promise<void> {
  return soundManager.speak(text);
}

export function speakArabicSegments(
  segments: SpeechSegment[],
  onStepChange?: (optionId: number | null) => void,
  leadDelayMs: number = 0
): Promise<void> {
  return soundManager.speakSegments(segments, onStepChange, leadDelayMs);
}
