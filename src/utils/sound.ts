/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Synthesized sound effects using standard Web Audio API without external file dependencies
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private isCurrentlySpeaking: boolean = false;
  private speakingListeners: Set<(speaking: boolean) => void> = new Set();

  constructor() {
    // AudioContext will be initialized on first user interaction
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
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Safe ignore
      }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe ignore
      }
    }
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
   * Robust Arabic Speech Player:
   * 1. Plays natural online Arabic audio TTS stream
   * 2. Fallbacks to Web Speech API if offline or blocked
   */
  public async speak(text: string): Promise<void> {
    if (this.isMuted || !text.trim()) return;

    // Stop previous audio
    this.stopSpeaking();
    this.playClick();
    this.setSpeaking(true);

    const cleanText = text
      .replace(/[1-4]\s*\.{2,}/g, '')
      .replace(/[1-4]\s*-\s*/g, '')
      .trim();

    // Strategy 1: Natural Arabic Audio Stream
    const playedViaStream = await this.playAudioStream(cleanText);
    if (playedViaStream) {
      this.setSpeaking(false);
      return;
    }

    // Strategy 2: Web Speech Synthesis API
    await this.playWebSpeech(cleanText);
    this.setSpeaking(false);
  }

  private playAudioStream(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = `/api/tts?text=${encodeURIComponent(text)}`;

        const audio = new Audio();
        this.currentAudio = audio;
        audio.preload = 'auto';

        let startTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          if (this.currentAudio === audio) {
            audio.pause();
            this.currentAudio = null;
          }
          resolve(false);
        }, 10000);

        audio.onplaying = () => {
          if (startTimeout) {
            clearTimeout(startTimeout);
            startTimeout = null;
          }
        };

        audio.oncanplaythrough = () => {
          audio.play().catch(() => {
            if (startTimeout) {
              clearTimeout(startTimeout);
              startTimeout = null;
            }
            resolve(false);
          });
        };

        audio.onended = () => {
          if (startTimeout) {
            clearTimeout(startTimeout);
            startTimeout = null;
          }
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve(true);
        };

        audio.onerror = () => {
          if (startTimeout) {
            clearTimeout(startTimeout);
            startTimeout = null;
          }
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve(false);
        };

        audio.src = url;
      } catch {
        resolve(false);
      }
    });
  }

  private playWebSpeech(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve(false);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang.startsWith('ar') || v.lang.includes('Arabic')) ||
          voices.find((v) => v.lang.startsWith('fr') || v.lang.startsWith('en'));

        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }
}

export const soundManager = new SoundEffects();

export function speakArabic(text: string): Promise<void> {
  return soundManager.speak(text);
}
