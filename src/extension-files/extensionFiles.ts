/**
 * Tarjamah Live - Real-Time Arabic Video Translator Chrome/Brave Extension
 * Manifest V3 Complete Source Files Library
 */

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'manifest.json',
    language: 'json',
    description: 'Manifest V3 configuration with tabCapture, offscreen audio processing, and scripting permissions',
    content: `{
  "manifest_version": 3,
  "name": "Tarjamah Live - Real-Time Arabic Video Translator",
  "version": "1.0.0",
  "description": "Real-time tab audio capture, ultra-fast speech recognition (Groq Whisper / Gemini), and instant context-aware Arabic subtitle overlay for web videos.",
  "permissions": [
    "activeTab",
    "tabCapture",
    "scripting",
    "storage",
    "offscreen"
  ],
  "host_permissions": [
    "https://generativelanguage.googleapis.com/*",
    "https://api.groq.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Tarjamah Live - Arabic Video Translator"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`
  },
  {
    name: 'background.js',
    path: 'background.js',
    language: 'javascript',
    description: 'Service worker: orchestrates tabCapture, offscreen document lifecycle, API pipeline routing, and subtitle dispatch',
    content: `/**
 * Tarjamah Live - background.js (Manifest V3 Service Worker)
 * Orchestrates tab audio capture via chrome.offscreen, audio queueing,
 * Dual Processing Pipeline (Option A vs Option B), and content script messaging.
 */

import { transcribeAndTranslateGemini, transcribeGroqWhisper, translateArabicGemini } from './apiServices.js';

let currentCapturingTabId = null;
let isCapturing = false;
let isProcessingChunk = false;
const chunkQueue = [];

// Listen for messages from popup.js, offscreen.js, or content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAPTURE') {
    startCapture(message.tabId).then((res) => sendResponse(res));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'STOP_CAPTURE') {
    stopCapture().then((res) => sendResponse(res));
    return true;
  }

  if (message.action === 'GET_STATUS') {
    sendResponse({ isCapturing, currentCapturingTabId });
    return false;
  }

  if (message.action === 'AUDIO_CHUNK_READY') {
    // Received 3-5s audio chunk from offscreen document
    handleAudioChunk(message.audioBase64, message.mimeType);
    sendResponse({ received: true });
    return false;
  }
});

/**
 * Initiates tab audio capture using Manifest V3 offscreen document
 */
async function startCapture(targetTabId) {
  try {
    const tabId = targetTabId || (await getActiveTabId());
    if (!tabId) {
      throw new Error('No active browser tab found to capture audio.');
    }

    currentCapturingTabId = tabId;

    // Check if offscreen document is already created
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Capturing and slicing active tab audio into real-time 3-second chunks for subtitle translation',
      });
    }

    // Acquire streamId from active tab via chrome.tabCapture
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    if (!streamId) {
      throw new Error('Could not acquire audio stream ID for active tab.');
    }

    // Send streamId to offscreen document to start Web Audio recording
    await chrome.runtime.sendMessage({
      action: 'START_OFFSCREEN_RECORDING',
      streamId: streamId,
    });

    isCapturing = true;

    // Notify content script that translation session is live
    chrome.tabs.sendMessage(tabId, {
      action: 'CAPTURE_STATUS_CHANGED',
      isCapturing: true,
    }).catch(() => {});

    return { success: true, tabId };
  } catch (error) {
    console.error('[Tarjamah Live] Start Capture Error:', error);
    isCapturing = false;
    currentCapturingTabId = null;
    return { success: false, error: error.message };
  }
}

/**
 * Stops audio capture and closes the offscreen document
 */
async function stopCapture() {
  try {
    if (isCapturing) {
      await chrome.runtime.sendMessage({ action: 'STOP_OFFSCREEN_RECORDING' }).catch(() => {});
    }

    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    if (existingContexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }

    if (currentCapturingTabId) {
      chrome.tabs.sendMessage(currentCapturingTabId, {
        action: 'CAPTURE_STATUS_CHANGED',
        isCapturing: false,
      }).catch(() => {});
    }

    isCapturing = false;
    currentCapturingTabId = null;
    chunkQueue.length = 0;

    return { success: true };
  } catch (error) {
    console.error('[Tarjamah Live] Stop Capture Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handles incoming audio chunks and processes them through selected pipeline
 */
async function handleAudioChunk(audioBase64, mimeType) {
  if (!isCapturing || !audioBase64) return;

  // Add chunk to processing queue
  chunkQueue.push({ audioBase64, mimeType, timestamp: Date.now() });
  processNextQueueItem();
}

/**
 * Sequential queue worker to prevent out-of-order subtitles
 */
async function processNextQueueItem() {
  if (isProcessingChunk || chunkQueue.length === 0) return;

  isProcessingChunk = true;
  const chunkItem = chunkQueue.shift();

  try {
    // Read user configuration from chrome.storage.local
    const settings = await chrome.storage.local.get([
      'pipelineOption',
      'geminiApiKey',
      'groqApiKey',
      'geminiModel',
    ]);

    const pipeline = settings.pipelineOption || 'optionA';
    const geminiKey = (settings.geminiApiKey || '').trim();
    const groqKey = (settings.groqApiKey || '').trim();
    const model = settings.geminiModel || 'gemini-1.5-flash';

    let arabicText = '';
    let englishText = '';
    const startTime = Date.now();

    if (pipeline === 'optionA') {
      // Option A: Direct Multimodal Gemini Flash (Audio -> Arabic STT+Translation in 1 Call)
      if (!geminiKey) {
        dispatchErrorSubtitle('Please enter your Gemini API Key in the extension popup.');
        return;
      }

      arabicText = await transcribeAndTranslateGemini(chunkItem.audioBase64, geminiKey, chunkItem.mimeType, model);
    } else {
      // Option B: Ultra-Fast Hybrid Pipeline (Groq Whisper-large-v3 -> Gemini Arabic Translation)
      if (!groqKey) {
        dispatchErrorSubtitle('Please enter your Groq API Key for Option B in the popup.');
        return;
      }
      if (!geminiKey) {
        dispatchErrorSubtitle('Please enter your Gemini API Key for Arabic translation.');
        return;
      }

      // Step 1: Transcribe via Groq Whisper v3
      englishText = await transcribeGroqWhisper(chunkItem.audioBase64, groqKey);

      // Step 2: Translate transcription to Arabic via Gemini Flash
      if (englishText && englishText.trim()) {
        arabicText = await translateArabicGemini(englishText, geminiKey, model);
      }
    }

    const latencyMs = Date.now() - startTime;

    if (arabicText && arabicText.trim()) {
      dispatchSubtitleToTab({
        arabicText: arabicText.trim(),
        originalText: englishText,
        latencyMs,
        pipeline,
      });
    }
  } catch (err) {
    console.error('[Tarjamah Live] Pipeline Processing Error:', err);
    dispatchErrorSubtitle(\`Translation error: \${err.message || 'API request failed'}\`);
  } finally {
    isProcessingChunk = false;
    // Process next audio chunk if available
    if (chunkQueue.length > 0) {
      setTimeout(processNextQueueItem, 50);
    }
  }
}

/**
 * Sends subtitle to content script of the active tab
 */
function dispatchSubtitleToTab(payload) {
  if (!currentCapturingTabId) return;

  chrome.tabs.sendMessage(currentCapturingTabId, {
    action: 'DISPLAY_SUBTITLE',
    ...payload,
  }).catch((err) => {
    console.warn('[Tarjamah Live] Could not send subtitle to tab:', err);
  });
}

function dispatchErrorSubtitle(errorMessage) {
  if (!currentCapturingTabId) return;

  chrome.tabs.sendMessage(currentCapturingTabId, {
    action: 'DISPLAY_ERROR',
    error: errorMessage,
  }).catch(() => {});
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id || null;
}
`
  },
  {
    name: 'offscreen.html',
    path: 'offscreen.html',
    language: 'html',
    description: 'Offscreen HTML document providing DOM & Web Audio environment required by Manifest V3',
    content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tarjamah Live - Audio Capture Offscreen Document</title>
  </head>
  <body>
    <!-- Offscreen document required by Manifest V3 for tab audio capture -->
    <script src="offscreen.js"></script>
  </body>
</html>`
  },
  {
    name: 'offscreen.js',
    path: 'offscreen.js',
    language: 'javascript',
    description: 'Offscreen script: consumes tabCapture streamId, preserves speaker output, and slices 3-5s audio chunks',
    content: `/**
 * Tarjamah Live - offscreen.js
 * Runs inside the Chrome offscreen document context to access Web Audio API & MediaRecorder.
 * Key responsibilities:
 * 1. Capture audio stream using chromeMediaSourceId
 * 2. Route audio to AudioContext destination (so the user STILL hears tab sound!)
 * 3. Slice audio into continuous 3.5s chunks and transmit to background.js
 */

let mediaStream = null;
let mediaRecorder = null;
let audioContext = null;
const CHUNK_INTERVAL_MS = 3500; // 3.5 seconds duration for ultra-low latency

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_OFFSCREEN_RECORDING') {
    startRecording(message.streamId).then(() => sendResponse({ status: 'started' }));
    return true;
  }

  if (message.action === 'STOP_OFFSCREEN_RECORDING') {
    stopRecording();
    sendResponse({ status: 'stopped' });
    return false;
  }
});

