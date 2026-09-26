/* ══════════════════════════════════════════════════════════════════
   IMAGE GENERATOR — Mode EXPRESS (≤12s) + qualité
   Turbo Pollinations → compress JPEG → fallback canvas instantané
   ══════════════════════════════════════════════════════════════════ */

window.ImageGenerator = (() => {
  const CFG = () => window.CONFIG || {};
  const CACHE_DB = () => (CFG().STORAGE && CFG().STORAGE.imageCacheDb) || 'avp_image_cache';

  let expressMode = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setExpressMode(on) {
    expressMode = !!on;
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
    const s = (expressMode ? 'fast|' : '') + prompt + '|' + (seed || 0);
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

  function fetchWithTimeout(url, ms, options) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const opts = Object.assign({}, options || {}, { signal: ctrl.signal });
    return fetch(url, opts).finally(() => clearTimeout(timer));
  }

  /** Compresse / redimensionne pour upload Agnes rapide. */
  function compressDataUrl(dataUrl, maxWidth, quality) {
    const imgCfg = CFG().IMAGE || {};
    const mw = maxWidth || imgCfg.agnesMaxWidth || 720;
    const q = quality != null ? quality : (imgCfg.agnesJpegQuality || 0.82);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > mw) {
          h = Math.round(h * (mw / w));
          w = mw;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', q));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Compression image impossible'));
      img.src = dataUrl;
    });
  }

  /** Prompt court = génération plus rapide. */
  function shortenPrompt(prompt) {
    const raw = String(prompt || '');
    if (raw.length <= 280) return raw;
    return raw.slice(0, 280).replace(/\s+\S*$/, '') + ', cinematic portrait 9:16';
  }

  /** Fallback instantané si Pollinations trop lent. */
  function generateCanvasFallback(scene, seed) {
    const canvas = document.createElement('canvas');
    const imgCfg = CFG().IMAGE || {};
    canvas.width = expressMode ? (imgCfg.fastWidth || 720) : 720;
    canvas.height = expressMode ? (imgCfg.fastHeight || 1280) : 1280;
    const ctx = canvas.getContext('2d');

    const palettes = {
      joie: ['#f7d794', '#f5cd79', '#f19066'],
      tristesse: ['#3d5a80', '#98c1d9', '#1b263b'],
      colere: ['#c0392b', '#e74c3c', '#2c3e50'],
      peur: ['#2c3e50', '#34495e', '#7f8c8d'],
      amour: ['#e8a0bf', '#ba6f8e', '#5c3d5e'],
      surprise: ['#f8c291', '#e17055', '#6c5ce7'],
      determination: ['#2d3436', '#636e72', '#fdcb6e'],
      serenite: ['#74b9ff', '#a29bfe', '#dfe6e9'],
      neutre: ['#2f3640', '#718093', '#dcdde1']
    };
    const colors = palettes[scene.emotion] || palettes.neutre;
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.55, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Voile / profondeur (pas de texte)
    const rng = (seed || 1) % 1000;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const x = ((rng * (i + 3) * 37) % canvas.width);
      const y = ((rng * (i + 5) * 53) % canvas.height);
      const r = 40 + ((rng + i * 17) % 120);
      const rad = ctx.createRadialGradient(x, y, 0, x, y, r);
      rad.addColorStop(0, 'rgba(255,255,255,0.18)');
      rad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rad;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function generateWithGemini(prompt, seed) {
    const key = getKey('gemini');
    if (!key) throw new Error('Clé Gemini manquante');

    const url = CFG().ENDPOINTS.geminiImage + '?key=' + encodeURIComponent(key);
    const body = {
      contents: [{
        role: 'user',
        parts: [{
          text: 'Generate an image: ' + shortenPrompt(prompt) + '. Portrait 9:16. Seed: ' + (seed || 'random')
        }]
      }],
      generationConfig: { responseModalities: ['IMAGE'] }
    };

    const timeout = expressMode ? 10000 : 25000;
    const res = await fetchWithTimeout(url, timeout, {
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
    const img = CFG().IMAGE || {};
    const w = expressMode ? (img.fastWidth || 720) : (img.width || 1080);
    const h = expressMode ? (img.fastHeight || 1280) : (img.height || 1920);
    const model = expressMode ? (img.fastModel || 'turbo') : (img.qualityModel || 'flux');
    const timeout = expressMode ? (img.fastTimeoutMs || 12000) : 45000;
    const short = shortenPrompt(prompt);
    const encoded = encodeURIComponent(short);
    const url =
      CFG().ENDPOINTS.pollinations +
      encoded +
      '?width=' + w +
      '&height=' + h +
      '&seed=' + (seed || Math.floor(Math.random() * 1e6)) +
      '&nologo=true&model=' + encodeURIComponent(model) +
      '&enhance=false';

    const res = await fetchWithTimeout(url, timeout);
    if (!res.ok) throw new Error('Pollinations HTTP ' + res.status);
    const blob = await res.blob();
    return blobToDataUrl(blob);
  }

  async function generateWithStableHorde(prompt, seed) {
    if (expressMode) throw new Error('StableHorde désactivé en mode express');
    const key = getKey('stableHorde') || '0000000000';
    const img = CFG().IMAGE || { width: 1024, height: 1536 };
    const w = Math.min(1024, Math.floor(img.width / 64) * 64) || 576;
    const h = Math.min(1536, Math.floor(img.height / 64) * 64) || 1024;

    const submit = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({
        prompt: shortenPrompt(prompt),
        params: {
          width: w,
          height: h,
          steps: 20,
          seed: seed != null ? String(seed) : undefined
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['stable_diffusion']
      })
    });

    if (!submit.ok) throw new Error('StableHorde submit HTTP ' + submit.status);
    const { id } = await submit.json();
    if (!id) throw new Error("StableHorde: pas d'id");

    for (let i = 0; i < 40; i++) {
      await sleep(2500);
      const check = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/check/' + id);
      const cdata = await check.json();
      if (cdata.done) break;
    }

    const status = await fetch(CFG().ENDPOINTS.stableHorde + '/generate/status/' + id);
    const sdata = await status.json();
    const imgUrl = sdata.generations && sdata.generations[0] && sdata.generations[0].img;
    if (!imgUrl) throw new Error("StableHorde: pas d'image");
    const imgRes = await fetch(imgUrl);
    return blobToDataUrl(await imgRes.blob());
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

  async function generateImage(scene, characterSeeds, onProgress) {
    const prompt = scene.imagePrompt;
    const seed = resolveSeed(scene, characterSeeds);
    const key = hashPrompt(prompt, seed);

    const cached = await cacheGet(key);
    if (cached) {
      if (onProgress) onProgress('Cache');
      return cached;
    }

    const models = CFG().MODELS || {};
    const order = expressMode
      ? (models.imageProvidersFast || ['pollinations'])
      : (models.imageProviders || ['pollinations', 'gemini', 'stableHorde']);
    const maxRetries = expressMode ? 1 : ((CFG().IMAGE && CFG().IMAGE.maxRetries) || 1);
    let lastError = null;

    for (let p = 0; p < order.length; p++) {
      const providerKey = order[p];
      const api = PROVIDERS[providerKey];
      if (!api) continue;
      if (providerKey === 'gemini' && !getKey('gemini')) continue;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (onProgress) onProgress(api.name + (expressMode ? ' turbo…' : '…'));
          let data = await api.fn(prompt, seed);
          data = await compressDataUrl(data);
          await cachePut(key, data);
          return data;
        } catch (e) {
          lastError = e;
          console.warn('[ImageGenerator] ' + api.name + ' échec :', e.message);
          if (expressMode) break;
          if (/manquante|HTTP 4\d\d|abort/i.test(e.message)) break;
        }
      }
    }

    // Express : jamais bloquer — canvas instantané
    if (expressMode) {
      if (onProgress) onProgress('Fallback local…');
      const local = generateCanvasFallback(scene, seed);
      const compressed = await compressDataUrl(local);
      await cachePut(key, compressed);
      return compressed;
    }

    throw lastError || new Error("Toutes les APIs d'image ont échoué");
  }

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

  return {
    generateImage: generateImage,
    generateAll: generateAll,
    cacheGet: cacheGet,
    hashPrompt: hashPrompt,
    compressDataUrl: compressDataUrl,
    setExpressMode: setExpressMode
  };
})();
