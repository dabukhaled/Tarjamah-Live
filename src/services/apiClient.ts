import { ServerStatus } from '../types';

export async function fetchServerStatus(): Promise<ServerStatus> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch (err) {
    return {
      ok: false,
      hasServerGeminiKey: false,
      geminiModel: 'gemini-3.8-flash',
      groqModel: 'whisper-large-v3',
      serverTime: new Date().toISOString(),
    };
  }
}

export async function translateAudioChunk(
  audioBase64: string,
  userApiKey?: string,
  mimeType: string = 'audio/webm'
): Promise<{ arabicText: string; latencyMs: number; pipeline: string }> {
  const res = await fetch('/api/translate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, userApiKey, mimeType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Audio translation failed');
  }
  return data;
}

export async function translateTextToArabic(
  text: string,
  userApiKey?: string
): Promise<{ arabicText: string; originalText: string; latencyMs: number; pipeline: string }> {
  const res = await fetch('/api/translate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userApiKey }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Text translation failed');
  }
  return data;
}

export async function transcribeGroqAudio(
  audioBase64: string,
  groqApiKey: string
): Promise<{ transcription: string; latencyMs: number; pipeline: string }> {
  const res = await fetch('/api/groq-whisper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, groqApiKey }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Groq transcription failed');
  }
  return data;
}
