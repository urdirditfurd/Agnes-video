/* ══════════════════════════════════════════════════════════════════
   STATE STORE — Persistance plan + progression (localStorage)
   Permet de reprendre une génération interrompue.
   ══════════════════════════════════════════════════════════════════ */

window.StateStore = (() => {
  function keys() {
    const s = (window.CONFIG && window.CONFIG.STORAGE) || {};
    return {
      plan: s.planKey || 'avp_story_plan',
      progress: s.progressKey || 'avp_generation_progress'
    };
  }

  function savePlan(plan) {
    try {
      // Ne stocke pas les data-URI géantes dans localStorage (quota)
      const slim = JSON.parse(JSON.stringify(plan));
      slim.scenes = slim.scenes.map((sc) => {
        const copy = Object.assign({}, sc);
        if (copy.imageUrl && copy.imageUrl.indexOf('data:') === 0) {
          copy.imageCached = true;
          copy.imageUrl = null;
        }
        return copy;
      });
      localStorage.setItem(keys().plan, JSON.stringify(slim));
    } catch (e) {
      console.warn('[StateStore] savePlan', e);
    }
  }

  function loadPlan() {
    try {
      const raw = localStorage.getItem(keys().plan);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(keys().progress, JSON.stringify(progress));
    } catch (e) {
      console.warn('[StateStore] saveProgress', e);
    }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(keys().progress);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** Sauvegarde légère après chaque clip (statuts + URLs vidéo distantes). */
  function checkpoint(plan) {
    try {
      const snapshot = {
        ts: new Date().toISOString(),
        scenes: (plan.scenes || []).map((s) => ({
          id: s.id,
          status: s.status,
          videoUrl: s.videoUrl,
          videoId: s.videoId,
          imageCached: !!(s.imageUrl || s.imageCached),
          retries: s.retries || 0
        }))
      };
      saveProgress(snapshot);
      savePlan(plan);
    } catch (e) {
      console.warn('[StateStore] checkpoint', e);
    }
  }

  function clear() {
    localStorage.removeItem(keys().plan);
    localStorage.removeItem(keys().progress);
  }

  return {
    savePlan: savePlan,
    loadPlan: loadPlan,
    saveProgress: saveProgress,
    loadProgress: loadProgress,
    checkpoint: checkpoint,
    clear: clear
  };
})();
