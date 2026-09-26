/* ══════════════════════════════════════════════════════════════════
   APP — Orchestration générale + UI
   ══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // TOAST — Feedback visuel global
  // ═══════════════════════════════════════════════════════════════
  window.showToast = function(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  };

  // ═══════════════════════════════════════════════════════════════
  // ÉTAT GLOBAL
  // ═══════════════════════════════════════════════════════════════
  const state = {
    plan: null,
    characterSeeds: {},
    stopController: null,
    finalVideoUrl: null
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILITAIRES UI
  // ═══════════════════════════════════════════════════════════════
  function showScreen(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + n).classList.add('active');
    window.scrollTo(0, 0);
  }

  function setStatus(text) {
    const bar = document.getElementById('status-bar');
    const txt = document.getElementById('status-text');
    if (!bar || !txt) return;
    if (text) { bar.classList.remove('hidden'); txt.textContent = text; }
    else bar.classList.add('hidden');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
    ));
  }

  // ═══════════════════════════════════════════════════════════════
  // ESTIMATION DU NOMBRE DE CLIPS EN TEMPS RÉEL
  // ═══════════════════════════════════════════════════════════════
  function updateClipCountPreview() {
    const durationKey = document.getElementById('duration-select')?.value;
    const clipKey = document.getElementById('clip-duration-select')?.value || '10s';
    if (!durationKey) return;

    const totalSec = window.CONFIG.STORY.clipDurations[durationKey] || 60;
    const clipSec = window.CONFIG.STORY.clipDurations[clipKey] || 10;
    const count = Math.max(1, Math.round(totalSec / clipSec));

    const el = document.getElementById('clip-count-value');
    if (el) el.textContent = count + ' clip' + (count > 1 ? 's' : '');

    const label = document.querySelector('#clip-count-preview');
    if (label) {
      label.innerHTML = '📊 Estimation : <strong id="clip-count-value">' +
        count + ' clip' + (count > 1 ? 's' : '') + '</strong> seront générés (' +
        clipSec + 's par clip).';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ÉCRAN 1 → 2 : ANALYSE DU SCRIPT
  // ═══════════════════════════════════════════════════════════════
  document.getElementById('btn-analyze')?.addEventListener('click', () => {
    const script = document.getElementById('script-input').value;
    const duration = document.getElementById('duration-select').value;
    const style = document.getElementById('style-select').value;
    const globalPrompt = document.getElementById('global-prompt')?.value.trim() || '';

    if (!script || script.trim().length < 10) {
      window.showToast('Le script est trop court', 'error');
      return;
    }

    // Vérifier qu'Agnes est configuré (les images peuvent utiliser Pollinations en fallback)
    const hasAgnes = window.ApiManager?.getKey('agnes');
    if (!hasAgnes) {
      window.showToast('🔑 Configurez votre clé Agnes AI d\'abord', 'error');
      return;
    }

    try {
      setStatus('Analyse du script…');

      // 1. Parse le script
      const plan = window.StoryParser.parseStory(script, duration);

      // 2. Injecte le style global
      plan.scenes.forEach(s => {
        s.imagePrompt = '[Style: ' + style + '] ' + s.imagePrompt;
      });

      // 3. Injecte le prompt global additionnel
      if (globalPrompt) {
        plan.scenes.forEach(s => {
          s.imagePrompt += '. Additional direction: ' + globalPrompt;
          s.motionPrompt += '. ' + globalPrompt;
        });
      }

      // 4. Stocke le plan
      state.plan = plan;
      state.characterSeeds = {};
      plan.characters.forEach(c => {
        state.characterSeeds[c.id] = window.CharacterBible.getSeed(c.name)
          || Math.floor(Math.random() * 1e6);
      });

      renderScenePreview();
      showScreen(2);
      setStatus(null);

      window.showToast(plan.scenes.length + ' scènes détectées', 'success');
    } catch (e) {
      console.error(e);
      window.showToast('Erreur : ' + e.message, 'error');
      setStatus(null);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ÉCRAN 2 : PRÉVISUALISATION DES SCÈNES
  // ═══════════════════════════════════════════════════════════════
  function renderScenePreview() {
    const container = document.getElementById('scenes-preview');
    if (!container || !state.plan) return;

    container.innerHTML = state.plan.scenes.map(s => `
      <div class="scene-card" data-scene="${s.id}">
        <div class="scene-num">Scène ${s.index} · ${s.emotion} · ${s.shotType}</div>
        <div class="scene-text">${escapeHtml(s.rawText.slice(0, 120))}${s.rawText.length > 120 ? '…' : ''}</div>
        <div class="scene-meta">${s.estimatedDurationSec}s · ${s.transition}</div>
      </div>
    `).join('');
  }

  document.getElementById('btn-back-1')?.addEventListener('click', () => showScreen(1));

  // ═══════════════════════════════════════════════════════════════
  // ÉCRAN 2 → 3 : GÉNÉRATION COMPLÈTE
  // ═══════════════════════════════════════════════════════════════
  document.getElementById('btn-generate')?.addEventListener('click', async () => {
    if (!state.plan) {
      window.showToast('Aucun plan à générer', 'error');
      return;
    }

    showScreen(3);
    state.stopController = new AbortController();
    renderProgressCards();

    // ⚠️ Utiliser clip-duration-select, pas duration-select
    const clipDuration = document.getElementById('clip-duration-select')?.value || '10s';
    const voiceId = document.getElementById('voice-select')?.value;

    const scenes = state.plan.scenes;
    const total = scenes.length;
    let imagesDone = 0, videosDone = 0;

    function updateGlobal(msg) {
      const progress = ((imagesDone + videosDone) / Math.max(1, total * 2)) * 100;
      const bar = document.getElementById('global-bar');
      const st = document.getElementById('global-status');
      if (bar) bar.style.width = progress + '%';
      if (st) st.textContent = msg;
    }

    const startTime = Date.now();

    try {
      // ── PHASE 1 : IMAGES ────────────────────────────────────────
      updateGlobal('Génération des images…');
      await window.ImageGenerator.generateAll(
        scenes,
        state.characterSeeds,
        (sceneId, info) => {
          updateCard(sceneId, info);
          if (info.status === 'image_done') {
            imagesDone++;
            updateGlobal('Images : ' + imagesDone + '/' + total);
          }
        },
        3
      );

      if (state.stopController.signal.aborted) throw new Error('Arrêt demandé');

      // ── PHASE 2 : VIDÉOS ────────────────────────────────────────
      updateGlobal('Génération des vidéos…');
      await window.VideoOrchestrator.processAll(
        scenes,
        clipDuration,
        (sceneId, info) => {
          updateCard(sceneId, info);
          if (info.status === 'video_done') {
            videosDone++;
            updateGlobal('Vidéos : ' + videosDone + '/' + total);
          }
        },
        state.stopController.signal
      );

      if (state.stopController.signal.aborted) throw new Error('Arrêt demandé');

      // ── PHASE 3 : ASSEMBLAGE ────────────────────────────────────
      updateGlobal('Assemblage final…');
      const finalUrl = await window.Assembler.assemble(
        scenes,
        { audioUrl: null },
        (msg) => updateGlobal(msg)
      );

      state.finalVideoUrl = finalUrl;
      document.getElementById('final-video').src = finalUrl;
      document.getElementById('btn-download').href = finalUrl;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      updateGlobal('✦ Terminé en ' + elapsed + 's ✦');
      window.showToast('Vidéo générée avec succès !', 'success');

      setTimeout(() => { showScreen(4); setStatus(null); }, 1000);

    } catch (e) {
      console.error(e);
      if (e.message === 'Arrêt demandé') {
        window.showToast('Génération arrêtée', 'warn');
      } else {
        window.showToast('Erreur : ' + e.message, 'error');
      }
      setStatus(null);
      // Retour à l'écran 2 pour permettre de relancer
      setTimeout(() => showScreen(2), 800);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // CARTES DE PROGRESSION
  // ═══════════════════════════════════════════════════════════════
  function renderProgressCards() {
    const container = document.getElementById('scenes-progress');
    if (!container || !state.plan) return;

    container.innerHTML = state.plan.scenes.map(s => `
      <div class="scene-card" id="card-${s.id}">
        <div class="scene-num">Scène ${s.index}</div>
        <div class="scene-text">${escapeHtml(s.rawText.slice(0, 80))}…</div>
        <div class="scene-meta status-text">En attente</div>
      </div>
    `).join('');
  }

  function updateCard(sceneId, info) {
    const card = document.getElementById('card-' + sceneId);
    if (!card) return;
    const status = card.querySelector('.status-text');
    if (!status) return;

    card.classList.remove('generating', 'done', 'failed');

    if (info.status === 'generating' || info.status === 'video_generating' || info.status === 'video_polling') {
      card.classList.add('generating');
      status.textContent = info.message || 'En cours…';
    } else if (info.status === 'image_done') {
      status.textContent = '🖼 Image prête';
      if (info.data && !card.querySelector('img')) {
        const img = document.createElement('img');
        img.src = info.data;
        card.appendChild(img);
      }
    } else if (info.status === 'video_done') {
      card.classList.add('done');
      status.textContent = '✅ Vidéo prête';
    } else if (info.status === 'failed') {
      card.classList.add('failed');
      status.textContent = '❌ ' + (info.error || 'Échec');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ARRÊT / REDÉMARRAGE
  // ═══════════════════════════════════════════════════════════════
  document.getElementById('btn-stop')?.addEventListener('click', () => {
    state.stopController?.abort();
    setStatus('Arrêt demandé…');
    window.showToast('Arrêt en cours…', 'warn');
    setTimeout(() => { showScreen(2); setStatus(null); }, 800);
  });

  document.getElementById('btn-restart')?.addEventListener('click', () => {
    if (state.finalVideoUrl) URL.revokeObjectURL(state.finalVideoUrl);
    state.plan = null;
    state.finalVideoUrl = null;
    showScreen(1);
    window.showToast('Prêt pour une nouvelle vidéo', 'success');
  });

  // ═══════════════════════════════════════════════════════════════
  // VÉRIFICATION DES CLÉS API AU DÉMARRAGE
  // ═══════════════════════════════════════════════════════════════
  function checkApiKeys() {
    const hasAgnes = window.ApiManager?.getKey('agnes');
    if (!hasAgnes) {
      setStatus('🔑 Configurez votre clé Agnes AI pour commencer');
      setTimeout(() => setStatus(null), 5000);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Gestionnaire API
    if (window.ApiManager) {
      window.ApiManager.bind();
      window.ApiManager.refreshAllUI();
    }

    // Listeners du compteur de clips
    document.getElementById('duration-select')?.addEventListener('change', updateClipCountPreview);
    document.getElementById('clip-duration-select')?.addEventListener('change', updateClipCountPreview);
    updateClipCountPreview();

    // Vérification des clés
    checkApiKeys();

    console.log('[Atelier Vidéo Pro] Prêt.');
  }

  // Lancement quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
