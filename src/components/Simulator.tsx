import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Mic, 
  Volume2, 
  Zap, 
  Flame, 
  Sliders, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Move, 
  Sparkles, 
  RefreshCw,
  Video,
  Monitor
} from 'lucide-react';
import { AppSettings, SubtitleLog } from '../types';
import { translateAudioChunk, transcribeGroqAudio, translateTextToArabic } from '../services/apiClient';

interface SimulatorProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  openSettings: () => void;
}

const SAMPLE_VIDEOS = [
  {
    id: 'tech',
    title: 'Technology & AI Keynote',
    desc: 'Spoken English presentation explaining artificial intelligence and machine learning.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    // We will also support synthesis/synthesized speech or web audio track
  },
  {
    id: 'space',
    title: 'Science & Cosmos Documentary',
    desc: 'Documentary style narrative exploring planets, gravity, and deep galaxies.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'nature',
    title: 'Wildlife & Nature Exploration',
    desc: 'Calm narrative describing rainforests, oceans, and animal ecosystems.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
];

export const Simulator: React.FC<SimulatorProps> = ({
  settings,
  updateSettings,
  openSettings,
}) => {
  const [selectedVideo, setSelectedVideo] = useState(SAMPLE_VIDEOS[0].url);
  const [isTranslating, setIsTranslating] = useState(false);
  const [audioSourceMode, setAudioSourceMode] = useState<'video' | 'mic' | 'tab'>('video');
  const [currentSubtitle, setCurrentSubtitle] = useState<{
    arabic: string;
    original?: string;
    latencyMs: number;
    timestamp: number;
  } | null>(null);

  const [logs, setLogs] = useState<SubtitleLog[]>([]);
  const [activeChunkProgress, setActiveChunkProgress] = useState<number>(0);
  const [chunkCounter, setChunkCounter] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Overlay drag state
  const [overlayPos, setOverlayPos] = useState({ bottom: 40, leftPercent: 50 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialBottom: 40, initialLeft: 50 });

  // Update chunk progress bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTranslating) {
      interval = setInterval(() => {
        setActiveChunkProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + (100 / 35); // 3.5 seconds cycle
        });
      }, 100);
    } else {
      setActiveChunkProgress(0);
    }
    return () => clearInterval(interval);
  }, [isTranslating]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      stopTranslation();
    };
  }, []);

  const startTranslation = async () => {
    setErrorNotice(null);
    try {
      let captureStream: MediaStream | null = null;

      if (audioSourceMode === 'video' && videoRef.current) {
        // Capture audio from video element using HTML5 AudioContext capture
        try {
          // Play video first if paused
          if (videoRef.current.paused) {
            await videoRef.current.play();
          }

          // @ts-ignore
          if (videoRef.current.captureStream) {
            // @ts-ignore
            captureStream = videoRef.current.captureStream();
          } else if ((videoRef.current as any).mozCaptureStream) {
            captureStream = (videoRef.current as any).mozCaptureStream();
          }
        } catch (e) {
          console.warn('captureStream from video failed, falling back to microphone demo:', e);
        }
      } else if (audioSourceMode === 'mic') {
        captureStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (audioSourceMode === 'tab') {
        captureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      // If browser security blocks direct video captureStream (CORS on demo CDN), use simulated live speech feeder or mic
      if (!captureStream || captureStream.getAudioTracks().length === 0) {
        // Fallback to microphone for testing real speech
        captureStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioSourceMode('mic');
      }

      streamRef.current = captureStream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(captureStream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      mediaRecorderRef.current = recorder;

      let chunkIndex = 0;

      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 2000) {
          chunkIndex++;
          setChunkCounter(chunkIndex);
          handleRecordedAudioChunk(event.data, mimeType, chunkIndex);
        }
      };

      // 3500ms chunking cycle (exact match with extension offscreen document)
      recorder.start(3500);
      setIsTranslating(true);
    } catch (err: any) {
      console.error('Error starting live audio capture:', err);
      setErrorNotice(err?.message || 'Could not access audio stream. Ensure microphone/audio permissions are granted.');
      setIsTranslating(false);
    }
  };

  const stopTranslation = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
    }
    setIsTranslating(false);
    setIsProcessing(false);
  };

  const handleRecordedAudioChunk = async (blob: Blob, mimeType: string, index: number) => {
    setIsProcessing(true);
    const startTime = Date.now();
    const logId = `chunk-${Date.now()}-${index}`;

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      if (!base64Data) {
        setIsProcessing(false);
        return;
      }

      let arabicResult = '';
      let englishTranscript = '';

      try {
        if (settings.pipeline === 'optionA') {
          // Option A: Direct Multimodal Gemini Flash (Audio -> Arabic STT+Translation in 1 Call)
          const res = await translateAudioChunk(base64Data, settings.userGeminiKey, mimeType);
          arabicResult = res.arabicText;
        } else {
          // Option B: Groq Whisper-large-v3 -> Gemini Flash Arabic Translation
          if (!settings.groqKey) {
            throw new Error('Groq API Key is required for Option B. Enter it in Settings or switch to Option A.');
          }

          // Step 1: STT
          const sttRes = await transcribeGroqAudio(base64Data, settings.groqKey);
          englishTranscript = sttRes.transcription;

          // Step 2: Arabic Translation
          if (englishTranscript && englishTranscript.trim()) {
            const transRes = await translateTextToArabic(englishTranscript, settings.userGeminiKey);
            arabicResult = transRes.arabicText;
          }
        }

        const latency = Date.now() - startTime;

        if (arabicResult && arabicResult.trim()) {
          setCurrentSubtitle({
            arabic: arabicResult,
            original: englishTranscript || undefined,
            latencyMs: latency,
            timestamp: Date.now(),
          });

          // Add to log
          setLogs((prev) => [
            {
              id: logId,
              timestamp: new Date().toLocaleTimeString('ar-EG'),
              chunkDuration: 3.5,
              originalText: englishTranscript || undefined,
              arabicText: arabicResult,
              latencyMs: latency,
              pipeline: settings.pipeline === 'optionA' ? 'Gemini 1-Shot' : 'Groq Whisper + Gemini',
              status: 'success',
            },
            ...prev.slice(0, 24),
          ]);
        }
      } catch (err: any) {
        console.error('Translation error in chunk:', err);
        setErrorNotice(err?.message || 'API request failed');
        setLogs((prev) => [
          {
            id: logId,
            timestamp: new Date().toLocaleTimeString('ar-EG'),
            chunkDuration: 3.5,
            arabicText: '',
            latencyMs: Date.now() - startTime,
            pipeline: settings.pipeline === 'optionA' ? 'Option A' : 'Option B',
            status: 'error',
            errorMessage: err?.message || 'Translation failed',
          },
          ...prev.slice(0, 24),
        ]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(blob);
  };

  // Drag handling for live overlay
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialBottom: overlayPos.bottom,
      initialLeft: overlayPos.leftPercent,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = dragStartRef.current.y - e.clientY;
    const deltaX = e.clientX - dragStartRef.current.x;

    setOverlayPos((prev) => ({
      bottom: Math.max(10, Math.min(300, dragStartRef.current.initialBottom + deltaY)),
      leftPercent: Math.max(20, Math.min(80, dragStartRef.current.initialLeft + (deltaX / 5))),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="space-y-6" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      
      {/* Top Banner & Pipeline Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                محاكي الترجمة الفورية والترجمة العائمة (Live Video Simulator)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              قم بتشغيل المحاكي لتجربة نفس دورة المعالجة (3.5 ثوانٍ لكل شريحة صوتية) التي تنفذها إضافة كروم/براف مباشرة فوق الفيديو.
            </p>
          </div>

          {/* Pipeline Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => updateSettings({ pipeline: 'optionA' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.pipeline === 'optionA'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>الخيار (أ): Gemini مباشر</span>
            </button>
            <button
              onClick={() => updateSettings({ pipeline: 'optionB' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.pipeline === 'optionB'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>الخيار (ب): Groq + Gemini</span>
            </button>
          </div>
        </div>
      </div>

      {errorNotice && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold mb-0.5">تنبيه المعالجة:</div>
            <div>{errorNotice}</div>
          </div>
          <button 
            onClick={() => setErrorNotice(null)}
            className="text-red-400 hover:text-white text-xs underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Grid: Video Player + Live Overlay vs Metrics & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Player & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Player Header */}
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isTranslating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="font-semibold text-slate-300">
                  {isTranslating ? 'التقاط الصوت والترجمة نشطة الآن' : 'مشغل الفيديو التجريبي'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span>مصدر الصوت:</span>
                <select
                  value={audioSourceMode}
                  onChange={(e) => setAudioSourceMode(e.target.value as any)}
                  disabled={isTranslating}
                  className="bg-slate-850 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="video">صوت الفيديو المباشر</option>
                  <option value="mic">ميكروفونك (تحدث لتجربة الترجمة)</option>
                  <option value="tab">صوت نافذة أو تبويب آخر (Screen Share)</option>
                </select>
              </div>
            </div>

            {/* Video Container with Overlaid Subtitles */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src={selectedVideo}
                controls
                crossOrigin="anonymous"
                className="w-full h-full object-contain"
              />

              {/* FLOATING SUBTITLE OVERLAY (Exact simulation of content.js) */}
              <div
                style={{
                  bottom: `${overlayPos.bottom}px`,
                  left: `${overlayPos.leftPercent}%`,
                  transform: 'translateX(-50%)',
                }}
                className={`absolute z-30 transition-all duration-300 select-none max-w-[90%] min-w-[280px] ${
                  currentSubtitle ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div
                  dir="rtl"
                  style={{
                    backgroundColor: `rgba(15, 23, 42, ${settings.bgOpacity})`,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                  className="backdrop-blur-md border rounded-xl shadow-2xl p-3.5 text-center text-white cursor-move group"
                  onMouseDown={handleMouseDown}
                >
                  {/* Drag Handle & Badge */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 mb-1 border-b border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ترجمة فورية (Live)
                    </span>
                    <span className="flex items-center gap-1">
                      <Move className="w-2.5 h-2.5" />
                      اسحب للتحريك
                    </span>
                    {currentSubtitle && (
                      <span className="font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px]">
                        ⚡ {currentSubtitle.latencyMs}ms
                      </span>
                    )}
                  </div>

                  {/* Optional Original English Text */}
                  {settings.showOriginal && currentSubtitle?.original && (
                    <div
                      dir="ltr"
                      className="text-xs text-slate-300/80 font-sans mb-1 text-center truncate"
                    >
                      {currentSubtitle.original}
                    </div>
                  )}

                  {/* Primary Arabic Subtitle */}
                  <div
                    style={{
                      fontSize: `${settings.fontSize}px`,
                      fontFamily: `${settings.fontFamily}, sans-serif`,
                      color: settings.textColor,
                    }}
                    className="font-bold leading-relaxed tracking-wide drop-shadow-md text-emerald-50"
                  >
                    {currentSubtitle?.arabic || 'في انتظار الصوت...'}
                  </div>
                </div>
              </div>

              {/* Slicing wave animation indicator on bottom */}
              {isTranslating && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 z-20">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100"
                    style={{ width: `${activeChunkProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-slate-950 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {!isTranslating ? (
                  <button
                    onClick={startTranslation}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>بدء الترجمة الفورية (Live)</span>
                  </button>
                ) : (
                  <button
                    onClick={stopTranslation}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>إيقاف الترجمة</span>
                  </button>
                )}

                {isProcessing && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>جاري معالجة الشريحة #{chunkCounter}...</span>
                  </span>
                )}
              </div>

              {/* Preset Video Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">فيديو العينة:</span>
                <select
                  value={selectedVideo}
                  onChange={(e) => {
                    setSelectedVideo(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  disabled={isTranslating}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  {SAMPLE_VIDEOS.map((v) => (
                    <option key={v.id} value={v.url}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Quick Subtitle Styler */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                تخصيص العرض:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">الحجم:</span>
                <input
                  type="range"
                  min="16"
                  max="36"
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-24 accent-emerald-500"
                />
                <span className="text-slate-200 font-mono">{settings.fontSize}px</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.showOriginal}
                  onChange={(e) => updateSettings({ showOriginal: e.target.checked })}
                  className="accent-emerald-500 rounded"
                />
                <span>عرض النص الإنجليزي أعلى الترجمة</span>
              </label>

              <button
                onClick={openSettings}
                className="text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                المزيد من الإعدادات والمفاتيح ➔
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Slices & Latency Log (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[520px] shadow-xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">سجل شرائح الصوت والترجمة (Audio Slices Log)</h3>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
              >
                مسح السجل
              </button>
            </div>

            {/* Slices feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-3">
                    <Volume2 className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">لا توجد شرائح صوتية مسجلة بعد</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    اضغط على "بدء الترجمة الفورية" لتشغيل دورة التقاط الصوت (3.5 ثوانٍ لكل شريحة) وترجمتها بالعربية فورياً.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      log.status === 'success'
                        ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-mono text-slate-500">{log.timestamp}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {log.chunkDuration}s slice
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                          ⚡ {log.latencyMs}ms
                        </span>
                      </div>
                    </div>

                    {log.originalText && (
                      <div dir="ltr" className="text-slate-400 font-sans mb-1 text-[11px] bg-slate-900/50 p-1.5 rounded">
                        "{log.originalText}"
                      </div>
                    )}

                    {log.arabicText ? (
                      <div dir="rtl" className="font-['Cairo'] font-bold text-slate-100 text-sm leading-relaxed">
                        {log.arabicText}
                      </div>
                    ) : (
                      <div className="text-red-400 text-xs">
                        {log.errorMessage || 'حدث خطأ أثناء الترجمة'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Architecture Footer Status */}
            <div className="pt-3 border-t border-slate-800 mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>دورة الشرائح: 3500ms • كودكس: Opus</span>
              <span className="text-emerald-400 font-medium">
                {settings.pipeline === 'optionA' ? 'Gemini 3.8 Flash Direct' : 'Groq Whisper-large-v3'}
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
