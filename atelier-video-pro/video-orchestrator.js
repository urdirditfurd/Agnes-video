/* ══════════════════════════════════════════════════════════════════
   VIDEO ORCHESTRATOR — Queue Agnes + parallélisation + retry
   Réutilise la logique rate-limit de Agnes.html (intervalle ~62s).
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

  let createIntervalMs = V().createIntervalMs || 62000;
  let consecutiveSuccess = 0;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getAgnesKey() {
    const keyName = (cfg().API_KEYS && cfg().API_KEYS.agnes) || 'agnes_api_key';
    return (localStorage.getItem(keyName) || '').trim();
  }

  /** Fetch avec gestion 429 / 503 (comme Atelier Vidéo original). */
  async function apiFetch(url, options, label, stopSignal) {
    const video = V();
    for (let attempt = 0; attempt < 7; attempt++) {
      if (stopSignal && stopSignal.aborted) throw new Error('Arrêt demandé');
      try {
        const res = await fetch(url, options);

        if (res.status === 429) {
          consecutiveSuccess = 0;
          const safe = video.createIntervalSafe || 75000;
          const max = video.createIntervalMax || 90000;
          if (createIntervalMs < safe) {
            createIntervalMs = Math.min(createIntervalMs + 8000, max);
          }
          const wait = [15, 30, 45, 60, 90, 120, 180][Math.min(attempt, 6)];
          console.warn('[VideoOrchestrator] ' + label + ' 429, attente ' + wait + 's');
          await sleep(wait * 1000);
          continue;
        }

        if (res.status === 503) {
          const wait = [5, 10, 15, 20, 30, 45][Math.min(attempt, 5)];
          await sleep(wait * 1000);
          continue;
        }

        if (res.ok) {
          consecutiveSuccess++;
          const min = video.createIntervalMin || 62000;
          if (consecutiveSuccess >= 3 && createIntervalMs > min) {
            createIntervalMs = Math.max(createIntervalMs - 4000, min);
            consecutiveSuccess = 0;
          }
        }

        return res;
      } catch (e) {
        if (e.message === 'Arrêt demandé') throw e;
        const wait = [3, 5, 8, 12, 20, 30][Math.min(attempt, 5)];
        await sleep(wait * 1000);
      }
    }
    return fetch(url, options);
  }

  async function createTask(imageDataUri, motionPrompt, durationKey, stopSignal) {
    const key = getAgnesKey();
    if (!key) throw new Error('Clé Agnes manquante');

    const framesMap = V().durations || { '5s': 121, '10s': 241 };
    // Pour durées cibles longues, chaque clip reste 5s ou 10s
    const clipKey = (durationKey === '5s') ? '5s' : '10s';
    const frames = framesMap[clipKey] || 241;

    const body = {
      model: M().agnes || 'agnes-video-v2.0',
      prompt: motionPrompt,
      image: imageDataUri,
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

  async function poll(videoId, onProgress, stopSignal) {
    const pollSec = V().pollIntervalSec || 8;
    const maxAttempts = V().maxPollAttempts || 100;
    const model = M().agnes || 'agnes-video-v2.0';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (stopSignal && stopSignal.aborted) throw new Error('Arrêt demandé');
      await sleep(pollSec * 1000);

      const url =
        E().agnesPoll +
        '?video_id=' + encodeURIComponent(videoId) +
        '&model_name=' + encodeURIComponent(model);

      const res = await apiFetch(
        url,
        { headers: { Authorization: 'Bearer ' + getAgnesKey() } },
        'Polling',
        stopSignal
      );

      const d = await res.json();
      const status = d.status || 'unknown';
      if (onProgress) onProgress('Création — ' + (d.progress || 0) + '%');

      if (['completed', 'succeeded', 'done'].indexOf(status) !== -1) {
        const videoUrl = (d.metadata && d.metadata.url) || d.url || (d.output && d.output.url);
        if (!videoUrl) throw new Error("Terminé mais pas d'URL");
        return videoUrl;
      }
      if (['failed', 'error', 'cancelled'].indexOf(status) !== -1) {
        throw new Error('Échec (' + status + ')');
      }
    }
    throw new Error('Timeout polling');
  }

  async function withRetry(fn, label, onProgress) {
    const maxRetries = V().maxRetries || 3;
    const base = V().retryBaseMs || 4000;
    let lastErr;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (e.message === 'Arrêt demandé') throw e;
        lastErr = e;
        const wait = base * Math.pow(2, i);
        if (onProgress) onProgress(label + ' — retry ' + (i + 1) + '/' + maxRetries + ' dans ' + (wait / 1000) + 's');
        await sleep(wait);
      }
    }
    throw lastErr;
  }

  async function processScene(scene, durationKey, onProgress, stopSignal) {
    // Reprise : déjà fait
    if (scene.videoUrl && scene.status === 'video_done') {
      if (onProgress) onProgress({ status: 'video_done', url: scene.videoUrl, resumed: true });
      return scene.videoUrl;
    }

    if (!scene.imageUrl) throw new Error('Image manquante pour la scène ' + scene.index);

    scene.status = 'video_generating';
    if (onProgress) onProgress({ status: 'video_generating', message: 'Création…' });

    const videoId = await withRetry(
      () => createTask(scene.imageUrl, scene.motionPrompt, durationKey, stopSignal),
      'Création',
      (msg) => onProgress && onProgress({ status: 'video_generating', message: msg })
    );

    scene.videoId = videoId;
    scene.status = 'video_polling';

    const videoUrl = await withRetry(
      () => poll(
        videoId,
        (msg) => onProgress && onProgress({ status: 'video_polling', message: msg }),
        stopSignal
      ),
      'Polling',
      (msg) => onProgress && onProgress({ status: 'video_polling', message: msg })
    );

    scene.videoUrl = videoUrl;
    scene.status = 'video_done';
    if (onProgress) onProgress({ status: 'video_done', url: videoUrl });
    return videoUrl;
  }

  /**
   * Traitement avec limite de concurrence + espacement des créations.
   * Les créations Agnes sont sérialisées (rate-limit), le polling est parallèle.
   */
  async function processAll(scenes, durationKey, onSceneProgress, stopSignal) {
    const results = [];
    const pending = scenes.filter((s) => !(s.videoUrl && s.status === 'video_done'));
    const pollingTasks = [];

    createIntervalMs = V().createIntervalMs || 62000;
    consecutiveSuccess = 0;

    for (let i = 0; i < pending.length; i++) {
      if (stopSignal && stopSignal.aborted) break;
      const scene = pending[i];

      try {
        scene.status = 'video_generating';
        if (onSceneProgress) onSceneProgress(scene.id, { status: 'video_generating', message: 'Création…' });

        const videoId = await withRetry(
          () => createTask(scene.imageUrl, scene.motionPrompt, durationKey, stopSignal),
          'Création',
          (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'video_generating', message: msg })
        );

        scene.videoId = videoId;
        scene.status = 'video_polling';

        const pollPromise = withRetry(
          () => poll(
            videoId,
            (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'video_polling', message: msg }),
            stopSignal
          ),
          'Polling',
          (msg) => onSceneProgress && onSceneProgress(scene.id, { status: 'video_polling', message: msg })
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

      // Espacement entre créations (rate-limit Agnes)
      if (i < pending.length - 1 && !(stopSignal && stopSignal.aborted)) {
        const waitSec = Math.ceil(createIntervalMs / 1000);
        for (let r = waitSec; r > 0; r--) {
          if (stopSignal && stopSignal.aborted) break;
          if (onSceneProgress) {
            onSceneProgress(pending[i + 1].id, {
              status: 'pending',
              message: 'File d\'attente — ' + r + 's'
            });
          }
          await sleep(1000);
        }
      }
    }

    await Promise.allSettled(pollingTasks);

    // Scènes déjà reprises
    scenes.forEach((s) => {
      if (s.videoUrl && s.status === 'video_done' && !results.find((r) => r.sceneId === s.id)) {
        results.push({ sceneId: s.id, url: s.videoUrl });
      }
    });

    return results;
  }

  return {
    createTask: createTask,
    poll: poll,
    processScene: processScene,
    processAll: processAll,
    getCreateIntervalMs: () => createIntervalMs
  };
})();
