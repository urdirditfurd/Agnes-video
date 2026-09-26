/* ══════════════════════════════════════════════════════════════════
   CONFIG — Toutes les clés API et paramètres en un seul endroit.
   ══════════════════════════════════════════════════════════════════ */

window.CONFIG = {
  API_KEYS: {
    agnes: 'agnes_api_key',
    gemini: 'gemini_api_key',
    deepseek: 'deepseek_api_key',
    pollinations: null,
    stableHorde: 'stable_horde_key'
  },

  ENDPOINTS: {
    agnesVideo: 'https://apihub.agnes-ai.com/v1/videos',
    agnesPoll: 'https://apihub.agnes-ai.com/agnesapi',
    geminiImage: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    geminiText: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    pollinations: 'https://image.pollinations.ai/prompt/',
    stableHorde: 'https://stablehorde.net/api/v2'
  },

  MODELS: {
    agnes: 'agnes-video-v2.0',
    gemini: 'gemini-2.0-flash-exp',
    deepseek: 'deepseek-chat'
  },

  VIDEO: {
    frameRate: 24,
    durations: { '5s': 121, '10s': 241 },
    defaultDuration: '10s',
    maxParallel: 5,
    maxRetries: 3,
    retryBaseMs: 4000,
    createIntervalMs: 62000
  },

  IMAGE: {
    width: 1080,
    height: 1920,
    defaultStyle: 'cinematic',
    maxParallel: 3,
    maxRetries: 3
  },

  STORY: {
    chapterThresholdSec: 60,
    clipDurations: {
      '5s': 5, '10s': 10, '30s': 30,
      '1min': 60, '5min': 300, '20min': 1200
    }
  },

  ASSEMBLY: {
    transitions: ['fade', 'cut', 'morph'],
    defaultTransition: 'fade',
    transitionDurationSec: 0.5,
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    resolution: '1080x1920'
  },

  TTS: {
    defaultVoice: 'fr-FR-DeniseNeural',
    voices: [
      { id: 'fr-FR-DeniseNeural', name: 'Denise (FR, chaleureuse)' },
      { id: 'fr-FR-HenriNeural', name: 'Henri (FR, posé)' },
      { id: 'fr-FR-EloiseNeural', name: 'Éloïse (FR, jeune)' },
      { id: 'en-US-JennyNeural', name: 'Jenny (EN, narration)' }
    ]
  }
};
