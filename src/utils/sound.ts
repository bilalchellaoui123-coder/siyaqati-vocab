/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1-sample silent WAV used to unlock HTMLAudioElement on iOS Safari & Android Chrome
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Synthesized sound effects + mobile-resilient Arabic speech player
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private persistentAudio: HTMLAudioElement | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeFetchController: AbortController | null = null;
  private currentBlobUrl: string | null = null;
  private audioUnlocked: boolean = false;
  private isCurrentlySpeaking: boolean = false;
  private speechRequestId: number = 0;
  private speechChunkTimer: ReturnType<typeof setTimeout> | null = null;
  private speakingListeners: Set<(speaking: boolean) => void> = new Set();
  private audioBufferCache: Map<string, ArrayBuffer> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudioSync();
      };
      window.addEventListener('touchstart', unlockHandler, { capture: true, passive: true });
      window.addEventListener('pointerdown', unlockHandler, { capture: true, passive: true });
      window.addEventListener('click', unlockHandler, { capture: true, passive: true });
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

    // Tell iOS 16.4+ to play audio even when the hardware Silent/Ring switch is on
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
        // Play a 1-sample silent buffer to unlock iOS Web Audio
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
                // Only pause if nothing else replaced src in the meantime
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

    if (this.activeFetchController) {
      try {
        this.activeFetchController.abort();
      } catch {
        // Safe ignore
      }
      this.activeFetchController = null;
    }

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
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
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
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.18);
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
   * Mobile-resilient Arabic Speech Player:
   * 1. Synchronously unlocks iOS/Android audio during the tap gesture
   * 2. Fetches & caches MP3 from /api/tts and plays via unlocked HTMLAudioElement or Web Audio API
   * 3. Falls back to mobile-safe chunked Arabic Web Speech API if offline or backend unavailable
   */
  public async speak(text: string): Promise<void> {
    if (this.isMuted || !text.trim()) return;

    // Unlock audio synchronously inside user gesture before any await
    this.unlockAudioSync();

    // Cancel previous playback and claim a fresh request token
    this.stopSpeaking();
    const requestId = ++this.speechRequestId;
    this.setSpeaking(true);

    const cleanText = text
      .replace(/[1-4]\s*\.{2,}/g, '')
      .replace(/[1-4]\s*-\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (this.speechRequestId === requestId) {
        this.setSpeaking(false);
      }
      return;
    }

    // Strategy 1: Fetch natural Arabic MP3 audio from /api/tts (with client cache)
    const audioBuffer = await this.fetchTtsAudioBuffer(cleanText, requestId);
    if (this.speechRequestId !== requestId) return;

    if (audioBuffer) {
      // Try persistent unlocked HTMLAudioElement first (works even with iPhone Silent switch on)
      const playedElement = await this.playWithAudioElement(audioBuffer, requestId);
      if (this.speechRequestId !== requestId) return;
      if (playedElement) {
        this.setSpeaking(false);
        return;
      }

      // Fallback to Web Audio API decodeAudioData (works reliably in auto-play / setTimeout)
      const playedCtx = await this.playWithAudioContext(audioBuffer, requestId);
      if (this.speechRequestId !== requestId) return;
      if (playedCtx) {
        this.setSpeaking(false);
        return;
      }
    }

    // Strategy 2: Native Arabic Web Speech Synthesis fallback (chunked for mobile Chrome & iOS)
    await this.playWebSpeech(cleanText, requestId);
    if (this.speechRequestId === requestId) {
      this.setSpeaking(false);
    }
  }

  private async fetchTtsAudioBuffer(text: string, requestId: number): Promise<ArrayBuffer | null> {
    const cacheKey = text.toLowerCase();
    const cached = this.audioBufferCache.get(cacheKey);
    if (cached && cached.byteLength > 0) {
      return cached;
    }

    const controller = new AbortController();
    this.activeFetchController = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'audio/mpeg, audio/*' },
      });

      if (this.speechRequestId !== requestId) return null;

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('audio')) {
        return null;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || this.speechRequestId !== requestId) {
        return null;
      }

      if (this.audioBufferCache.size > 60) {
        const firstKey = this.audioBufferCache.keys().next().value;
        if (firstKey) this.audioBufferCache.delete(firstKey);
      }
      this.audioBufferCache.set(cacheKey, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (this.activeFetchController === controller) {
        this.activeFetchController = null;
      }
    }
  }

  private playWithAudioElement(arrayBuffer: ArrayBuffer, requestId: number): Promise<boolean> {
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

        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        this.currentBlobUrl = blobUrl;

        // Safety watchdog in case mobile browser drops onended
        watchdogTimer = setTimeout(() => cleanup(false), 60000);

        audio.onended = () => cleanup(true);
        audio.onerror = () => cleanup(false);

        audio.src = blobUrl;
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

  private async playWithAudioContext(arrayBuffer: ArrayBuffer, requestId: number): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (this.speechRequestId !== requestId) return false;

      // Always pass a copy so the cached ArrayBuffer is never detached
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      if (this.speechRequestId !== requestId) return false;

      return await new Promise<boolean>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(ctx.destination);
        this.activeSourceNode = source;

        const fallbackTimer = setTimeout(
          () => {
            if (this.activeSourceNode === source) {
              this.activeSourceNode = null;
            }
            resolve(true);
          },
          Math.ceil(decodedBuffer.duration * 1000) + 1000
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
      .replace(/([.?!؛،:\n])/g, '$1|')
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

    // Mobile Chrome & Safari populate voices asynchronously
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
        // iOS Safari needs a short pause after cancel() before speaking a new utterance
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
          utterance.rate = 0.92;
          // NEVER assign a French or English voice to Arabic text
          if (arabicVoice) {
            utterance.voice = arabicVoice;
          }

          // Retain utterance reference so mobile browsers don't GC it mid-speech
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

          // Safety timer if Android WebView misses onend
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