async function startRecording(streamId) {
  try {
    stopRecording(); // Reset existing recording if any

    // Request stream from active tab audio using tab media source
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    // CRITICAL: TabCapture mutes the tab by default unless we loop it to audio destination!
    // Connect stream to AudioContext.destination so the user hears the video audio normally.
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(audioContext.destination);

    // Initialize MediaRecorder for chunking
    const mimeType = getSupportedMimeType();
    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      audioBitsPerSecond: 64000, // 64kbps is optimal for fast voice transmission
    });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 2000) { // Ignore tiny empty frames
        const base64 = await blobToBase64(event.data);
        chrome.runtime.sendMessage({
          action: 'AUDIO_CHUNK_READY',
          audioBase64: base64,
          mimeType: mimeType,
        }).catch((err) => {
          console.warn('[Offscreen] Failed to transmit audio chunk:', err);
        });
      }
    };

    // Start recorder slicing every CHUNK_INTERVAL_MS (3.5s)
    mediaRecorder.start(CHUNK_INTERVAL_MS);
    console.log('[Tarjamah Live Offscreen] Audio recording started with interval:', CHUNK_INTERVAL_MS);
  } catch (error) {
    console.error('[Tarjamah Live Offscreen] Error initializing recording:', error);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      // Strip data URL prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
`
  },
  {
    name: 'apiServices.js',
    path: 'apiServices.js',
    language: 'javascript',
    description: 'Unified API module for Gemini Multimodal Audio-to-Arabic, Groq Whisper STT, and Gemini text translation',
    content: `/**
 * Tarjamah Live - apiServices.js
 * Modular API client for Google Gemini 1.5/Flash and Groq Whisper-large-v3
 */

/**
 * Option A: Sends audio chunk directly to Google Gemini Flash for combined Speech-to-Text & Arabic translation
 */
export async function transcribeAndTranslateGemini(audioBase64, apiKey, mimeType = 'audio/webm', model = 'gemini-1.5-flash') {
  if (!audioBase64 || !apiKey) {
    throw new Error('Audio data and Gemini API Key are required.');
  }

  // Model name mapping: user may provide 1.5-flash, gemini-2.0-flash, or gemini-2.5-flash
  const activeModel = model.includes('gemini') ? model : 'gemini-1.5-flash';
  const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${activeModel}:generateContent?key=\${apiKey.trim()}\`;

  const systemInstruction = 
    \`You are an expert real-time video subtitle translator for Arabic viewers. \` +
    \`Listen to this short audio segment (3-5 seconds). Transcribe what is spoken and translate it directly into natural, context-aware Modern Standard Arabic (فصحى معاصرة). \` +
    \`STRICT RULES: \` +
    \`1. Return ONLY the translated Arabic subtitle text. \` +
    \`2. Absolutely NO conversational filler, NO introductory phrases, NO notes, NO English words, NO markdown formatting, NO quotation marks. \` +
    \`3. If there is no clear speech, or only silence/background music/ambient noise, output an empty string ("").\`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          {
            text: 'Translate the speech in this audio clip into Arabic subtitles:',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 250,
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Gemini API Error (\${response.status}): \${errorText}\`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return cleanArabicOutput(rawText);
}

/**
 * Option B - Step 1: Transcribe audio chunk using Groq Whisper-large-v3
 */
export async function transcribeGroqWhisper(audioBase64, groqApiKey) {
  if (!audioBase64 || !groqApiKey) {
    throw new Error('Audio data and Groq API Key are required for Whisper transcription.');
  }

  const url = 'https://api.groq.com/openai/v1/audio/transcriptions';

  // Convert base64 to binary Blob
  const byteCharacters = atob(audioBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const audioBlob = new Blob([byteArray], { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio_chunk.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('temperature', '0.0');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${groqApiKey.trim()}\`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Groq Whisper Error (\${response.status}): \${errorText}\`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

/**
 * Option B - Step 2: Translates transcribed English text to Arabic using Gemini Flash
 */
export async function translateArabicGemini(englishText, apiKey, model = 'gemini-1.5-flash') {
  if (!englishText || !englishText.trim()) return '';
  if (!apiKey) throw new Error('Gemini API Key is required for translation.');

  const activeModel = model.includes('gemini') ? model : 'gemini-1.5-flash';
  const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${activeModel}:generateContent?key=\${apiKey.trim()}\`;

  const systemInstruction = 
    \`You are a professional video subtitle translator. \` +
    \`Translate the provided transcribed speech into concise, natural, context-aware Modern Standard Arabic (فصحى سلسة). \` +
    \`STRICT RULES: \` +
    \`1. Return ONLY the translated Arabic text. \` +
    \`2. Do NOT add notes, explanations, phonetic guides, or quotation marks. \` +
    \`3. Preserve colloquial idioms by translating their intended meaning naturally in Arabic.\`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: englishText.trim() }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 250,
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Gemini Translation Error (\${response.status}): \${errorText}\`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return cleanArabicOutput(rawText);
}

/**
 * Strips conversational artifacts and quotation marks
 */
function cleanArabicOutput(text) {
  if (!text) return '';
  return text
    .replace(/^["'«“]/, '')
    .replace(/["'»”]$/, '')
    .replace(/^(ترجمة|الترجمة|الترجمة بالعربية):\\s*/i, '')
    .trim();
}
`
  },
  {
    name: 'content.js',
    path: 'content.js',
    language: 'javascript',
    description: 'Content script: detects HTML5 videos, injects responsive RTL subtitle overlay, handles fullscreen & dragging',
    content: `/**
 * Tarjamah Live - content.js
 * Injects and manages the floating, glassmorphic, RTL Arabic subtitle overlay
 * over HTML5 video players (YouTube, Vimeo, Netflix, standard web videos).
 */

(function () {
  if (window.__TARJAMAH_LIVE_INJECTED__) return;
  window.__TARJAMAH_LIVE_INJECTED__ = true;

  let overlayElement = null;
  let textElement = null;
  let originalTextElement = null;
  let statusBadge = null;
  let hideTimeout = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // Current display preferences
  let userStyles = {
    fontSize: 24,
    fontFamily: 'Cairo, sans-serif',
    bgOpacity: 0.85,
    showOriginal: false,
    textColor: '#ffffff',
  };

  // Load preferences from storage
  chrome.storage.local.get(['subtitleStyles'], (res) => {
    if (res.subtitleStyles) {
      userStyles = { ...userStyles, ...res.subtitleStyles };
      applyOverlayStyles();
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.subtitleStyles) {
      userStyles = { ...userStyles, ...changes.subtitleStyles.newValue };
      applyOverlayStyles();
    }
  });

  // Listen for subtitle display commands from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'DISPLAY_SUBTITLE') {
      showSubtitle(message.arabicText, message.originalText, message.latencyMs);
      sendResponse({ received: true });
    } else if (message.action === 'DISPLAY_ERROR') {
      showTemporaryError(message.error);
      sendResponse({ received: true });
    } else if (message.action === 'CAPTURE_STATUS_CHANGED') {
      updateStatusBadge(message.isCapturing);
      sendResponse({ received: true });
    }
  });

  /**
   * Creates the floating subtitle overlay DOM structure
   */
  function ensureOverlayExists() {
    if (document.getElementById('tarjamah-live-container')) {
      return document.getElementById('tarjamah-live-container');
    }

    const container = document.createElement('div');
    container.id = 'tarjamah-live-container';
    container.innerHTML = \`
      <div id="tarjamah-live-box" dir="rtl" class="tarjamah-box">
        <div id="tarjamah-live-header" class="tarjamah-drag-header">
          <span class="tarjamah-brand">
            <span class="tarjamah-dot"></span>
            ترجمة فورية
          </span>
          <span id="tarjamah-status-badge" class="tarjamah-badge">متصل</span>
        </div>
        <div id="tarjamah-live-original" class="tarjamah-original-text"></div>
        <div id="tarjamah-live-arabic" class="tarjamah-arabic-text"></div>
      </div>
    \`;

    document.body.appendChild(container);

    overlayElement = document.getElementById('tarjamah-live-box');
    textElement = document.getElementById('tarjamah-live-arabic');
    originalTextElement = document.getElementById('tarjamah-live-original');
    statusBadge = document.getElementById('tarjamah-status-badge');

    setupDragHandling(container, document.getElementById('tarjamah-live-header'));
    applyOverlayStyles();

    // Handle Fullscreen Video Support
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return container;
  }

  /**
   * Displays new Arabic subtitle with smooth transition
   */
  function showSubtitle(arabicText, originalText, latencyMs) {
    if (!arabicText || !arabicText.trim()) return;

    ensureOverlayExists();

    // Clear fadeout timeout
    if (hideTimeout) clearTimeout(hideTimeout);

    // Update Arabic text
    textElement.textContent = arabicText.trim();
    textElement.style.display = 'block';

    // Update Original text if enabled
    if (userStyles.showOriginal && originalText) {
      originalTextElement.textContent = originalText.trim();
      originalTextElement.style.display = 'block';
    } else {
      originalTextElement.style.display = 'none';
    }

    // Show latency badge briefly
    if (latencyMs && statusBadge) {
      statusBadge.textContent = \`\${latencyMs}ms\`;
      statusBadge.style.color = '#34d399';
    }

    // Fade in container
    overlayElement.classList.remove('tarjamah-hidden');
    overlayElement.classList.add('tarjamah-visible');

    // Auto fade out after 6 seconds of speech pause
    hideTimeout = setTimeout(() => {
      overlayElement.classList.remove('tarjamah-visible');
      overlayElement.classList.add('tarjamah-hidden');
    }, 6000);
  }

  function showTemporaryError(errorMsg) {
    ensureOverlayExists();
    textElement.textContent = errorMsg;
    textElement.style.color = '#f87171';
    overlayElement.classList.remove('tarjamah-hidden');
    overlayElement.classList.add('tarjamah-visible');

    setTimeout(() => {
      textElement.style.color = userStyles.textColor || '#ffffff';
    }, 5000);
  }

  function updateStatusBadge(isCapturing) {
    if (!statusBadge) return;
    if (isCapturing) {
      statusBadge.textContent = 'نشط';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#34d399';
    } else {
      statusBadge.textContent = 'متوقف';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#f87171';
    }
  }

  function applyOverlayStyles() {
    if (!overlayElement || !textElement) return;

    textElement.style.fontSize = \`\${userStyles.fontSize || 24}px\`;
    textElement.style.fontFamily = userStyles.fontFamily || 'Cairo, sans-serif';
    overlayElement.style.backgroundColor = \`rgba(15, 23, 42, \${userStyles.bgOpacity || 0.85})\`;
    textElement.style.color = userStyles.textColor || '#ffffff';
  }

  /**
   * Draggable header setup
   */
  function setupDragHandling(container, header) {
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = container.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      container.style.left = \`\${Math.max(10, Math.min(window.innerWidth - 300, newX))}px\`;
      container.style.top = \`\${Math.max(10, Math.min(window.innerHeight - 100, newY))}px\`;
      container.style.bottom = 'auto';
      container.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });
  }

  /**
   * When video enters fullscreen, re-parent the container into the fullscreen element
   */
  function handleFullscreenChange() {
    const fsElement = document.fullscreenElement;
    const container = document.getElementById('tarjamah-live-container');
    if (!container) return;

    if (fsElement) {
      fsElement.appendChild(container);
      container.style.position = 'absolute';
      container.style.zIndex = '2147483647';
    } else {
      document.body.appendChild(container);
      container.style.position = 'fixed';
    }
  }
})();
`
  },
  {
    name: 'styles.css',
    path: 'styles.css',
    language: 'css',
    description: 'Glassmorphic subtitle overlay stylesheet with responsive RTL Arabic typography',
    content: `/**
 * Tarjamah Live - styles.css
 * Floating Glassmorphic RTL Subtitle Overlay Styles
 */

#tarjamah-live-container {
  position: fixed;
  bottom: 45px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  max-width: 85vw;
  width: auto;
  min-width: 320px;
  pointer-events: none;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease;
  user-select: none;
}

.tarjamah-box {
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(16, 185, 129, 0.15);
  padding: 10px 18px 14px 18px;
  color: #ffffff;
  direction: rtl;
  text-align: center;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.tarjamah-hidden {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  pointer-events: none;
}

.tarjamah-visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.tarjamah-drag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: #94a3b8;
  cursor: grab;
}

.tarjamah-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.tarjamah-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: tarjamah-pulse 2s infinite ease-in-out;
}

@keyframes tarjamah-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.tarjamah-badge {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  font-family: monospace;
}

.tarjamah-original-text {
  direction: ltr;
  text-align: center;
  font-size: 13px;
  color: #cbd5e1;
  margin-bottom: 4px;
  opacity: 0.75;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tarjamah-arabic-text {
  font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif;
  font-size: 24px;
  line-height: 1.5;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 1px rgba(0, 0, 0, 0.9);
  letter-spacing: 0.2px;
  word-break: break-word;
}
`
  },
  {
    name: 'popup.html',
    path: 'popup.html',
    language: 'html',
    description: 'Extension popup control panel for pipeline switching, API key configuration, and subtitle personalization',
    content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tarjamah Live Controls</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg-main: #090d16;
        --bg-card: #131b2e;
        --border-color: rgba(255, 255, 255, 0.1);
        --accent-emerald: #10b981;
        --accent-glow: rgba(16, 185, 129, 0.3);
        --text-primary: #f8fafc;
        --text-secondary: #94a3b8;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 360px;
        background: var(--bg-main);
        color: var(--text-primary);
        font-family: 'Cairo', sans-serif;
        padding: 16px;
        font-size: 13px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 14px;
      }
      .logo-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 800;
      }
      .logo-icon {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        background: linear-gradient(135deg, #10b981, #059669);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: white;
        font-weight: bold;
      }
      .status-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.05);
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
      }
      .status-dot.active {
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }

      /* Toggle Button */
      .main-toggle-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 14px var(--accent-glow);
        transition: all 0.2s;
        margin-bottom: 16px;
      }
      .main-toggle-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      .main-toggle-btn.btn-stop {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
      }

      /* Pipeline Selectors */
      .section-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pipeline-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        transition: border-color 0.2s;
      }
      .pipeline-card:hover { border-color: rgba(16, 185, 129, 0.4); }
      .pipeline-card.selected {
        border-color: var(--accent-emerald);
        background: rgba(16, 185, 129, 0.08);
      }
      .pipeline-radio { margin-top: 3px; accent-color: var(--accent-emerald); }
      .pipeline-name { font-weight: 700; font-size: 12.5px; margin-bottom: 2px; }
      .pipeline-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }

      /* Key Inputs */
      .input-group {
        margin-top: 10px;
      }
      .input-label {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }
      .input-field {
        width: 100%;
        background: #0d1322;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 8px 10px;
        color: white;
        font-family: monospace;
        font-size: 12px;
        direction: ltr;
        outline: none;
      }
      .input-field:focus { border-color: var(--accent-emerald); }

      /* Styling controls */
      .sliders-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
      }
      .slider-item { flex: 1; }
      input[type="range"] {
        width: 100%;
        accent-color: var(--accent-emerald);
      }

      /* Save notification */
      .toast {
        margin-top: 12px;
        padding: 8px;
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-radius: 6px;
        text-align: center;
        font-size: 11.5px;
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="logo-title">
        <div class="logo-icon">ت</div>
        <span>ترجمة فورية (Live)</span>
      </div>
      <div class="status-pill">
        <div id="statusDot" class="status-dot"></div>
        <span id="statusLabel">متوقف</span>
      </div>
    </div>

    <!-- Main Live Toggle -->
    <button id="toggleBtn" class="main-toggle-btn">
      <span id="toggleBtnIcon">▶</span>
      <span id="toggleBtnText">بدء ترجمة صوت الفيديو</span>
    </button>

    <!-- Pipeline Selection -->
    <div class="section-title">مسار المعالجة المجاني (Pipeline):</div>
    
    <label class="pipeline-card" id="cardOptionA">
      <input type="radio" name="pipeline" value="optionA" class="pipeline-radio" id="radioOptionA" checked />
      <div>
        <div class="pipeline-name">⚡ الخيار (أ): Gemini Flash المباشر</div>
        <div class="pipeline-desc">إرسال مقاطع الصوت مباشرة إلى Gemini Flash لإنتاج الترجمة العربية الفورية في خطوة واحدة.</div>
      </div>
    </label>

    <label class="pipeline-card" id="cardOptionB">
      <input type="radio" name="pipeline" value="optionB" class="pipeline-radio" id="radioOptionB" />
      <div>
        <div class="pipeline-name">🚀 الخيار (ب): المسار الهجين فائق السرعة</div>
        <div class="pipeline-desc">Groq Whisper (تحويل الصوت لنص بدقة فائقة) ➔ ثم ترجمة سريعة وسلسة بالعربية عبر Gemini.</div>
      </div>
    </label>

    <!-- API Keys -->
    <div class="section-title" style="margin-top: 14px;">مفاتيح API المجانية:</div>

    <div class="input-group">
      <div class="input-label">
        <span>مفتاح Google Gemini API:</span>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #34d399; text-decoration: none;">احصل عليه مجاناً</a>
      </div>
      <input type="password" id="geminiKey" class="input-field" placeholder="AIzaSy..." />
    </div>

    <div class="input-group" id="groqGroup">
      <div class="input-label">
        <span>مفتاح Groq API (للخيار ب):</span>
        <a href="https://console.groq.com/keys" target="_blank" style="color: #34d399; text-decoration: none;">احصل عليه مجاناً</a>
      </div>
      <input type="password" id="groqKey" class="input-field" placeholder="gsk_..." />
    </div>

    <!-- Subtitle Customization -->
    <div class="section-title" style="margin-top: 14px;">تخصيص الترجمة على الشاشة:</div>
    <div class="sliders-row">
      <div class="slider-item">
        <div class="input-label"><span>حجم الخط:</span> <span id="fontSizeVal">24px</span></div>
        <input type="range" id="fontSizeSlider" min="16" max="38" value="24" />
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
      <input type="checkbox" id="showOriginalCheck" style="accent-color: var(--accent-emerald);" />
      <label for="showOriginalCheck" style="font-size: 11.5px; color: var(--text-secondary); cursor: pointer;">
        عرض النص الإنجليزي الأصلي أعلى الترجمة العربية (ترجمة ثنائية)
      </label>
    </div>

    <div id="saveToast" class="toast">تم حفظ الإعدادات بنجاح ✓</div>

    <script src="popup.js"></script>
  </body>
</html>`
  },
  {
    name: 'popup.js',
    path: 'popup.js',
    language: 'javascript',
    description: 'Popup script: manages extension state, toggles tabCapture, saves settings to chrome.storage',
    content: `/**
 * Tarjamah Live - popup.js
 * Controls popup UI events, storage synchronization, and capture session toggles.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleBtnText = document.getElementById('toggleBtnText');
  const toggleBtnIcon = document.getElementById('toggleBtnIcon');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');

  const radioOptionA = document.getElementById('radioOptionA');
  const radioOptionB = document.getElementById('radioOptionB');
  const cardOptionA = document.getElementById('cardOptionA');
  const cardOptionB = document.getElementById('cardOptionB');

  const geminiKeyInput = document.getElementById('geminiKey');
  const groqKeyInput = document.getElementById('groqKey');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const showOriginalCheck = document.getElementById('showOriginalCheck');
  const saveToast = document.getElementById('saveToast');

  // Load saved state and configuration
  const stored = await chrome.storage.local.get([
    'pipelineOption',
    'geminiApiKey',
    'groqApiKey',
    'subtitleStyles',
  ]);

  if (stored.pipelineOption === 'optionB') {
    radioOptionB.checked = true;
    updatePipelineCards('optionB');
  } else {
    radioOptionA.checked = true;
    updatePipelineCards('optionA');
  }

  if (stored.geminiApiKey) geminiKeyInput.value = stored.geminiApiKey;
  if (stored.groqApiKey) groqKeyInput.value = stored.groqApiKey;

  const styles = stored.subtitleStyles || { fontSize: 24, showOriginal: false };
  fontSizeSlider.value = styles.fontSize || 24;
  fontSizeVal.textContent = \`\${fontSizeSlider.value}px\`;
  showOriginalCheck.checked = Boolean(styles.showOriginal);

  // Check current capture status with service worker
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (res) => {
    if (res && res.isCapturing) {
      setCapturingState(true);
    } else {
      setCapturingState(false);
    }
  });

  // Toggle button click listener
  toggleBtn.addEventListener('click', async () => {
    // Save current settings first
    await saveSettings();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert('لا توجد علامة تبويب نشطة.');
      return;
    }

    // Verify key exists
    const geminiKey = geminiKeyInput.value.trim();
    if (!geminiKey) {
      alert('يرجى إدخال مفتاح Gemini API المجاني للمتابعة.');
      geminiKeyInput.focus();
      return;
    }

    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, async (res) => {
      const isCurrentlyRunning = res && res.isCapturing;

      if (isCurrentlyRunning) {
        // Stop session
        chrome.runtime.sendMessage({ action: 'STOP_CAPTURE' }, () => {
          setCapturingState(false);
        });
      } else {
        // Start session
        toggleBtn.disabled = true;
        toggleBtnText.textContent = 'جاري الاتصال بصوت الفيديو...';

        chrome.runtime.sendMessage({ action: 'START_CAPTURE', tabId: tab.id }, (startRes) => {
          toggleBtn.disabled = false;
          if (startRes && startRes.success) {
            setCapturingState(true);
          } else {
            alert('تعذر التقاط صوت علامة التبويب: ' + (startRes?.error || 'خطأ غير معروف'));
            setCapturingState(false);
          }
        });
      }
    });
  });

  // Pipeline radio changes
  radioOptionA.addEventListener('change', () => {
    updatePipelineCards('optionA');
    saveSettings();
  });
  radioOptionB.addEventListener('change', () => {
    updatePipelineCards('optionB');
    saveSettings();
  });

  // Inputs auto-save on change
  geminiKeyInput.addEventListener('change', saveSettings);
  groqKeyInput.addEventListener('change', saveSettings);

  fontSizeSlider.addEventListener('input', () => {
    fontSizeVal.textContent = \`\${fontSizeSlider.value}px\`;
  });
  fontSizeSlider.addEventListener('change', saveSettings);
  showOriginalCheck.addEventListener('change', saveSettings);

  function updatePipelineCards(selected) {
    if (selected === 'optionA') {
      cardOptionA.classList.add('selected');
      cardOptionB.classList.remove('selected');
    } else {
      cardOptionB.classList.add('selected');
      cardOptionA.classList.remove('selected');
    }
  }

  function setCapturingState(isActive) {
    if (isActive) {
      statusDot.classList.add('active');
      statusLabel.textContent = 'الترجمة تعمل الآن';
      toggleBtn.classList.add('btn-stop');
      toggleBtnText.textContent = 'إيقاف الترجمة الفورية';
      toggleBtnIcon.textContent = '⏹';
    } else {
      statusDot.classList.remove('active');
      statusLabel.textContent = 'متوقف';
      toggleBtn.classList.remove('btn-stop');
      toggleBtnText.textContent = 'بدء ترجمة صوت الفيديو';
      toggleBtnIcon.textContent = '▶';
    }
  }

  async function saveSettings() {
    const pipeline = radioOptionB.checked ? 'optionB' : 'optionA';
    const geminiKey = geminiKeyInput.value.trim();
    const groqKey = groqKeyInput.value.trim();
    const fontSize = parseInt(fontSizeSlider.value, 10);
    const showOriginal = showOriginalCheck.checked;

    await chrome.storage.local.set({
      pipelineOption: pipeline,
      geminiApiKey: geminiKey,
      groqApiKey: groqKey,
      subtitleStyles: {
        fontSize,
        showOriginal,
        bgOpacity: 0.88,
        textColor: '#ffffff',
      },
    });

    // Flash toast
    saveToast.style.display = 'block';
    setTimeout(() => {
      saveToast.style.display = 'none';
    }, 1800);
  }
});
`
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Complete step-by-step installation instructions for Chrome and Brave Developer Mode',
    content: `# Tarjamah Live - Real-Time Arabic Video Translator Extension (Manifest V3)

A lightweight, free Chrome & Brave extension that performs **real-time tab audio capture**, speech recognition, and **context-aware Arabic subtitle translation** on any web video player (YouTube, Netflix, Vimeo, Coursera, news clips).

---

## Technical Architecture

\`\`\`
[Active Tab Video / Audio Stream]
        │
        ▼ (chrome.tabCapture)
[Manifest V3 Offscreen Document] ── (Preserves audio to speaker via AudioContext)
        │
        ▼ (Continuous 3.5s Audio Buffer Chunks)
[Service Worker (background.js)]
        │
        ├─► Option A: Google Gemini 1.5/Flash (Direct Multimodal 1-Call Audio -> Arabic)
        │
        └─► Option B: Groq Whisper-large-v3 (Hyper-fast STT) ➔ Gemini Flash (Arabic Translation)
        │
        ▼
[Content Script Subtitle Overlay (content.js)]
(Floating, Draggable, Responsive RTL Glassmorphic Arabic Subtitles with Fullscreen Support)
\`\`\`

---

## Step-by-Step Installation in Chrome / Brave

### Step 1: Unpack or Extract the Extension Folder
1. Create a local folder on your computer named \`tarjamah-live-extension\`.
2. Place all the files from this repository directly inside that folder:
   - \`manifest.json\`
   - \`background.js\`
   - \`offscreen.html\`
   - \`offscreen.js\`
   - \`apiServices.js\`
   - \`content.js\`
   - \`styles.css\`
   - \`popup.html\`
   - \`popup.js\`
   - \`icons/\` (containing icon16.png, icon48.png, icon128.png)

### Step 2: Open Extensions in Chrome or Brave
- In **Google Chrome**: Navigate to \`chrome://extensions/\`
- In **Brave Browser**: Navigate to \`brave://extensions/\`

### Step 3: Enable Developer Mode
- In the top-right corner of the Extensions page, toggle the **Developer Mode** switch to **ON**.

### Step 4: Load Unpacked Extension
1. Click the **Load unpacked** (تحميل إضافة لم يتم حزمها) button in the top-left toolbar.
2. Select the \`tarjamah-live-extension\` directory.
3. The extension **Tarjamah Live** will now appear in your browser toolbar!

### Step 5: Pin the Extension & Enter API Keys
1. Click the puzzle icon (Extensions) in your browser bar and click the Pin icon next to **Tarjamah Live**.
2. Click the extension icon to open the popup.
3. Enter your free **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/app/apikey)).
4. *(Optional for Option B)*: Enter your free **Groq API Key** (from [console.groq.com/keys](https://console.groq.com/keys)).
5. Open any English video on YouTube or any website, click **بدء ترجمة صوت الفيديو**, and watch the instant Arabic subtitles appear on screen!

---

## Why Manifest V3 Offscreen Document?
In Manifest V3, background service workers do not have access to DOM APIs (\`AudioContext\`, \`MediaRecorder\`). Chrome strictly mandates the \`chrome.offscreen\` API for recording \`tabCapture\` streams. Tarjamah Live routes the tab capture stream to an offscreen document and simultaneously connects it back to the computer speakers, guaranteeing zero audio loss for the listener while capturing 3.5s slices.
`
  }
];
