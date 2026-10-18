import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Simulator } from './components/Simulator';
import { ExtensionStudio } from './components/ExtensionStudio';
import { GuideView } from './components/GuideView';
import { SettingsView } from './components/SettingsView';
import { AppSettings, ServerStatus } from './types';
import { fetchServerStatus } from './services/apiClient';

const DEFAULT_SETTINGS: AppSettings = {
  pipeline: 'optionA',
  userGeminiKey: '',
  groqKey: '',
  fontSize: 24,
  fontFamily: 'Cairo',
  bgOpacity: 0.88,
  showOriginal: false,
  textColor: '#ffffff',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide' | 'settings'>('simulator');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tarjamah_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    fetchServerStatus().then(setServerStatus);
  }, []);

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('tarjamah_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        serverStatus={serverStatus}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'simulator' && (
          <Simulator
            settings={settings}
            updateSettings={updateSettings}
            openSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'code' && <ExtensionStudio />}

        {activeTab === 'guide' && <GuideView />}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            updateSettings={updateSettings}
            serverStatus={serverStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">Tarjamah Live</span>
            <span>• إكستنشن ترجمة فورية لفيديوهات الويب (Manifest V3)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Google Gemini Flash & Groq Whisper</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('guide')}
              className="hover:text-emerald-400 transition"
            >
              دليل التثبيت
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-emerald-400 transition"
            >
              أكواد الإضافة
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
