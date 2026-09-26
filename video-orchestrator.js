/* ══════════════════════════════════════════════════════════════════
   VIDEO ORCHESTRATOR — Queue Agnes + parallélisation + retry
   ══════════════════════════════════════════════════════════════════ */

window.VideoOrchestrator = (() => {
  const V = window.CONFIG.VIDEO;
  const E = window.CONFIG.ENDPOINTS;
  const M = window.CONFIG.MODELS;

  let createIntervalMs = V.createIntervalMs;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function getAgnesKey() { return localStorage.getItem(window.CONFIG.API_KEYS.agnes) || ''; }

  async function createTask(imageDataUri, motionPrompt, durationKey = '10s') {
    const frames = V.durations[durationKey] || 241;
    const body = {
      model: M.agnes,
      prompt: motionPrompt,
      image: imageDataUri,
      num_frames: frames,
      frame_rate: V.frameRate
    };

    const res = await fetch(E.agnesVideo, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getAgnesKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('HTTP ' + res.status + ' — ' + err.slice(0, 200));
    }
    const data = await res.json();
    const id = data.video_id || data.id || data.task_id;
    if (!id) throw new Error('Pas de video_id');
    return id;
  }

  async function poll(videoId, onProgress, stopSignal) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (stopSignal?.aborted) throw new Error('Arrêt demandé');
      await sleep(8000);

      const url = `${E.agnesPoll}?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(M.agnes)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + getAgnesKey() }
      });
      const d = await res.json();
      const status = d.status || 'unknown';
      onProgress?.('Création — ' + (d.progress || 0) + '%');

      if (['completed','succeeded','done'].includes(status)) {
        const url = d.metadata?.url || d.url || d.output?.url;
        if (!url) throw new Error('Terminé mais pas d\'URL');
        return url;
      }
      if (['failed','error','cancelled'].includes(status)) {
        throw new Error('Échec (' + status + ')');
      }
    }
    throw new Error('Timeout polling');
  }

  async function withRetry(fn, label, onProgress) {
    let lastErr;
    for (let i = 0; i < V.maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const wait = V.retryBaseMs * Math.pow(2, i);
        onProgress?.(`${label} — retry ${i+1}/${V.maxRetries} dans ${wait/1000}s`);
        await sleep(wait);
      }
    }
    throw lastErr;
  }

  async function processScene(scene, durationKey, onProgress, stopSignal) {
    scene.status = 'video_generating';
    onProgress?.({ status: 'video_generating', message: 'Création…' });

    const videoId = await withRetry(
      () => createTask(scene.imageUrl, scene.motionPrompt, durationKey),
      'Création',
      (msg) => onProgress?.({ status: 'video_generating', message: msg })
    );

    scene.videoId = videoId;
    scene.status = 'video_polling';

    const videoUrl = await withRetry(
      () => poll(videoId, (msg) => onProgress?.({ status: 'video_polling', message: msg }), stopSignal),
      'Polling',
      (msg) => onProgress?.({ status: 'video_polling', message: msg })
    );

    scene.videoUrl = videoUrl;
    scene.status = 'video_done';
    onProgress?.({ status: 'video_done', url: videoUrl });
    return videoUrl;
  }

  async function processAll(scenes, durationKey, onSceneProgress, stopSignal) {
    const queue = [...scenes];
    const results = [];
    let activeCount = 0;

    return new Promise((resolve) => {
      const next = () => {
        if (queue.length === 0 && activeCount === 0) return resolve(results);

        while (activeCount < V.maxParallel && queue.length > 0) {
          const scene = queue.shift();
          activeCount++;

          processScene(scene, durationKey,
            (prog) => onSceneProgress?.(scene.id, prog),
            stopSignal
          ).then(url => {
            results.push({ sceneId: scene.id, url });
          }).catch(e => {
            scene.status = 'failed';
            onSceneProgress?.(scene.id, { status: 'failed', error: e.message });
          }).finally(() => {
            activeCount--;
            next();
          });
        }
      };
      next();
    });
  }

  return { createTask, poll, processScene, processAll };
})();
