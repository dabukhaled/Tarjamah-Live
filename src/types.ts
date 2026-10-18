export type PipelineType = 'optionA' | 'optionB';

export interface AppSettings {
  pipeline: PipelineType;
  userGeminiKey: string;
  groqKey: string;
  fontSize: number;
  fontFamily: string;
  bgOpacity: number;
  showOriginal: boolean;
  textColor: string;
}

export interface SubtitleLog {
  id: string;
  timestamp: string;
  chunkDuration: number;
  originalText?: string;
  arabicText: string;
  latencyMs: number;
  pipeline: string;
  status: 'success' | 'translating' | 'error';
  errorMessage?: string;
}

export interface ServerStatus {
  ok: boolean;
  hasServerGeminiKey: boolean;
  geminiModel: string;
  groqModel: string;
  serverTime: string;
}
