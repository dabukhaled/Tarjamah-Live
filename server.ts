import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing JSON with generous limit for audio base64 chunks
app.use(express.json({ limit: '25mb' }));

// Health / status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: 'gemini-3.8-flash',
    groqModel: 'whisper-large-v3',
    serverTime: new Date().toISOString(),
  });
});

// Option A: Direct Multimodal Audio Chunk -> Arabic Translation
app.post('/api/translate-audio', async (req, res) => {
  const startTime = Date.now();
  try {
    const { audioBase64, mimeType = 'audio/webm', userApiKey } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'No Gemini API key provided. Add GEMINI_API_KEY in server secrets or provide your key in settings.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = 
      `You are an expert real-time video subtitle translator for Arabic viewers. ` +
      `Listen to this short audio segment (3-5 seconds). Transcribe the spoken speech and translate it immediately into natural, context-aware Modern Standard Arabic (فصحى معاصرة). ` +
      `RULES: ` +
      `1. Output STRICTLY the translated Arabic text. ` +
      `2. Absolutely NO introductory phrases, NO conversational filler, NO explanations, NO quotes, NO notes, NO HTML. ` +
      `3. If there is no clear speech, or only silence/background music/noise, respond with an empty string ("").`;

    // Strip data URL prefix if present
    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe spoken words and output strictly the Arabic translation for subtitles:',
          },
        ],
      },
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const arabicText = (response.text || '').trim();
    const latencyMs = Date.now() - startTime;

    return res.json({
      arabicText,
      latencyMs,
      pipeline: 'Option A (Direct Multimodal Gemini)',
    });
  } catch (error: any) {
    console.error('Error in /api/translate-audio:', error);
    return res.status(500).json({
      error: error?.message || 'Audio translation failed',
      latencyMs: Date.now() - startTime,
    });
  }
});

// Option B - Step 2: Transcribed Text -> Smooth Contextual Arabic Translation
app.post('/api/translate-text', async (req, res) => {
  const startTime = Date.now();
  try {
    const { text, userApiKey } = req.body;

    if (!text || !text.trim()) {
      return res.json({ arabicText: '', latencyMs: 0 });
    }

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'No Gemini API key provided. Add GEMINI_API_KEY in server secrets or enter in settings.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = 
      `You are an elite live video subtitle translator. ` +
      `Translate the provided transcribed speech snippet directly into natural, idiomatic, clear Modern Standard Arabic (فصحى سلسة). ` +
      `RULES: ` +
      `1. Return ONLY the translated Arabic text. ` +
      `2. NO pleasantries, NO commentary, NO transliteration, NO punctuation tags. ` +
      `3. Keep it brief, suitable for subtitles on screen.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: text.trim(),
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    const arabicText = (response.text || '').trim();
    const latencyMs = Date.now() - startTime;

    return res.json({
      originalText: text.trim(),
      arabicText,
      latencyMs,
      pipeline: 'Option B - Step 2 (Gemini Text Translation)',
    });
  } catch (error: any) {
    console.error('Error in /api/translate-text:', error);
    return res.status(500).json({
      error: error?.message || 'Text translation failed',
      latencyMs: Date.now() - startTime,
    });
  }
});

// Option B - Step 1: Groq Whisper Proxy (Handles audio upload to Groq Whisper v3 without browser CORS issues)
app.post('/api/groq-whisper', async (req, res) => {
  const startTime = Date.now();
  try {
    const { audioBase64, groqApiKey } = req.body;

    if (!groqApiKey || !groqApiKey.trim()) {
      return res.status(400).json({ error: 'Groq API Key is required for Option B Whisper STT.' });
    }

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Create a Blob/File for multipart form data
    const formData = new FormData();
    const audioBlob = new Blob([buffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio_chunk.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey.trim()}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(groqRes.status).json({
        error: `Groq Whisper API returned error (${groqRes.status}): ${errText}`
      });
    }

    const groqData = await groqRes.json();
    const transcription = (groqData.text || '').trim();
    const latencyMs = Date.now() - startTime;

    return res.json({
      transcription,
      latencyMs,
      pipeline: 'Option B - Step 1 (Groq Whisper-large-v3)',
    });
  } catch (error: any) {
    console.error('Error in /api/groq-whisper:', error);
    return res.status(500).json({
      error: error?.message || 'Groq Whisper request failed',
      latencyMs: Date.now() - startTime,
    });
  }
});

// Setup Vite or static serving
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Tarjamah Live server listening on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
