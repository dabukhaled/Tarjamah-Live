import React, { useState } from 'react';
import { 
  Play, 
  Code2, 
  BookOpen, 
  Settings, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Flame,
  Globe2
} from 'lucide-react';
import { downloadExtensionZip } from '../utils/zipGenerator';
import { AppSettings, ServerStatus } from '../types';

interface HeaderProps {
  activeTab: 'simulator' | 'code' | 'guide' | 'settings';
  setActiveTab: (tab: 'simulator' | 'code' | 'guide' | 'settings') => void;
  settings: AppSettings;
  serverStatus: ServerStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  serverStatus,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      await downloadExtensionZip((msg) => setDownloadProgress(msg));
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress('');
      }, 1500);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloading(false);
      setDownloadProgress('Error generating zip');
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white font-extrabold text-xl">
              <span className="font-['Cairo']">ت</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">Tarjamah Live</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                ترجمة فورية بالذكاء الاصطناعي لفيديوهات المتصفح (Chrome & Brave)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>المحاكي المباشر</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>أكواد الإضافة (V3)</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>دليل التثبيت</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات والمفاتيح</span>
            </button>
          </nav>

          {/* Actions & Download */}
          <div className="flex items-center gap-3">
            {/* Active Pipeline Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              {settings.pipeline === 'optionA' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">مسار A: Gemini المباشر</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-slate-300">مسار B: Groq Whisper + Gemini</span>
                </>
              )}
            </div>

            {/* Download Extension ZIP Button */}
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="تنزيل حزمة الإضافة الكاملة كملف ZIP جاهز للتحميل في كروم أو براف"
            >
              <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? (downloadProgress || 'جاري التجهيز...') : 'تحميل الإضافة (.ZIP)'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
