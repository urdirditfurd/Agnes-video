/* ══════════════════════════════════════════════════════════════════
   APP — Orchestration UI (4 écrans) + reprise sur erreur
   ══════════════════════════════════════════════════════════════════ */

(function () {
  const state = {
    plan: null,
    characterSeeds: {},
    stopController: null,
    finalVideoUrl: null,
    startedAt: null
  };

  // ── Utilitaires UI ──────────────────────────────────────────────

  function showScreen(n) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById('screen-' + n);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function setStatus(text) {
    const bar = document.getElementById('status-bar');
    const txt = document.getElementById('status-text');
    if (!bar || !txt) return;
    if (text) {
      bar.classList.remove('hidden');
      txt.textContent = text;
    } else {
      bar.classList.add('hidden');
    }
  }

  function toast(message, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast ' + (type || 'success');
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => el.classList.remove('visible'), 2800);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  function clipDurationKey(targetKey) {
    return targetKey === '5s' ? '5s' : '10s';
  }

  // ── Clés API ────────────────────────────────────────────────────

  function refreshApiStatus() {
    const agnes = localStorage.getItem(window.CONFIG.API_KEYS.agnes) || '';
    const gemini = localStorage.getItem(window.CONFIG.API_KEYS.gemini) || '';
    const status = document.getElementById('api-status');
    const agnesInput = document.getElementById('agnes-key');
    const geminiInput = document.getElementById('gemini-key');

    if (agnesInput && !agnesInput.value) agnesInput.placeholder = agnes ? '•••• enregistrée' : 'sk-…';
    if (geminiInput && !geminiInput.value) geminiInput.placeholder = gemini ? '•••• enregistrée' : 'AIza…';

    if (!status) return;
    if (agnes) {
      status.textContent = 'Agnes OK' + (gemini ? ' · Gemini OK' : ' · images via Pollinations');
      status.classList.add('ok');
      document.getElementById('settings').classList.add('ok');
    } else {
      status.textContent = 'Agnes requis pour la vidéo · Pollinations suffit pour les images';
      status.classList.remove('ok');
      document.getElementById('settings').classList.remove('ok');
    }
  }

  document.getElementById('btn-save-keys').addEventListener('click', () => {
    const agnes = document.getElementById('agnes-key').value.trim();
    const gemini = document.getElementById('gemini-key').value.trim();
    if (agnes) localStorage.setItem(window.CONFIG.API_KEYS.agnes, agnes);
    if (gemini) localStorage.setItem(window.CONFIG.API_KEYS.gemini, gemini);
    document.getElementById('agnes-key').value = '';
    document.getElementById('gemini-key').value = '';
    refreshApiStatus();
    toast('Clés enregistrées', 'success');
  });

  document.getElementById('link-settings').addEventListener('click', (e) => {
    e.preventDefault();
    showScreen(1);
    document.getElementById('settings').scrollIntoView({ behavior: 'smooth' });
  });

  // ── Démo ────────────────────────────────────────────────────────

  document.getElementById('btn-demo').addEventListener('click', () => {
    document.getElementById('script-input').value = window.CONFIG.DEMO_SCRIPT;
    // Garde la durée choisie (5s EXPRESS par défaut)
    document.getElementById('style-select').value = 'cinematic';
    toast('Script démo chargé — durée actuelle conservée', 'success');
  });

  // Pré-remplir au démarrage
  document.getElementById('script-input').value = window.CONFIG.DEMO_SCRIPT;

  document.getElementById('btn-preview-tts').addEventListener('click', async () => {
    const text = document.getElementById('script-input').value.slice(0, 280);
    const voice = document.getElementById('voice-select').value;
    try {
      await window.TTS.speak(text, voice, 1);
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // ── Écran 1 → 2 : Analyse ───────────────────────────────────────

  document.getElementById('btn-analyze').addEventListener('click', () => {
    const script = document.getElementById('script-input').value;
    const duration = document.getElementById('duration-select').value;
    const style = document.getElementById('style-select').value;

    try {
      setStatus('Analyse du script…');
      const plan = window.StoryParser.parseStory(script, duration, style);
      state.plan = plan;
      state.characterSeeds = {};

      plan.characters.forEach((c) => {
        const seed = window.CharacterBible.getSeed(c.name);
        state.characterSeeds[c.id] = seed != null ? seed : Math.floor(Math.random() * 1e6);
      });

      window.StateStore.savePlan(plan);
      renderScenePreview();
      updateResumeButton();
      showScreen(2);
      setStatus(null);
      toast(plan.scenes.length + ' scènes · ' + plan.characters.length + ' personnages', 'success');
    } catch (e) {
      toast(e.message, 'error');
      setStatus(null);
    }
  });

  function renderPlanMeta() {
    const meta = state.plan.meta;
    const chars = state.plan.characters.map((c) => c.name).join(', ');
    document.getElementById('plan-meta').innerHTML =
      '<span class="meta-chip">' + meta.actualClips + ' clips</span>' +
      '<span class="meta-chip">' + meta.targetDurationKey + '</span>' +
      '<span class="meta-chip">' + escapeHtml(meta.style) + '</span>' +
      (meta.isLong ? '<span class="meta-chip">' + state.plan.chapters.length + ' chapitres</span>' : '') +
      '<span class="meta-chip">Persos : ' + escapeHtml(chars) + '</span>';
  }

  function renderScenePreview() {
    renderPlanMeta();
    const container = document.getElementById('scenes-preview');
    container.innerHTML = state.plan.scenes.map((s, idx) => `
      <div class="scene-card" data-scene="${s.id}" data-index="${idx}">
        <div class="scene-num">Scène ${s.index} · ${escapeHtml(s.emotion)} · ${escapeHtml(s.shotType)}</div>
        <div class="scene-text">${escapeHtml(s.rawText.slice(0, 140))}${s.rawText.length > 140 ? '…' : ''}</div>
        <div class="scene-meta">${s.estimatedDurationSec}s · transition ${escapeHtml(s.transition)}</div>
        <label class="scene-meta">Prompt image
          <textarea data-field="imagePrompt">${escapeHtml(s.imagePrompt)}</textarea>
        </label>
        <label class="scene-meta">Prompt mouvement
          <textarea data-field="motionPrompt">${escapeHtml(s.motionPrompt)}</textarea>
        </label>
        <div class="card-actions">
          <button type="button" class="secondary btn-move-up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="secondary btn-move-down" ${idx === state.plan.scenes.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('textarea').forEach((ta) => {
      ta.addEventListener('change', () => {
        const card = ta.closest('.scene-card');
        const scene = state.plan.scenes.find((s) => s.id === card.dataset.scene);
        if (!scene) return;
        scene[ta.dataset.field] = ta.value;
        window.StateStore.savePlan(state.plan);
      });
    });

    container.querySelectorAll('.btn-move-up').forEach((btn) => {
      btn.addEventListener('click', () => moveScene(Number(btn.closest('.scene-card').dataset.index), -1));
    });
    container.querySelectorAll('.btn-move-down').forEach((btn) => {
      btn.addEventListener('click', () => moveScene(Number(btn.closest('.scene-card').dataset.index), 1));
    });
  }

  function moveScene(index, delta) {
    const scenes = state.plan.scenes;
    const target = index + delta;
    if (target < 0 || target >= scenes.length) return;
    const tmp = scenes[index];
    scenes[index] = scenes[target];
    scenes[target] = tmp;
    scenes.forEach((s, i) => {
      s.index = i + 1;
      s.previousSceneId = i > 0 ? scenes[i - 1].id : null;
      s.nextSceneId = i < scenes.length - 1 ? scenes[i + 1].id : null;
    });
    window.StateStore.savePlan(state.plan);
    renderScenePreview();
  }

  document.getElementById('btn-back-1').addEventListener('click', () => showScreen(1));

  function updateResumeButton() {
    const progress = window.StateStore.loadProgress();
    const btn = document.getElementById('btn-resume');
    if (!progress || !state.plan) {
      btn.style.display = 'none';
      return;
    }
    const hasPartial = progress.scenes && progress.scenes.some(
      (s) => s.status === 'image_done' || s.status === 'video_done'
    );
    btn.style.display = hasPartial ? 'inline-block' : 'none';
  }

  document.getElementById('btn-resume').addEventListener('click', () => {
    applyProgressToPlan();
    startGeneration(true);
  });

  function applyProgressToPlan() {
    const progress = window.StateStore.loadProgress();
    if (!progress || !state.plan) return;
    const map = {};
    (progress.scenes || []).forEach((s) => { map[s.id] = s; });
    state.plan.scenes.forEach((scene) => {
      const p = map[scene.id];
      if (!p) return;
      scene.status = p.status || scene.status;
      if (p.videoUrl) scene.videoUrl = p.videoUrl;
      if (p.videoId) scene.videoId = p.videoId;
      if (p.retries != null) scene.retries = p.retries;
    });
  }

  // ── Génération ──────────────────────────────────────────────────

  document.getElementById('btn-generate').addEventListener('click', () => startGeneration(false));

  function formatEta(seconds) {
    if (seconds < 60) return Math.round(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m + 'min ' + s + 's';
  }

  async function startGeneration(isResume) {
    if (!state.plan) return;

    const agnesKey = localStorage.getItem(window.CONFIG.API_KEYS.agnes);
    if (!agnesKey) {
      toast('Ajoutez une clé Agnes pour générer les vidéos', 'error');
      showScreen(1);
      document.getElementById('settings').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!isResume) {
      state.plan.scenes.forEach((s) => {
        s.status = 'pending';
        s.imageUrl = null;
        s.videoUrl = null;
        s.videoId = null;
      });
    }

    showScreen(3);
    state.stopController = new AbortController();
    state.startedAt = Date.now();
    renderProgressCards();

    const targetDuration = document.getElementById('duration-select').value;
    const clipKey = clipDurationKey(targetDuration);
    const scenes = state.plan.scenes;
    const total = scenes.length;
    /** Mode EXPRESS : durée 5s ou un seul clip → pipeline turbo ≤60s */
    const express = clipKey === '5s' || (total === 1 && targetDuration === '5s');

    if (window.ImageGenerator) window.ImageGenerator.setExpressMode(express);
    if (window.VideoOrchestrator) window.VideoOrchestrator.setExpressMode(express);

    let imagesDone = scenes.filter((s) => s.imageUrl || s.status === 'image_done' || s.status === 'video_done').length;
    let videosDone = scenes.filter((s) => s.videoUrl || s.status === 'video_done').length;

    let ticker = null;
    let lastAgnesMsg = '';

    function updateGlobal(msg) {
      const progress = ((imagesDone + videosDone) / (total * 2)) * 100;
      document.getElementById('global-bar').style.width = Math.min(100, progress) + '%';
      document.getElementById('global-status').textContent = msg;
      const elapsed = (Date.now() - state.startedAt) / 1000;
      if (express) {
        // Le budget 60s = objectif image+envoi ; Agnes serveur peut prendre plusieurs minutes
        const phase = /Agnes/i.test(msg) || /Agnes/i.test(lastAgnesMsg)
          ? 'Attente serveur Agnes (souvent 1–5 min) · '
          : 'Préparation locale · ';
        document.getElementById('eta-text').textContent =
          phase + Math.round(elapsed) + 's écoulées' + (lastAgnesMsg ? ' · ' + lastAgnesMsg : '');
      } else {
        const done = imagesDone + videosDone;
        const remaining = total * 2 - done;
        if (done > 0 && remaining > 0) {
          document.getElementById('eta-text').textContent = '≈ ' + formatEta((elapsed / done) * remaining) + ' restant';
        } else {
          document.getElementById('eta-text').textContent = '';
        }
      }
    }

    if (express) {
      ticker = setInterval(() => {
        const elapsed = (Date.now() - state.startedAt) / 1000;
        const statusEl = document.getElementById('eta-text');
        if (!statusEl) return;
        const phase = lastAgnesMsg
          ? 'Attente serveur Agnes (souvent 1–5 min) · '
          : 'Préparation locale · ';
        statusEl.textContent =
          phase + Math.round(elapsed) + 's' + (lastAgnesMsg ? ' · ' + lastAgnesMsg : '');
      }, 500);
    }

    try {
      if (express) {
        updateGlobal('Mode EXPRESS — image turbo puis Agnes…');
        await window.VideoOrchestrator.processPipeline(
          scenes,
          clipKey,
          state.characterSeeds,
          (sceneId, info) => {
            updateCard(sceneId, info);
            if (info.status === 'image_done') {
              imagesDone = Math.min(total, imagesDone + 1);
              updateGlobal('Image OK — envoi Agnes…');
              window.StateStore.checkpoint(state.plan);
            }
            if (info.status === 'video_done') {
              videosDone = Math.min(total, videosDone + 1);
              lastAgnesMsg = '';
              updateGlobal('Vidéo prête');
              window.StateStore.checkpoint(state.plan);
            }
            if (info.status === 'failed') {
              window.StateStore.checkpoint(state.plan);
            }
            if (info.status === 'generating' || info.status === 'video_generating' || info.status === 'video_polling') {
              if (info.status === 'video_polling' && info.message) lastAgnesMsg = info.message;
              updateGlobal(info.message || 'En cours…');
              // Sauvegarde videoId dès le début du poll → bouton Reprendre utile
              if (info.status === 'video_polling') window.StateStore.checkpoint(state.plan);
            }
          },
          state.stopController.signal
        );
      } else {
        updateGlobal('Génération des images…');
        await window.ImageGenerator.generateAll(
          scenes,
          state.characterSeeds,
          (sceneId, info) => {
            updateCard(sceneId, info);
            if (info.status === 'image_done') {
              imagesDone++;
              updateGlobal('Images : ' + imagesDone + '/' + total);
              window.StateStore.checkpoint(state.plan);
            }
            if (info.status === 'failed') window.StateStore.checkpoint(state.plan);
          },
          window.CONFIG.IMAGE.maxParallel
        );

        if (state.stopController.signal.aborted) throw new Error('Arrêt demandé');

        updateGlobal('Génération des vidéos Agnes…');
        await window.VideoOrchestrator.processAll(
          scenes,
          clipKey,
          (sceneId, info) => {
            updateCard(sceneId, info);
            if (info.status === 'video_done') {
              videosDone++;
              updateGlobal('Vidéos : ' + videosDone + '/' + total);
              window.StateStore.checkpoint(state.plan);
            }
            if (info.status === 'failed') window.StateStore.checkpoint(state.plan);
          },
          state.stopController.signal
        );
      }

      if (state.stopController.signal.aborted) throw new Error('Arrêt demandé');

      const doneVideos = scenes.filter((s) => s.videoUrl).length;
      if (!doneVideos) throw new Error('Aucun clip vidéo généré');

      updateGlobal(doneVideos === 1 ? 'Finalisation…' : 'Assemblage final…');

      // Pas de TTS en express (gain de temps) ; sinon non bloquant
      if (!express) {
        try {
          const voiceId = document.getElementById('voice-select').value;
          window.TTS.speak(
            window.TTS.buildNarrationScript(scenes).slice(0, 120),
            voiceId,
            1
          ).catch(function () { /* ignore */ });
        } catch (e) { /* ignore */ }
      }

      const finalUrl = await window.Assembler.assembleSafe(
        scenes,
        { audioUrl: null, transition: 'fade' },
        (msg) => updateGlobal(msg)
      );

      state.finalVideoUrl = finalUrl;
      document.getElementById('final-video').src = finalUrl;
      document.getElementById('btn-download').href = finalUrl;

      const elapsed = Math.round((Date.now() - state.startedAt) / 1000);
      updateGlobal('Terminé en ' + elapsed + 's — ' + doneVideos + '/' + total + ' clips');
      window.StateStore.checkpoint(state.plan);
      toast(express ? ('Express terminé en ' + elapsed + 's') : 'Vidéo prête', 'success');
      setTimeout(() => {
        showScreen(4);
        setStatus(null);
      }, 400);
    } catch (e) {
      if (e.message === 'Arrêt demandé') {
        toast('Génération arrêtée — progression sauvegardée', 'success');
        updateResumeButton();
        showScreen(2);
      } else {
        toast(e.message, 'error');
      }
      setStatus(null);
      window.StateStore.checkpoint(state.plan);
    } finally {
      if (ticker) clearInterval(ticker);
      if (window.ImageGenerator) window.ImageGenerator.setExpressMode(false);
      if (window.VideoOrchestrator) window.VideoOrchestrator.setExpressMode(false);
    }
  }

  function renderProgressCards() {
    const container = document.getElementById('scenes-progress');
    container.innerHTML = state.plan.scenes.map((s) => `
      <div class="scene-card" id="card-${s.id}">
        <div class="scene-num">Scène ${s.index}</div>
        <div class="scene-text">${escapeHtml(s.rawText.slice(0, 90))}${s.rawText.length > 90 ? '…' : ''}</div>
        <div class="scene-meta status-text">En attente</div>
      </div>
    `).join('');
  }

  function updateCard(sceneId, info) {
    const card = document.getElementById('card-' + sceneId);
    if (!card) return;
    const status = card.querySelector('.status-text');
    card.classList.remove('generating', 'done', 'failed');

    const generating =
      info.status === 'generating' ||
      info.status === 'video_generating' ||
      info.status === 'video_polling' ||
      info.status === 'pending';

    if (generating) {
      card.classList.add('generating');
      status.textContent = info.message || 'En cours…';
    } else if (info.status === 'image_done') {
      status.textContent = info.resumed ? 'Image (cache)' : 'Image prête';
      if (info.data && !card.querySelector('img')) {
        const img = document.createElement('img');
        img.src = info.data;
        img.alt = 'Scène';
        card.appendChild(img);
      }
    } else if (info.status === 'video_done') {
      card.classList.add('done');
      status.textContent = info.resumed ? 'Vidéo (reprise)' : 'Vidéo prête';
    } else if (info.status === 'failed') {
      card.classList.add('failed');
      status.textContent = 'Échec — ' + (info.error || '');
    }
  }

  document.getElementById('btn-stop').addEventListener('click', () => {
    if (state.stopController) state.stopController.abort();
    window.TTS.stop();
    setStatus('Arrêt demandé…');
  });

  // ── Écran 4 ─────────────────────────────────────────────────────

  document.getElementById('btn-restart').addEventListener('click', () => {
    if (state.finalVideoUrl && state.finalVideoUrl.indexOf('blob:') === 0) {
      URL.revokeObjectURL(state.finalVideoUrl);
    }
    state.plan = null;
    state.finalVideoUrl = null;
    window.StateStore.clear();
    showScreen(1);
  });

  document.getElementById('btn-regen-scene').addEventListener('click', async () => {
    if (!state.plan) return;
    const idx = prompt('Numéro de scène à regénérer (1–' + state.plan.scenes.length + ') :', '1');
    const n = parseInt(idx, 10);
    if (!n || n < 1 || n > state.plan.scenes.length) return;

    const scene = state.plan.scenes[n - 1];
    scene.status = 'pending';
    scene.imageUrl = null;
    scene.videoUrl = null;
    scene.videoId = null;

    showScreen(3);
    state.stopController = new AbortController();
    renderProgressCards();
    document.getElementById('global-status').textContent = 'Regénération scène ' + n + '…';

    try {
      const data = await window.ImageGenerator.generateImage(
        scene,
        state.characterSeeds,
        (msg) => updateCard(scene.id, { status: 'generating', message: msg })
      );
      scene.imageUrl = data;
      scene.status = 'image_done';
      updateCard(scene.id, { status: 'image_done', data: data });

      const clipKey = clipDurationKey(document.getElementById('duration-select').value);
      await window.VideoOrchestrator.processScene(
        scene,
        clipKey,
        (info) => updateCard(scene.id, info),
        state.stopController.signal
      );

      window.StateStore.checkpoint(state.plan);

      const finalUrl = await window.Assembler.assembleSafe(
        state.plan.scenes,
        {},
        (msg) => { document.getElementById('global-status').textContent = msg; }
      );
      state.finalVideoUrl = finalUrl;
      document.getElementById('final-video').src = finalUrl;
      document.getElementById('btn-download').href = finalUrl;
      showScreen(4);
      toast('Scène ' + n + ' regénérée', 'success');
    } catch (e) {
      toast(e.message, 'error');
      showScreen(4);
    }
  });

  // ── Init ────────────────────────────────────────────────────────

  refreshApiStatus();

  // Restaurer un plan précédent si présent
  const saved = window.StateStore.loadPlan();
  if (saved && saved.scenes && saved.scenes.length) {
    state.plan = saved;
    state.characterSeeds = {};
    (saved.characters || []).forEach((c) => {
      const seed = window.CharacterBible.getSeed(c.name);
      state.characterSeeds[c.id] = seed != null ? seed : Math.floor(Math.random() * 1e6);
    });
  }
})();
