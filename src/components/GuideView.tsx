import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  FolderOpen, 
  Sliders, 
  Key, 
  Tv, 
  AlertTriangle, 
  ExternalLink,
  ShieldAlert,
  Zap,
  Flame,
  ArrowRight
} from 'lucide-react';
import { downloadExtensionZip } from '../utils/zipGenerator';

export const GuideView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Hero Guide Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4" />
          دليل التثبيت والتشغيل الميداني (Installation & Quickstart Guide)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          كيفية تثبيت الإضافة وتشغيلها في متصفح Chrome أو Brave خلال دقيقة واحدة
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
          إضافة <strong className="text-emerald-400 font-semibold">Tarjamah Live</strong> مبنية بالكامل وفق معيار Manifest V3. لا تحتاج لأي خادم وسيط على جهازك—كل ما تحتاجه هو تنزيل المجلد، وتحميله في المتصفح عبر وضع المطور (Developer Mode).
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => downloadExtensionZip()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل حزمة الإضافة (.ZIP) الآن</span>
          </button>
        </div>
      </div>

      {/* Step by Step Visual Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-base mb-4">
            01
          </div>
          <h2 className="text-lg font-bold text-white mb-2">فك ضغط الحزمة (Unpack ZIP)</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            اضغط على زر <strong className="text-slate-200">تحميل الإضافة (.ZIP)</strong>، ثم فك الضغط عن الملف في أي مجلد تريده على جهازك (مثلاً: <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs">tarjamah-live-extension</code>).
          </p>
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold">محتويات المجلد المفكوك:</div>
            <div>📄 manifest.json & background.js</div>
            <div>📄 offscreen.html & offscreen.js</div>
            <div>📄 content.js & styles.css & apiServices.js</div>
            <div>📄 popup.html & popup.js & icons/</div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-base mb-4">
            02
          </div>
          <h2 className="text-lg font-bold text-white mb-2">فتح صفحة الإضافات في المتصفح</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-3">
            افتح تبويباً جديداً في متصفحك واكتب الرابط التالي حسب المتصفح الذي تستخدمه:
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Google Chrome:</span>
              <span className="text-emerald-400 font-bold select-all">chrome://extensions/</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Brave Browser:</span>
              <span className="text-emerald-400 font-bold select-all">brave://extensions/</span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-base mb-4">
            03
          </div>
          <h2 className="text-lg font-bold text-white mb-2">تفعيل وضع المطور (Developer Mode)</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            في الزاوية العلوية اليمنى (أو اليسرى حسب لغة المتصفح)، قم بتفعيل المفتاح المسمى:
            <br />
            <strong className="text-emerald-400">وضع مطوّر البرامج (Developer mode)</strong>.
          </p>
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-400">
            بمجرد تفعيله، ستظهر لك أزرار جديدة في الشريط العلوي: 
            <span className="text-slate-200 font-semibold mx-1">"تحميل إضافة لم يتم حزمها"</span>
            أو 
            <span className="text-slate-200 font-semibold mx-1">"Load unpacked"</span>.
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-base mb-4">
            04
          </div>
          <h2 className="text-lg font-bold text-white mb-2">تحميل المجلد غير المحزوم (Load Unpacked)</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            اضغط على زر <strong className="text-slate-200 font-semibold">Load unpacked</strong>، ثم اختر المجلد المفكوك <code className="text-emerald-400 font-mono text-xs">tarjamah-live-extension</code> واضغط على <strong className="text-slate-200">Select Folder</strong>.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>ستظهر الإضافة فوراً في شريط أدوات متصفحك!</span>
          </div>
        </div>

      </div>

      {/* Free API Keys Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">الحصول على مفاتيح API المجانية (Free API Keys)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Gemini Key */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Google Gemini API (مجاني تماماً)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                موصى به
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              يدعم نموذج <strong>Gemini 1.5 Flash</strong> أو <strong>Gemini 3.8 Flash</strong> التقاط الصوت وترجمته مباشرة إلى العربية في خطوة واحدة، بمعدل 15 طلب مجاني في الدقيقة (RPM)، وهو أكثر من كافٍ لدورات الصوت (3.5 ثانية).
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
            >
              <span>إنشاء مفتاح Gemini في Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Groq Key */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Groq API (Whisper-large-v3)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                فائق السرعة
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              يوفر Groq استجابة خارقة السرعة (خوادم LPU) لتحويل الصوت إلى نص إنجليزي بدقة تفوق 98% في أقل من 250 ميلي ثانية، ثم يُرسل النص فوراً للترجمة العربية.
            </p>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold"
            >
              <span>إنشاء مفتاح Groq مجاني في console.groq.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>

      {/* Troubleshooting & Brave Specifics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>ملاحظات هامة لمتصفح Brave و حلول الأخطاء الشائعة</span>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <strong className="text-slate-200 block mb-1">1. دروع متصفح Brave (Brave Shields & Autoplay):</strong>
            إذا كان Brave يمنع التقاط الصوت في بعض المواقع، تأكد من الضغط على أيقونة الدرع في شريط العنوان وتفعيل إذن تشغيل الصوت التلقائي (Autoplay Permission) أو تعطيل الحظر الصارم للوسائط على الموقع المستهدف.
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <strong className="text-slate-200 block mb-1">2. هل ينقطع صوت الفيديو عند بدء الترجمة؟</strong>
            تمت معالجة هذه النقطة بدقة هندسية في الكود! حيث يقوم ملف <code className="text-emerald-400 font-mono text-xs">offscreen.js</code> بتوصيل تيار الصوت مباشرة بمخرج السماعات <code className="text-emerald-400 font-mono text-xs">audioContext.destination</code>، مما يضمن استمرارك في سماع صوت الفيديو طبيعياً دون أي كتم.
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <strong className="text-slate-200 block mb-1">3. الفيديوهات في وضع ملء الشاشة (Fullscreen):</strong>
            يقوم ملف <code className="text-emerald-400 font-mono text-xs">content.js</code> بمراقبة حدث <code className="text-emerald-400 font-mono text-xs">fullscreenchange</code> ونقل حاوية الترجمة فوراً لتطفو فوق عنصر الفيديو المكبر، مع أعلى درجة ظهور <code className="text-emerald-400 font-mono text-xs">z-index: 2147483647</code>.
          </div>
        </div>
      </div>

    </div>
  );
};
