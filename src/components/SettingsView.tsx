import React, { useState } from 'react';
import { 
  Key, 
  Zap, 
  Flame, 
  Sliders, 
  CheckCircle2, 
  ExternalLink, 
  Activity, 
  RefreshCw,
  Eye,
  EyeOff,
  Server
} from 'lucide-react';
import { AppSettings, ServerStatus } from '../types';
import { translateTextToArabic } from '../services/apiClient';

interface SettingsViewProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  serverStatus: ServerStatus | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  updateSettings,
  serverStatus,
}) => {
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latencyMs?: number;
    translatedSample?: string;
    error?: string;
  }>({ status: 'idle' });

  const handleTestApi = async () => {
    setTestResult({ status: 'testing' });
    const startTime = Date.now();
    try {
      const sampleEnglish = "Artificial intelligence is transforming real-time video subtitles worldwide.";
      const res = await translateTextToArabic(sampleEnglish, settings.userGeminiKey);
      setTestResult({
        status: 'success',
        latencyMs: res.latencyMs || (Date.now() - startTime),
        translatedSample: res.arabicText,
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        error: err.message || 'API request failed. Check your API key or network connection.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-emerald-400" />
          <span>إعدادات المفاتيح ومسار الترجمة (API Keys & Pipeline Setup)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          يمكنك تخصيص مفاتيح API الخاصة بك وتحديد المسار الافتراضي لمعالجة شرائح الصوت. يتم حفظ هذه الإعدادات محلياً في متصفحك.
        </p>

        {/* Server Status pill */}
        {serverStatus && (
          <div className="pt-2 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>حالة خادم AI Studio:</span>
              <span className="text-emerald-400 font-bold">متصل وفعال</span>
            </span>
            {serverStatus.hasServerGeminiKey && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                مفتاح Gemini الخادم مهيأ تلقائياً ✓
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>اختيار مسار المعالجة (Dual Processing Strategy)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div
            onClick={() => updateSettings({ pipeline: 'optionA' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.pipeline === 'optionA'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                الخيار (أ): Gemini Flash المباشر
              </span>
              <input
                type="radio"
                checked={settings.pipeline === 'optionA'}
                onChange={() => updateSettings({ pipeline: 'optionA' })}
                className="accent-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              إرسال مقطع الصوت (3.5 ثوانٍ) مباشرة إلى نموذج <strong>Gemini Flash</strong> عبر استدعاء API واحد يقوم بتحويل الصوت وترجمته للعربية فوراً دون خطوات وسيطة.
            </p>
          </div>

          <div
            onClick={() => updateSettings({ pipeline: 'optionB' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.pipeline === 'optionB'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                الخيار (ب): المسار الهجين فائق السرعة
              </span>
              <input
                type="radio"
                checked={settings.pipeline === 'optionB'}
                onChange={() => updateSettings({ pipeline: 'optionB' })}
                className="accent-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الخطوة 1: تحويل الصوت إلى نص عبر <strong>Groq Whisper v3</strong> بسرعة خارقة (~200ms)، ثم الخطوة 2: ترجمة النص للعربية عبر <strong>Gemini Flash</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* Keys Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <span>مفاتيح API الخاصة بالمستخدم (User Keys)</span>
        </h2>

        {/* Gemini Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Google Gemini API Key:</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>احصل على مفتاح مجاني</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={settings.userGeminiKey}
              onChange={(e) => updateSettings({ userGeminiKey: e.target.value })}
              placeholder={serverStatus?.hasServerGeminiKey ? 'مفتاح الخادم مهيأ مسبقاً (أو أدخل مفتاحك الخاص)' : 'AIzaSy...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            يُستخدم في الخيار (أ) لتحويل الصوت والترجمة، وفي الخيار (ب) لترجمة النص.
          </p>
        </div>

        {/* Groq Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Groq API Key (مطلوب للخيار ب):</span>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              <span>احصل على مفتاح Groq مجاني</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative">
            <input
              type={showGroqKey ? 'text' : 'password'}
              value={settings.groqKey}
              onChange={(e) => updateSettings({ groqKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowGroqKey(!showGroqKey)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            مطلوب فقط إذا اخترت مسار Groq Whisper-large-v3 فائق السرعة.
          </p>
        </div>

        {/* Test Latency & Ping Button */}
        <div className="pt-2">
          <button
            onClick={handleTestApi}
            disabled={testResult.status === 'testing'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {testResult.status === 'testing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>جاري اختبار سرعة الاستجابة (Ping)...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>اختبار سرعة استجابة الترجمة (Test Latency)</span>
              </>
            )}
          </button>

          {testResult.status === 'success' && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  الاتصال بالـ API ناجح وسريع!
                </span>
                <span className="font-mono">⚡ زمن الاستجابة: {testResult.latencyMs}ms</span>
              </div>
              <div className="text-slate-300 pt-1 border-t border-emerald-500/10 font-['Cairo']">
                ترجمة تجريبية: "{testResult.translatedSample}"
              </div>
            </div>
          )}

          {testResult.status === 'error' && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              خطأ في الاختبار: {testResult.error}
            </div>
          )}
        </div>

      </div>

      {/* Subtitle Appearance Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>تخصيص مظهر الترجمة على شاشة الفيديو</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300 font-medium">
              <span>حجم الخط:</span>
              <span className="font-mono text-emerald-400">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="38"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300 font-medium">
              <span>شفافية خلفية الترجمة:</span>
              <span className="font-mono text-emerald-400">{Math.round(settings.bgOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={settings.bgOpacity}
              onChange={(e) => updateSettings({ bgOpacity: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium block">نوع الخط العربي:</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none"
            >
              <option value="Cairo">Cairo (خط عصري واضح للفيديو)</option>
              <option value="Amiri">Amiri (خط كلاسيكي أنيق)</option>
              <option value="Inter">Inter / System Sans</option>
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="checkbox"
                checked={settings.showOriginal}
                onChange={(e) => updateSettings({ showOriginal: e.target.checked })}
                className="accent-emerald-500 rounded"
              />
              <span>عرض النص الإنجليزي الأصلي أعلى الترجمة</span>
            </label>
          </div>

        </div>
      </div>

    </div>
  );
};
