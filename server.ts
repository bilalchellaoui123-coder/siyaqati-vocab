/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory cache for generated TTS audio to make repeat plays instantaneous
const ttsCache = new Map<string, Buffer>();

/**
 * Split text into small chunks suitable for TTS (under 160 characters)
 */
function splitTextIntoChunks(text: string, maxLength = 150): string[] {
  const sentences = text
    .replace(/([.?!؛،:\n])/g, '$1|')
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
        // Break long sentence by spaces
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
        if (subChunk) currentChunk = subChunk;
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
 * Fetch TTS audio chunk in Arabic
 */
async function fetchAudioChunk(chunkText: string): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(
    chunkText
  )}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`TTS upstream error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
    const cachedBuffer = ttsCache.get(cacheKey)!;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', cachedBuffer.length);
    return res.end(cachedBuffer);
  }

  try {
    const chunks = splitTextIntoChunks(cleanText, 140);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const buf = await fetchAudioChunk(chunk);
      audioBuffers.push(buf);
    }

    const finalAudio = Buffer.concat(audioBuffers);

    // Cache the result (keep max 200 items in memory)
    if (ttsCache.size > 200) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, finalAudio);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', finalAudio.length);
    return res.end(finalAudio);
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
