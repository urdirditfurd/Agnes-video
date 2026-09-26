/* ══════════════════════════════════════════════════════════════════
   IMAGE GENERATOR — Gemini → Pollinations → Stable Horde
   ══════════════════════════════════════════════════════════════════ */

window.ImageGenerator = (() => {
  const CACHE_DB = 'avp_image_cache';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('images', { keyPath: 'key' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return new Promise(resolve => {
        const tx = db.transaction('images', 'readonly');
        const r = tx.objectStore('images').get(key);
        r.onsuccess = () => resolve(r.result?.data || null);
        r.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }

  async function cachePut(key, data) {
    try {
      const db = await openDB();
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put({ key, data, ts: Date.now() });
    } catch (e) {}
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getKey(name) {
    return localStorage.getItem(window.CONFIG.API_KEYS[name]) || '';
  }

  function hashPrompt(prompt, seed) {
    let h = 0;
    const s = prompt + '|' + (seed || 0);
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return 'img_' + Math.abs(h).toString(36);
  }

  async function generateWithGemini(prompt, seed) {
    const key = getKey('gemini');
    if (!key) throw new Error('Clé Gemini manquante');

    const url = window.CONFIG.ENDPOINTS.geminiImage + '?key=' + key;
    const body = {
      contents: [{
        role: 'user',
        parts: [{ text: `Generate an image: ${prompt}. Portrait 9:16, high quality. Seed: ${seed || 'random'}` }]
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
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) throw new Error('Pas d\'image dans la réponse Gemini');
    return 'data:' + part.inlineData.mimeType + ';base64,' + part.inlineData.data;
  }

  async function generateWithPollinations(prompt, seed) {
    const encoded = encodeURIComponent(prompt);
    const url = `${window.CONFIG.ENDPOINTS.pollinations}${encoded}?width=1080&height=1920&seed=${seed || Math.floor(Math.random()*1e6)}&nologo=true&model=flux`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Pollinations HTTP ' + res.status);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  }

  async function generateWithStableHorde(prompt, seed) {
    const key = getKey('stableHorde') || '0000000000';
    const submit = await fetch(window.CONFIG.ENDPOINTS.stableHorde + '/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({
        prompt,
        params: { width: 1080, height: 1920, steps: 25, seed: seed || undefined },
        nsfw: false, censor_nsfw: true, models: ['stable_diffusion']
      })
    });
    if (!submit.ok) throw new Error('StableHorde submit HTTP ' + submit.status);
    const { id } = await submit.json();

    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      const check = await fetch(`${window.CONFIG.ENDPOINTS.stableHorde}/generate/check/${id}`);
      const cdata = await check.json();
      if (cdata.done) break;
    }

    const status = await fetch(`${window.CONFIG.ENDPOINTS.stableHorde}/generate/status/${id}`);
    const sdata = await status.json();
    const imgUrl = sdata.generations?.[0]?.img;
    if (!imgUrl) throw new Error('StableHorde: pas d\'image');
    const imgRes = await fetch(imgUrl);
    const blob = await imgRes.blob();
    return await blobToDataUrl(blob);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function generateImage(scene, characterSeeds, onProgress) {
    const prompt = scene.imagePrompt;
    const seed = characterSeeds[scene.characters[0]] || Math.floor(Math.random()*1e6);
    const key = hashPrompt(prompt, seed);

    const cached = await cacheGet(key);
    if (cached) {
      onProgress?.('Cache');
      return cached;
    }

    const apis = [
      { name: 'Gemini',      fn: () => generateWithGemini(prompt, seed) },
      { name: 'Pollinations', fn: () => generateWithPollinations(prompt, seed) },
      { name: 'StableHorde',  fn: () => generateWithStableHorde(prompt, seed) }
    ];

    for (const api of apis) {
      try {
        onProgress?.(api.name + '…');
        const data = await api.fn();
        await cachePut(key, data);
        return data;
      } catch (e) {
        console.warn('[ImageGenerator] ' + api.name + ' échec :', e.message);
      }
    }
    throw new Error('Toutes les APIs d\'image ont échoué');
  }

  async function generateAll(scenes, characterSeeds, onSceneDone, concurrency = 3) {
    const queue = [...scenes];
    const results = new Map();
    const workers = [];

    for (let w = 0; w < concurrency; w++) {
      workers.push((async () => {
        while (queue.length) {
          const scene = queue.shift();
          if (!scene) break;
          try {
            const data = await generateImage(scene, characterSeeds,
              (msg) => onSceneDone?.(scene.id, { status: 'generating', message: msg })
            );
            scene.imageUrl = data;
            scene.status = 'image_done';
            results.set(scene.id, data);
            onSceneDone?.(scene.id, { status: 'image_done', data });
          } catch (e) {
            scene.status = 'failed';
            onSceneDone?.(scene.id, { status: 'failed', error: e.message });
          }
        }
      })());
    }

    await Promise.all(workers);
    return results;
  }

  return { generateImage, generateAll };
})();
