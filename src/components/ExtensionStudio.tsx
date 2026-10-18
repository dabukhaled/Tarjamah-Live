import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Folder, 
  FileJson, 
  FileText, 
  Info, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { EXTENSION_FILES, ExtensionFile } from '../extension-files/extensionFiles';
import { downloadExtensionZip } from '../utils/zipGenerator';

export const ExtensionStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(EXTENSION_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await downloadExtensionZip();
      setDownloadingZip(false);
    } catch (err) {
      console.error(err);
      setDownloadingZip(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.json')) return <FileJson className="w-4 h-4 text-amber-400" />;
    if (fileName.endsWith('.js')) return <FileCode className="w-4 h-4 text-emerald-400" />;
    if (fileName.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
    if (fileName.endsWith('.css')) return <FileCode className="w-4 h-4 text-sky-400" />;
    return <FileText className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              V3
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              أكواد إضافة المتصفح الجاهزة للإنتاج (Production-Ready Extension Files)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            جميع الملفات مهيأة وفق معيار Manifest V3 ومكتملة تماماً، بما في ذلك مستند Offscreen لمعالجة الصوت بدون تقطيع ودعم التبديل بين Gemini و Groq.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={downloadingZip}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingZip ? 'جاري تحضير الحزمة...' : 'تنزيل جميع الملفات (.ZIP)'}</span>
        </button>
      </div>

      {/* Main Studio View: File Tree + Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left File Navigation (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-400" />
              <span>شجرة ملفات الإضافة (File Tree)</span>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">{EXTENSION_FILES.length} files</span>
          </div>

          <div className="space-y-1">
            {EXTENSION_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all text-left ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getFileIcon(file.name)}
                    <span className="truncate">{file.path}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-emerald-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Quick Architecture Insight Box */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>كيف يعمل التقاط صوت التبويب في V3؟</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                في Chrome V3، لا تملك Service Workers وصولاً لـ Web Audio. لذلك تستخدم الإضافة <code className="text-emerald-400 font-mono text-[10px]">chrome.offscreen</code> لاستقبال <code className="text-emerald-400 font-mono text-[10px]">streamId</code> وتقطيع الصوت إلى شرائح 3.5 ثانية مع إبقاء الصوت مسموعاً عبر السماعات.
              </p>
            </div>
          </div>
        </div>

        {/* Right Code Display (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* File Header Bar */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <span>{selectedFile.path}</span>
                  <span className="text-[10px] uppercase font-sans font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {selectedFile.language}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 max-w-lg">
                  {selectedFile.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="نسخ الكود إلى الحافظة"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>نسخ الكود</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="تنزيل هذا الملف منفرداً"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>تنزيل الملف</span>
              </button>
            </div>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[620px] overflow-y-auto leading-relaxed text-slate-300">
            <pre className="flex">
              {/* Line Numbers Column */}
              <span className="select-none text-slate-600 text-right pr-4 border-r border-slate-800/80 mr-4 font-mono text-[11px]">
                {selectedFile.content.split('\n').map((_, i) => (
                  <span key={i} className="block leading-relaxed">
                    {i + 1}
                  </span>
                ))}
              </span>

              {/* Code Content */}
              <code className="flex-1 font-mono leading-relaxed whitespace-pre block">
                {selectedFile.content}
              </code>
            </pre>
          </div>

          {/* Code Footer */}
          <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{selectedFile.content.split('\n').length} lines</span>
            <span>UTF-8 • Ready to Load Unpacked in Chrome/Brave</span>
          </div>

        </div>

      </div>

    </div>
  );
};
