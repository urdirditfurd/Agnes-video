/* ══════════════════════════════════════════════════════════════════
   CONFIG — Clés API et paramètres centraux (APIs swappables)
   ══════════════════════════════════════════════════════════════════ */

window.CONFIG = {
  // Clés stockées en localStorage via ces noms de clés (jamais en dur ici)
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
    deepseek: 'deepseek-chat',
    /** Ordre de fallback image — Pollinations d'abord (gratuit + rapide) */
    imageProviders: ['pollinations', 'gemini', 'stableHorde']
  },

  VIDEO: {
    frameRate: 24,
    /** Frames Agnes : 5s ≈ 121, 10s ≈ 241 */
    durations: { '5s': 121, '10s': 241 },
    defaultDuration: '5s',
    maxParallel: 5,
    maxRetries: 2,
    retryBaseMs: 2000,
    /** Espacement entre créations (multi-clips). 1 seul clip = aucun délai. */
    createIntervalMs: 45000,
    createIntervalMin: 30000,
    createIntervalMax: 90000,
    createIntervalSafe: 60000,
    /** Polling agressif : premier check rapide, puis intervalle court */
    pollInitialDelaySec: 2,
    pollIntervalSec: 3,
    pollIntervalShortSec: 2,
    maxPollAttempts: 120
  },

  IMAGE: {
    width: 1080,
    height: 1920,
    defaultStyle: 'cinematic',
    maxParallel: 3,
    maxRetries: 2,
    /** Pollinations en premier = plus rapide sans clé Gemini */
    preferFastProvider: true
  },

  STORY: {
    chapterThresholdSec: 60,
    clipDurations: {
      '5s': 5,
      '10s': 10,
      '30s': 30,
      '1min': 60,
      '5min': 300,
      '20min': 1200
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
  },

  STORAGE: {
    planKey: 'avp_story_plan',
    progressKey: 'avp_generation_progress',
    imageCacheDb: 'avp_image_cache',
    blobDb: 'avp_blob_store'
  },

  /** Script de démo — « Le voyage d'une goutte d'eau » (~1 min) */
  DEMO_SCRIPT: `Une goutte d'eau naît au sommet d'une montagne enneigée. Elle tremble, puis se détache et glisse sur la glace. Le vent la pousse vers un ruisseau lumineux. Elle danse entre les cailloux et les racines. Dans la forêt, elle croise un cerf qui boit à la source. Plus loin, le ruisseau grossit et devient rivière. La goutte file sous un pont de pierre. Un enfant jette un caillou ; des cercles se forment. La nuit tombe, la lune se reflète sur l'eau. Au matin, la rivière rejoint l'océan. La goutte s'évapore, monte dans le ciel, et redevient nuage. Un nouveau voyage commence.`
};
