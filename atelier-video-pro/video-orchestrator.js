/* ══════════════════════════════════════════════════════════════════
   VIDEO ORCHESTRATOR — Express 5s : compress + poll 1s + pipeline
   Objectif : clip prêt en ≤ 60s (hors latence serveur Agnes).
   ══════════════════════════════════════════════════════════════════ */

window.VideoOrchestrator = (() => {
  function cfg() {
    return window.CONFIG || {};
  }

  function V() {
    return cfg().VIDEO || {};
  }

  function E() {
    return cfg().ENDPOINTS || {};
  }

  function M() {
    return cfg().MODELS || {};
  }

  let createIntervalMs = V().createIntervalMs || 45000;
  let consecutiveSuccess = 0;
  let expressMode = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setExpressMode(on) {
    expressMode = !!on;
  }

  function getAgnesKey() {
    const keyName = (cfg().API_KEYS && cfg().API_KEYS.agnes) || 'agnes_api_key';
    return (localStorage.getItem(keyName) || '').trim();
  }

  function isShortClip(durationKey) {
    return durationKey === '5s' || expressMode;
  }

  /** Polling adaptatif : rapide au début, plus lent ensuite */
  function adaptivePollWait(attempt, durationKey) {
    if (isShortClip(durationKey)) {
      if (attempt < 8) return 2000;
      if (attempt < 30) return 3000;
      return 5000;
    }
    if (attempt < 5) return 4000;
    if (attempt < 15) return 8000;
    return 12000;
  }

  // ── Cache IndexedDB des URLs vidéo (évite régénération) ─────────
  function openVideoDB() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('avp_video_cache', 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains('videos')) {
          r.result.createObjectStore('videos', { keyPath: 'key' });
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function videoCacheGet(sceneId) {
    try {
      const db = await openVideoDB();
      return new Promise((resolve) => {
        const tx = db.transaction('videos', 'readonly');
        const req = tx.objectStore('videos').get(sceneId);
        req.onsuccess = () => resolve((req.result && req.result.url) || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function videoCachePut(sceneId, url) {
    try {
      const db = await openVideoDB();
      const tx = db.transaction('videos', 'readwrite');
      tx.objectStore('videos').put({ key: sceneId, url: url, ts: Date.now() });
    } catch (e) {
      console.warn('[VideoOrchestrator] cache vidéo', e);
    }
  }

  async function apiFetch(url, options, label, stopSignal) {
    const video = V();
    const maxAttempts = expressMode ? 4 : 7;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (stopSignal && stopSignal.aborted) throw new Error('Arrêt demandé');
      try {
        const res = await fetch(url, options);

        if (res.status === 429) {
          consecutiveSuccess = 0;
          const wait = expressMode
            ? [5, 10, 15, 20][Math.min(attempt, 3)]
            : [10, 20, 30, 45, 60, 90, 120][Math.min(attempt, 6)];
          createIntervalMs = Math.min(
            createIntervalMs + 5000,
            video.createIntervalMax || 90000
          );
          console.warn('[VideoOrchestrator] ' + label + ' 429, attente ' + wait + 's');
          await sleep(wait * 1000);
          continue;
        }

        if (res.status === 503) {
          const wait = expressMode
            ? [2, 4, 6, 10][Math.min(attempt, 3)]
            : [3, 6, 10, 15, 20, 30][Math.min(attempt, 5)];
          await sleep(wait * 1000);
          continue;
        }

        if (res.ok) {
          consecutiveSuccess++;
          const min = video.createIntervalMin || 30000;
          if (consecutiveSuccess >= 2 && createIntervalMs > min) {
            createIntervalMs = Math.max(createIntervalMs - 5000, min);
            consecutiveSuccess = 0;
          }
        }

        return res;
      } catch (e) {
        if (e.message === 'Arrêt demandé') throw e;
        const wait = expressMode
          ? [1, 2, 3, 5][Math.min(attempt, 3)]
          : [2, 4, 6, 10, 15, 20][Math.min(attempt, 5)];
        await sleep(wait * 1000);
      }
    }
    return fetch(url, options);
  }

  async function prepareImageForAgnes(imageDataUri) {
    if (!imageDataUri) throw new Error('Image manquante');
    if (window.ImageGenerator && window.ImageGenerator.compressDataUrl) {
      try {
        return await window.ImageGenerator.compressDataUrl(imageDataUri);
      } catch (e) {
        console.warn('[VideoOrchestrator] compress ignorée', e.message);
      }
    }
    return imageDataUri;
  }

  function shortenMotion(prompt) {
    const p = String(prompt || '');
    if (!expressMode || p.length <= 320) return p;
    return p.slice(0, 320);
  }

  async function createTask(imageDataUri, motionPrompt, durationKey, stopSignal) {
    const key = getAgnesKey();
    if (!key) throw new Error('Clé Agnes manquante');

    const framesMap = V().durations || { '5s': 121, '10s': 241 };
    const clipKey = (durationKey === '5s' || expressMode) ? '5s' : '10s';
    const frames = framesMap[clipKey] || 121;

    const image = await prepareImageForAgnes(imageDataUri);

    const body = {
      model: M().agnes || 'agnes-video-v2.0',
      prompt: shortenMotion(motionPrompt),
      image: image,
      num_frames: frames,
      frame_rate: V().frameRate || 24
    };

    const res = await apiFetch(
      E().agnesVideo,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      },
      'Création',
      stopSignal
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error('HTTP ' + res.status + ' — ' + err.slice(0, 200));
    }

    const data = await res.json();
    const id = data.video_id || data.id || data.task_id;
    if (!id) throw new Error('Pas de video_id');
    return id;
  }

  /** Extrait une URL vidéo depuis les formes de réponse Agnes connues. */
  function extractVideoUrl(d) {
    if (!d || typeof d !== 'object') return null;
    const candidates = [
      d.metadata && d.metadata.url,
      d.metadata && d.metadata.video_url,
      d.url,
      d.video_url,
      d.videoUrl,
      d.result_url,
      d.output && d.output.url,
      d.output && d.output.video_url,
      d.data && d.data.url,
      d.data && d.data.video_url,
      d.data && d.data.metadata && d.data.metadata.url
    ];
    for (let i = 0; i < candidates.length; i++) {
      const u = candidates[i];
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u;
    }
    return null;
  }

  function normalizeStatus(d) {
    const raw = d.status || d.state || (d.data && d.data.status) || 'unknown';
    return String(raw).toLowerCase().trim();
  }

  function readProgress(d) {
    const p = d.progress != null ? d.progress
      : (d.percent != null ? d.percent
        : (d.data && d.data.progress));
    const n = Number(p);
    return isFinite(n) ? n : 0;
  }

  /**
   * Poll Agnes jusqu'à ~12 min.
   * Pas de kill sur stagnation à 30% (comportement fréquent côté serveur).
   * Accepte l'URL dès qu'elle apparaît, même si status pas encore "completed".
   */
  async function poll(videoId, onProgress, stopSignal, durationKey) {
    const video = V();
    const initialDelay = video.pollInitialDelaySec != null ? video.pollInitialDelaySec : 1;
    const maxPollMs = video.maxPollMs || 720000;
    const model = M().agnes || 'agnes-video-v2.0';
    const started = Date.now();
    let lastProgress = 0;

    if (initialDelay > 0) {
      if (onProgress) onProgress('Envoi OK — Agnes démarre…');
      await sleep(Math.round(initialDelay * 1000));
    }

    let attempt = 0;
    while (true) {
      if (stopSignal && stopSignal.aborted) throw new Error('Arrêt demandé');
      if (attempt > 0) {
        const wait = adaptivePollWait(attempt, durationKey);
        await sleep(wait);
      }
      attempt++;

      const elapsed = Date.now() - started;
      const elapsedSec = Math.round(elapsed / 1000);
      if (elapsed > maxPollMs) {
        throw new Error(
          'Agnes non terminé après ' + elapsedSec +
          's (dernier ' + lastProgress +
          '%). Cliquez Reprendre — build ' + ((cfg().BUILD) || '?')
        );
      }

      const url =
        E().agnesPoll +
        '?video_id=' + encodeURIComponent(videoId) +
        '&model_name=' + encodeURIComponent(model);

      let res;
      try {
        res = await apiFetch(
          url,
          { headers: { Authorization: 'Bearer ' + getAgnesKey() } },
          'Polling',
          stopSignal
        );
      } catch (e) {
        if (e.message === 'Arrêt demandé') throw e;
        if (onProgress) onProgress('Réseau… ' + elapsedSec + 's');
        continue;
      }

      if (!res || !res.ok) {
        if (onProgress) onProgress('Poll HTTP ' + (res && res.status) + ' · ' + elapsedSec + 's');
        continue;
      }

      let d;
      try {
        d = await res.json();
      } catch (e) {
        if (onProgress) onProgress('Réponse invalide · ' + elapsedSec + 's');
        continue;
      }

      const status = normalizeStatus(d);
      const progress = readProgress(d);
      if (progress > lastProgress) lastProgress = progress;

      // URL déjà là → succès immédiat (certains status restent "processing")
      const readyUrl = extractVideoUrl(d);
      if (readyUrl && (progress >= 100 || ['completed', 'succeeded', 'done', 'success', 'finished'].indexOf(status) !== -1)) {
        if (onProgress) onProgress('Agnes 100% · ' + elapsedSec + 's');
        return readyUrl;
      }
      if (readyUrl && progress >= 95) {
        if (onProgress) onProgress('Agnes prêt · ' + elapsedSec + 's');
        return readyUrl;
      }

      if (onProgress) {
        onProgress('Agnes ' + progress + '% · ' + elapsedSec + 's · ' + status);
      }

      if (['completed', 'succeeded', 'done', 'success', 'finished'].indexOf(status) !== -1) {
        if (readyUrl) return readyUrl;
        // parfois l'URL arrive 1–2 polls après le status
        continue;
      }
      if (['failed', 'error', 'cancelled', 'canceled'].indexOf(status) !== -1) {
        throw new Error('Échec Agnes (' + status + ')');
      }
    }
  }

  /** Retry uniquement les erreurs réseau / création — PAS les timeouts de poll. */
  async function withRetry(fn, label, onProgress) {
    const maxRetries = expressMode ? 2 : (V().maxRetries || 2);
    const base = expressMode ? 1000 : (V().retryBaseMs || 1500);
    let lastErr;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (e.message === 'Arrêt demandé') throw e;
        if (/Timeout|bloqué/i.test(e.message)) throw e;
        lastErr = e;
        if (i < maxRetries - 1) {
          const wait = base * (i + 1);
          if (onProgress) onProgress(label + ' retry ' + (i + 1) + '…');
          await sleep(wait);
        }
      }
    }
    throw lastErr;
  }

  async function processScene(scene, durationKey, onProgress, stopSignal) {
    if (scene.videoUrl && scene.status === 'video_done') {
      if (onProgress) onProgress({ status: 'video_done', url: scene.videoUrl, resumed: true });
      return scene.videoUrl;
    }

    // Cache IndexedDB
    const cached = await videoCacheGet(scene.id);
    if (cached) {
      scene.videoUrl = cached;
      scene.status = 'video_done';
      console.log('[VideoOrchestrator] cache hit', scene.id);
      if (onProgress) onProgress({ status: 'video_done', url: cached, fromCache: true });
      return cached;
    }

    // Reprise : on a déjà un videoId → reprendre le poll sans recréer
    if (scene.videoId && !scene.videoUrl) {
      scene.status = 'video_polling';
      if (onProgress) onProgress({ status: 'video_polling', message: 'Reprise poll Agnes…' });
      const videoUrl = await poll(
        scene.videoId,
        (msg) => onProgress && onProgress({ status: 'video_polling', message: msg }),
        stopSignal,
        durationKey
      );
      scene.videoUrl = videoUrl;
      scene.status = 'video_done';
      await videoCachePut(scene.id, videoUrl);
      if (onProgress) onProgress({ status: 'video_done', url: videoUrl });
      return videoUrl;
    }

    if (!scene.imageUrl) throw new Error('Image manquante pour la scène ' + scene.index);

    scene.status = 'video_generating';
    if (onProgress) onProgress({ status: 'video_generating', message: 'Envoi Agnes…' });

    const videoId = await withRetry(
      () => createTask(scene.imageUrl, scene.motionPrompt, durationKey, stopSignal),
      'Création',
      (msg) => onProgress && onProgress({ status: 'video_generating', message: msg })
    );

    scene.videoId = videoId;
    scene.status = 'video_polling';
    if (onProgress) {
      onProgress({ status: 'video_polling', message: 'Poll Agnes…', videoId: videoId });
    }

    const videoUrl = await poll(
      videoId,
      (msg) => onProgress && onProgress({ status: 'video_polling', message: msg, videoId: videoId }),
      stopSignal,
      durationKey
    );

    scene.videoUrl = videoUrl;
    scene.status = 'video_done';
    await videoCachePut(scene.id, videoUrl);
    if (onProgress) onProgress({ status: 'video_done', url: videoUrl });
    return videoUrl;
  }

  async function processAll(scenes, durationKey, onSceneProgress, stopSignal) {
    const results = [];
    const pending = scenes.filter((s) => !(s.videoUrl && s.status === 'video_done'));
    const pollingTasks = [];

    createIntervalMs = V().createIntervalMs || 45000;
    consecutiveSuccess = 0;

    for (let i = 0; i < pending.length; i++) {
      if (stopSignal && stopSignal.aborted) break;
      const scene = pending[i];

      try {
        scene.status = 'video_generating';
        if (onSceneProgress) {
          onSceneProgress(scene.id, { status: 'video_generating', message: 'Envoi Agnes…' });
        }

        const videoId = await withRetry(
          () => createTask(scene.imageUrl, scene.motionPrompt, durationKey, stopSignal),
          'Création',
          (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'video_generating', message: msg })
        );

        scene.videoId = videoId;
        scene.status = 'video_polling';
        if (onSceneProgress) {
          onSceneProgress(scene.id, { status: 'video_polling', message: 'Poll Agnes…', videoId: videoId });
        }

        // Pas de withRetry sur le poll (évite double timeout inutile)
        const pollPromise = poll(
          videoId,
          (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'video_polling', message: msg, videoId: videoId }),
          stopSignal,
          durationKey
        ).then((url) => {
          scene.videoUrl = url;
          scene.status = 'video_done';
          results.push({ sceneId: scene.id, url: url });
          if (onSceneProgress) onSceneProgress(scene.id, { status: 'video_done', url: url });
        }).catch((e) => {
          scene.status = 'failed';
          if (onSceneProgress) onSceneProgress(scene.id, { status: 'failed', error: e.message });
        });

        pollingTasks.push(pollPromise);
      } catch (e) {
        scene.status = 'failed';
        if (onSceneProgress) onSceneProgress(scene.id, { status: 'failed', error: e.message });
      }

      if (pending.length > 1 && i < pending.length - 1 && !(stopSignal && stopSignal.aborted)) {
        const waitSec = Math.ceil(createIntervalMs / 1000);
        for (let r = waitSec; r > 0; r--) {
          if (stopSignal && stopSignal.aborted) break;
          if (onSceneProgress) {
            onSceneProgress(pending[i + 1].id, {
              status: 'pending',
              message: "File d'attente — " + r + 's'
            });
          }
          await sleep(1000);
        }
      }
    }

    await Promise.allSettled(pollingTasks);

    scenes.forEach((s) => {
      if (s.videoUrl && s.status === 'video_done' && !results.find((r) => r.sceneId === s.id)) {
        results.push({ sceneId: s.id, url: s.videoUrl });
      }
    });

    return results;
  }

  /**
   * Pipeline express : image → vidéo immédiatement (scène par scène).
   * Pour 1 clip 5s : zéro file d'attente.
   */
  async function processPipeline(scenes, durationKey, characterSeeds, onSceneProgress, stopSignal) {
    setExpressMode(true);
    if (window.ImageGenerator) window.ImageGenerator.setExpressMode(true);

    const results = [];

    for (let i = 0; i < scenes.length; i++) {
      if (stopSignal && stopSignal.aborted) break;
      const scene = scenes[i];

      if (scene.videoUrl && scene.status === 'video_done') {
        results.push({ sceneId: scene.id, url: scene.videoUrl });
        if (onSceneProgress) onSceneProgress(scene.id, { status: 'video_done', url: scene.videoUrl, resumed: true });
        continue;
      }

      try {
        // Reprise après timeout : on a déjà un videoId → poll uniquement
        if (scene.videoId && !scene.videoUrl) {
          if (onSceneProgress) {
            onSceneProgress(scene.id, { status: 'video_polling', message: 'Reprise Agnes…' });
          }
          const url = await processScene(
            scene,
            durationKey,
            (info) => onSceneProgress && onSceneProgress(scene.id, info),
            stopSignal
          );
          results.push({ sceneId: scene.id, url: url });
          continue;
        }

        if (!(scene.imageUrl && (scene.status === 'image_done' || scene.status === 'video_done'))) {
          if (onSceneProgress) onSceneProgress(scene.id, { status: 'generating', message: 'Image turbo…' });
          const data = await window.ImageGenerator.generateImage(
            scene,
            characterSeeds,
            (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'generating', message: msg })
          );
          scene.imageUrl = data;
          scene.status = 'image_done';
          if (onSceneProgress) onSceneProgress(scene.id, { status: 'image_done', data: data });
        }

        if (onSceneProgress) onSceneProgress(scene.id, { status: 'video_generating', message: 'Envoi Agnes…' });
        const url = await processScene(
          scene,
          durationKey,
          (info) => onSceneProgress && onSceneProgress(scene.id, info),
          stopSignal
        );
        results.push({ sceneId: scene.id, url: url });
      } catch (e) {
        scene.status = 'failed';
        if (onSceneProgress) onSceneProgress(scene.id, { status: 'failed', error: e.message });
      }
    }

    return results;
  }

  return {
    createTask: createTask,
    poll: poll,
    processScene: processScene,
    processAll: processAll,
    processPipeline: processPipeline,
    setExpressMode: setExpressMode,
    getCreateIntervalMs: () => createIntervalMs
  };
})();
