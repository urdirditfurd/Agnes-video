/* ══════════════════════════════════════════════════════════════════
   IMAGE GENERATOR — Gemini → Pollinations → Stable Horde
   Cache IndexedDB + seed personnage pour cohérence.
   ══════════════════════════════════════════════════════════════════ */

window.ImageGenerator = (() => {
  const CFG = () => window.CONFIG || {};
  const CACHE_DB = () => (CFG().STORAGE && CFG().STORAGE.imageCacheDb) || 'avp_image_cache';

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getKey(name) {
    const keys = CFG().API_KEYS || {};
    const storageName = keys[name];
    if (!storageName) return '';
    return localStorage.getItem(storageName) || '';
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_DB(), 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('images')) {
          req.result.createObjectStore('images', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('images', 'readonly');
        const r = tx.objectStore('images').get(key);
        r.onsuccess = () => resolve((r.result && r.result.data) || null);
        r.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function cachePut(key, data) {
    try {
      const db = await openDB();
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put({ key: key, data: data, ts: Date.now() });
    } catch (e) {
      console.warn('[ImageGenerator] cache put échoué', e);
    }
  }

  function hashPrompt(prompt, seed) {
    let h = 0;
    const s = prompt + '|' + (seed || 0);
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return 'img_' + Math.abs(h).toString(36);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function generateWithGemini(prompt, seed) {
    const key = getKey('gemini');
    if (!key) throw new Error('Clé Gemini manquante');

    const url = CFG().ENDPOINTS.geminiImage + '?key=' + encodeURIComponent(key);
    const body = {
      contents: [{
        role: 'user',
        parts: [{
          text: 'Generate an image: ' + prompt + '. Portrait 9:16, high quality. Seed: ' + (seed || 'random')
        }]
      }],
      generationConfig: { responseModalities: ['IMAGE'] }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
    const data = await res.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const part = parts.find((p) => p.inlineData);
    if (!part) throw new Error("Pas d'image dans la réponse Gemini");
    return 'data:' + part.inlineData.mimeType + ';base64,' + part.inlineData.data;
  }

  async function generateWithPollinations(prompt, seed) {
    const img = CFG().IMAGE || { width: 1080, height: 1920 };
    const encoded = encodeURIComponent(prompt);
    const url =
      CFG().ENDPOINTS.pollinations +
      encoded +
      '?width=' + img.width +
      '&height=' + img.height +
      '&seed=' + (seed || Math.floor(Math.random() * 1e6)) +
      '&nologo=true&model=flux';

    const res = await fetch(url);
    if (!res.ok) throw new Error('Pollinations HTTP ' + res.status);
    const blob = await res.blob();
    return blobToDataUrl(blob);
  }

  async function generateWithStableHorde(prompt, seed) {
    const key = getKey('stableHorde') || '0000000000';
    const img = CFG().IMAGE || { width: 1024, height: 1536 };
    // Stable Horde exige souvent des multiples de 64
    const w = Math.min(1024, Math.floor(img.width / 64) * 64) || 576;
    const h = Math.min(1536, Math.floor(img.height / 64) * 64) || 1024;

    const submit = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          width: w,
          height: h,
          steps: 25,
          seed: seed != null ? String(seed) : undefined
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['stable_diffusion']
      })
    });

    if (!submit.ok) throw new Error('StableHorde submit HTTP ' + submit.status);
    const { id } = await submit.json();
    if (!id) throw new Error('StableHorde: pas d\'id');

    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      const check = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/check/' + id);
      const cdata = await check.json();
      if (cdata.done) break;
    }

    const status = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/status/' + id);
    const sdata = await status.json();
    const imgUrl = sdata.generations && sdata.generations[0] && sdata.generations[0].img;
    if (!imgUrl) throw new Error("StableHorde: pas d'image");

    const imgRes = await fetch(imgUrl);
    const blob = await imgRes.blob();
    return blobToDataUrl(blob);
  }

  const PROVIDERS = {
    gemini: { name: 'Gemini', fn: generateWithGemini },
    pollinations: { name: 'Pollinations', fn: generateWithPollinations },
    stableHorde: { name: 'StableHorde', fn: generateWithStableHorde }
  };

  function resolveSeed(scene, characterSeeds) {
    if (!scene.characters || !scene.characters.length) {
      return Math.floor(Math.random() * 1e6);
    }
    const charId = scene.characters[0];
    if (characterSeeds && characterSeeds[charId] != null) return characterSeeds[charId];

    if (window.CharacterBible) {
      const entry = window.CharacterBible.getById(charId);
      if (entry) return entry.styleSeed;
    }
    return Math.floor(Math.random() * 1e6);
  }

  /**
   * Génère une image pour une scène (cache → chaîne de fallback).
   */
  async function generateImage(scene, characterSeeds, onProgress) {
    const prompt = scene.imagePrompt;
    const seed = resolveSeed(scene, characterSeeds);
    const key = hashPrompt(prompt, seed);

    const cached = await cacheGet(key);
    if (cached) {
      if (onProgress) onProgress('Cache');
      return cached;
    }

    const order = (CFG().MODELS && CFG().MODELS.imageProviders) || ['gemini', 'pollinations', 'stableHorde'];
    const maxRetries = (CFG().IMAGE && CFG().IMAGE.maxRetries) || 3;
    let lastError = null;

    for (let p = 0; p < order.length; p++) {
      const providerKey = order[p];
      const api = PROVIDERS[providerKey];
      if (!api) continue;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (onProgress) {
            onProgress(api.name + (attempt ? ' (retry ' + (attempt + 1) + ')' : '…'));
          }
          const data = await api.fn(prompt, seed);
          await cachePut(key, data);
          return data;
        } catch (e) {
          lastError = e;
          console.warn('[ImageGenerator] ' + api.name + ' échec :', e.message);
          await sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("Toutes les APIs d'image ont échoué");
  }

  /**
   * Génération parallèle limitée (file d'attente).
   */
  async function generateAll(scenes, characterSeeds, onSceneDone, concurrency) {
    const limit = concurrency || (CFG().IMAGE && CFG().IMAGE.maxParallel) || 3;
    const queue = scenes.slice();
    const results = new Map();
    const workers = [];

    for (let w = 0; w < limit; w++) {
      workers.push((async () => {
        while (queue.length) {
          const scene = queue.shift();
          if (!scene) break;

          // Reprise : déjà générée
          if (scene.imageUrl && (scene.status === 'image_done' || scene.status === 'video_done')) {
            results.set(scene.id, scene.imageUrl);
            if (onSceneDone) onSceneDone(scene.id, { status: 'image_done', data: scene.imageUrl, resumed: true });
            continue;
          }

          try {
            scene.status = 'generating';
            const data = await generateImage(scene, characterSeeds, (msg) => {
              if (onSceneDone) onSceneDone(scene.id, { status: 'generating', message: msg });
            });
            scene.imageUrl = data;
            scene.status = 'image_done';
            results.set(scene.id, data);
            if (onSceneDone) onSceneDone(scene.id, { status: 'image_done', data: data });
          } catch (e) {
            scene.status = 'failed';
            if (onSceneDone) onSceneDone(scene.id, { status: 'failed', error: e.message });
          }
        }
      })());
    }

    await Promise.all(workers);
    return results;
  }

  return { generateImage, generateAll, cacheGet, hashPrompt };
})();
