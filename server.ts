/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

interface CachedAudio {
  buffer: Buffer;
  mimeType: string;
}

// In-memory cache for generated TTS audio to make repeat plays instantaneous
const ttsCache = new Map<string, CachedAudio>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Primary high-fluency Arabic speech via Gemini 3.8 Flash Lite TTS
 */
async function generateGeminiTts(text: string): Promise<CachedAudio | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
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
                  'Warm, fluent Moroccan driving instructor reading clear Arabic and Moroccan Darija with natural phrasing, smooth cadence, and gentle pauses at commas and periods',
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
    };
  } catch (err) {
    console.warn('Gemini TTS unavailable, using fallback stream:', err instanceof Error ? err.message : err);
    return null;
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

function sendAudioResponse(req: Request, res: Response, audioBuffer: Buffer, mimeType: string) {
  const totalLength = audioBuffer.length;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');

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

  // Check cache
  const cacheKey = cleanText.toLowerCase();
  if (ttsCache.has(cacheKey)) {
    const cached = ttsCache.get(cacheKey)!;
    return sendAudioResponse(req, res, cached.buffer, cached.mimeType);
  }

  try {
    // 1. Try Gemini 3.8 Flash Lite TTS for ultra-fluent natural Arabic voice
    let result = await generateGeminiTts(cleanText);

    // 2. Fallback to standard Arabic TTS stream
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
      };
    }

    // Cache the result (keep max 200 items in memory)
    if (ttsCache.size > 200) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, result);

    return sendAudioResponse(req, res, result.buffer, result.mimeType);
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
