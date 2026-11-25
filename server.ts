/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const TTS_DISK_CACHE_DIR = '/tmp/siyaqati-tts-cache';
try {
  fs.mkdirSync(TTS_DISK_CACHE_DIR, { recursive: true });
} catch {
  // Ignore if /tmp is unavailable
}

function getDiskCachePath(cacheKey: string): string {
  const hash = crypto.createHash('sha256').update(cacheKey).digest('hex');
  return path.join(TTS_DISK_CACHE_DIR, `${hash}.wav`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

interface CachedAudio {
  buffer: Buffer;
  mimeType: string;
  engine: 'gemini' | 'fallback';
}

// In-memory cache for generated TTS audio to make repeat plays instantaneous
const ttsCache = new Map<string, CachedAudio>();
const inFlightTts = new Map<string, Promise<CachedAudio>>();
let cachedGeminiClient: GoogleGenAI | null | undefined;

function getGeminiClient(): GoogleGenAI | null {
  if (cachedGeminiClient !== undefined) return cachedGeminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    cachedGeminiClient = null;
    return null;
  }
  cachedGeminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedGeminiClient;
}

/**
 * Primary high-fluency Arabic speech via Gemini 3.8 Flash Lite TTS
 */
async function generateGeminiTts(text: string): Promise<{ audio: CachedAudio | null; errorReason?: string }> {
  const ai = getGeminiClient();
  if (!ai) return { audio: null, errorReason: 'missing-api-key' };

  const callGemini = async (): Promise<CachedAudio | null> => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style:
                  'Clear, articulate, calm Moroccan driving instructor speaking distinct Arabic and Moroccan Darija with crisp pronunciation, steady unhurried cadence, and natural pauses between phrases',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;
    if (!base64Audio) return null;

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    if (wavBuffer.length === 0) return null;

    return {
      buffer: wavBuffer,
      mimeType: part?.inlineData?.mimeType || 'audio/wav',
      engine: 'gemini',
    };
  };

  try {
    const audio = await callGemini();
    if (!audio) return { audio: null, errorReason: 'empty-audio' };
    return { audio };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit) {
      // Brief backoff and single retry before falling back
      await new Promise((r) => setTimeout(r, 700));
      try {
        const retryAudio = await callGemini();
        if (retryAudio) return { audio: retryAudio };
      } catch (retryErr: unknown) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.warn('Gemini TTS rate-limited after retry:', retryMsg);
        return { audio: null, errorReason: retryMsg.slice(0, 120) };
      }
    }
    console.warn('Gemini TTS unavailable, using fallback stream:', msg);
    return { audio: null, errorReason: msg.slice(0, 120) };
  }
}

/**
 * Split text into natural sentence clauses under 195 characters for fallback TTS
 */
function splitTextIntoChunks(text: string, maxLength = 195): string[] {
  const sentences = text
    .replace(/([.?!؟؛،:\n])/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (sentence.length > maxLength) {
        const words = sentence.split(' ');
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + ' ' + word).trim().length <= maxLength) {
            subChunk = (subChunk + ' ' + word).trim();
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = word;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

/**
 * Fetch fallback TTS audio chunk in Arabic with client fallback
 */
async function fetchAudioChunk(chunkText: string): Promise<Buffer> {
  const clients = ['tw-ob', 'gtx'];
  let lastError: Error | null = null;

  for (const client of clients) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=${client}&tl=ar&q=${encodeURIComponent(
        chunkText
      )}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });

      if (!response.ok) {
        lastError = new Error(`TTS upstream error (${client}): ${response.status}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        return Buffer.from(arrayBuffer);
      }
      lastError = new Error(`TTS upstream returned empty audio (${client})`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Failed to fetch TTS audio chunk');
}

function sendAudioResponse(
  req: Request,
  res: Response,
  audioBuffer: Buffer,
  mimeType: string,
  engine: 'gemini' | 'fallback' = 'gemini'
) {
  const totalLength = audioBuffer.length;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-TTS-Engine', engine);
  res.setHeader(
    'Cache-Control',
    engine === 'gemini' ? 'public, max-age=86400' : 'no-store'
  );

  if (rangeHeader) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), totalLength - 1) : totalLength - 1;

      if (start >= 0 && start < totalLength && end >= start) {
        const chunk = audioBuffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
        res.setHeader('Content-Length', chunk.length);
        return res.end(chunk);
      }
    }
  }

  res.status(200);
  res.setHeader('Content-Length', totalLength);
  return res.end(audioBuffer);
}

// Endpoint: GET /api/tts?text=...
app.get('/api/tts', async (req: Request, res: Response) => {
  const rawText = (req.query.text as string) || '';
  if (!rawText.trim()) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  // Normalize text for spoken Arabic
  const cleanText = rawText
    .replace(/[1-4]\s*\.{2,}/g, '')
    .replace(/\.{3,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  // Check Gemini in-memory & disk cache
  const cacheKey = cleanText.toLowerCase();
  if (ttsCache.has(cacheKey)) {
    const cached = ttsCache.get(cacheKey)!;
    return sendAudioResponse(req, res, cached.buffer, cached.mimeType, cached.engine);
  }

  const diskPath = getDiskCachePath(cacheKey);
  try {
    if (fs.existsSync(diskPath)) {
      const diskBuf = fs.readFileSync(diskPath);
      if (diskBuf.length > 44) {
        const cached: CachedAudio = { buffer: diskBuf, mimeType: 'audio/wav', engine: 'gemini' };
        ttsCache.set(cacheKey, cached);
        return sendAudioResponse(req, res, cached.buffer, cached.mimeType, 'gemini');
      }
    }
  } catch {
    // Ignore disk cache read error
  }

  try {
    let generationPromise = inFlightTts.get(cacheKey);
    if (!generationPromise) {
      generationPromise = (async () => {
        // 1. Try Gemini 3.8 Flash Lite TTS for ultra-fluent natural Arabic voice
        const geminiAttempt = await generateGeminiTts(cleanText);
        let result = geminiAttempt.audio;

        // 2. Fallback to standard Arabic TTS stream (do NOT cache in ttsCache so Gemini can recover)
        if (!result) {
          const chunks = splitTextIntoChunks(cleanText, 195);
          const audioBuffers: Buffer[] = [];

          for (const chunk of chunks) {
            if (!chunk.trim()) continue;
            const buf = await fetchAudioChunk(chunk);
            audioBuffers.push(buf);
          }

          result = {
            buffer: Buffer.concat(audioBuffers),
            mimeType: 'audio/mpeg',
            engine: 'fallback',
          };
        } else {
          // Cache only high-quality Gemini TTS audio in memory & disk
          if (ttsCache.size > 300) {
            const firstKey = ttsCache.keys().next().value;
            if (firstKey) ttsCache.delete(firstKey);
          }
          ttsCache.set(cacheKey, result);
          try {
            fs.writeFileSync(diskPath, result.buffer);
          } catch {
            // Ignore disk write error
          }
        }

        return result;
      })().finally(() => {
        inFlightTts.delete(cacheKey);
      });

      inFlightTts.set(cacheKey, generationPromise);
    }

    const result = await generationPromise;
    return sendAudioResponse(req, res, result.buffer, result.mimeType, result.engine);
  } catch (error) {
    console.error('Error generating Arabic speech:', error);
    return res.status(500).json({ error: 'Failed to generate speech audio' });
  }
});

async function startServer() {
  if (!isProd) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
