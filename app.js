// Initialisation du gestionnaire API
window.ApiManager.bind();
window.ApiManager.refreshAllUI();

/* ══════════════════════════════════════════════════════════════════
   APP — Orchestration générale + UI
   ══════════════════════════════════════════════════════════════════ */

(function() {
  const state = {
    plan: null,
    characterSeeds: {},
    stopController: null,
    finalVideoUrl: null
  };

  function showScreen(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + n).classList.add('active');
    window.scrollTo(0, 0);
  }

  function setStatus(text) {
    const bar = document.getElementById('status-bar');
    const txt = document.getElementById('status-text');
    if (text) { bar.classList.remove('hidden'); txt.textContent = text; }
    else bar.classList.add('hidden');
  }

  document.getElementById('btn-analyze').addEventListener('click', () => {
    const script = document.getElementById('script-input').value;
    const duration = document.getElementById('duration-select').value;
    const style = document.getElementById('style-select').value;
     const globalPrompt = document.getElementById('global-prompt')?.value.trim() || '';
// ... après plan.scenes.forEach(...) :
if (globalPrompt) {
  plan.scenes.forEach(s => {
    s.imagePrompt += '. Additional direction: ' + globalPrompt;
    s.motionPrompt += '. ' + globalPrompt;
  });
}

    try {
      setStatus('Analyse du script…');
      const plan = window.StoryParser.parseStory(script, duration);

      plan.scenes.forEach(s => {
        s.imagePrompt = `[Style: ${style}] ` + s.imagePrompt;
      });

      state.plan = plan;
      state.characterSeeds = {};
      plan.characters.forEach(c => {
        state.characterSeeds[c.id] = window.CharacterBible.getSeed(c.name) || Math.floor(Math.random()*1e6);
      });

      renderScenePreview();
      showScreen(2);
      setStatus(null);
    } catch (e) {
      alert('Erreur : ' + e.message);
      setStatus(null);
    }
  });

  function renderScenePreview() {
    const container = document.getElementById('scenes-preview');
    container.innerHTML = state.plan.scenes.map(s => `
      <div class="scene-card" data-scene="${s.id}">
        <div class="scene-num">Scène ${s.index} · ${s.emotion} · ${s.shotType}</div>
        <div class="scene-text">${escapeHtml(s.rawText.slice(0, 120))}${s.rawText.length > 120 ? '…' : ''}</div>
        <div class="scene-meta">${s.estimatedDurationSec}s · ${s.transition}</div>
      </div>
    `).join('');
  }

  document.getElementById('btn-back-1').addEventListener('click', () => showScreen(1));

  document.getElementById('btn-generate').addEventListener('click', async () => {
    showScreen(3);
    state.stopController = new AbortController();
    renderProgressCards();

    const duration = document.getElementById('duration-select').value;
    const voiceId = document.getElementById('voice-select').value;
    const scenes = state.plan.scenes;
    const total = scenes.length;
    let imagesDone = 0, videosDone = 0;

    function updateGlobal(msg) {
      const progress = ((imagesDone + videosDone) / (total * 2)) * 100;
      document.getElementById('global-bar').style.width = progress + '%';
      document.getElementById('global-status').textContent = msg;
    }

    try {
      updateGlobal('Génération des images…');
      await window.ImageGenerator.generateAll(
        scenes, state.characterSeeds,
        (sceneId, info) => {
          updateCard(sceneId, info);
          if (info.status === 'image_done') {
            imagesDone++;
            updateGlobal(`Images : ${imagesDone}/${total}`);
          }
        },
        3
      );

      updateGlobal('Génération des vidéos…');
      await window.VideoOrchestrator.processAll(
        scenes, duration,
        (sceneId, info) => {
          updateCard(sceneId, info);
          if (info.status === 'video_done') {
            videosDone++;
            updateGlobal(`Vidéos : ${videosDone}/${total}`);
          }
        },
        state.stopController.signal
      );

      updateGlobal('Assemblage final…');
      const finalUrl = await window.Assembler.assemble(
        scenes, { audioUrl: null },
        (msg) => updateGlobal(msg)
      );

      state.finalVideoUrl = finalUrl;
      document.getElementById('final-video').src = finalUrl;
      document.getElementById('btn-download').href = finalUrl;

      updateGlobal('✦ Terminé ✦');
      setTimeout(() => { showScreen(4); setStatus(null); }, 1000);

    } catch (e) {
      alert('Erreur : ' + e.message);
      setStatus(null);
    }
  });

  function renderProgressCards() {
    const container = document.getElementById('scenes-progress');
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

    card.classList.remove('generating','done','failed');

    if (info.status === 'generating' || info.status === 'video_generating' || info.status === 'video_polling') {
      card.classList.add('generating');
      status.textContent = info.message || 'En cours…';
    } else if (info.status === 'image_done') {
      status.textContent = '🖼 Image prête';
      if (info.data) {
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

  document.getElementById('btn-stop').addEventListener('click', () => {
    state.stopController?.abort();
    setStatus('Arrêt demandé…');
    setTimeout(() => { showScreen(2); setStatus(null); }, 800);
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    if (state.finalVideoUrl) URL.revokeObjectURL(state.finalVideoUrl);
    state.plan = null;
    state.finalVideoUrl = null;
    showScreen(1);
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
    ));
  }

  function checkApiKeys() {
  const hasAgnes = !!window.ApiManager.getKey('agnes');
  if (!hasAgnes) {
    // Affiche un message dans la barre de statut mais ne bloque pas
    setStatus('🔑 Configurez votre clé Agnes AI pour commencer');
    setTimeout(() => setStatus(null), 5000);
  }
}
    }
  }

  checkApiKeys();
})();
function updateClipCountPreview() {
  const durationKey = document.getElementById('duration-select').value;
  const clipKey = document.getElementById('clip-duration-select').value;
  const totalSec = window.CONFIG.STORY.clipDurations[durationKey] || 60;
  const clipSec = window.CONFIG.STORY.clipDurations[clipKey] || 10;
  const count = Math.max(1, Math.round(totalSec / clipSec));
  const el = document.getElementById('clip-count-value');
  if (el) el.textContent = count + ' clip' + (count > 1 ? 's' : '');
}

document.getElementById('duration-select')?.addEventListener('change', updateClipCountPreview);
document.getElementById('clip-duration-select')?.addEventListener('change', updateClipCountPreview);
updateClipCountPreview();
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
