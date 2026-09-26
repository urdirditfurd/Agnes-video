/* ══════════════════════════════════════════════════════════════════
   API MANAGER — Gestion complète des clés API (UI + validation)
   ══════════════════════════════════════════════════════════════════ */

window.ApiManager = (() => {
  const STORAGE_KEYS = {
    agnes: 'agnes_api_key',
    gemini: 'gemini_api_key',
    deepseek: 'deepseek_api_key',
    stableHorde: 'stable_horde_key'
  };

  const TEST_ENDPOINTS = {
    agnes: () => ({
      url: window.CONFIG.ENDPOINTS.agnesVideo,
      options: {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + getKey('agnes') }
      }
    }),
    gemini: () => ({
      url: window.CONFIG.ENDPOINTS.geminiText + '?key=' + getKey('gemini'),
      options: { method: 'GET' }
    }),
    deepseek: () => ({
      url: window.CONFIG.ENDPOINTS.deepseek + '/models',
      options: {
        headers: { 'Authorization': 'Bearer ' + getKey('deepseek') }
      }
    })
  };

  function getKey(name) {
    try { return (localStorage.getItem(STORAGE_KEYS[name]) || '').trim(); }
    catch (e) { return ''; }
  }

  function setKey(name, value) {
    try {
      if (value && value.trim()) {
        localStorage.setItem(STORAGE_KEYS[name], value.trim());
        return true;
      } else {
        localStorage.removeItem(STORAGE_KEYS[name]);
        return false;
      }
    } catch (e) { return false; }
  }

  function clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  // ── Validation basique du format ────────────────────────────────
  function validateFormat(name, value) {
    if (!value || !value.trim()) return { ok: false, msg: 'Vide' };
    if (name === 'agnes' && !value.startsWith('sk-')) {
      return { ok: false, msg: 'Doit commencer par sk-' };
    }
    if (name === 'gemini' && !value.startsWith('AIza')) {
      return { ok: false, msg: 'Doit commencer par AIza' };
    }
    if (name === 'deepseek' && !value.startsWith('sk-')) {
      return { ok: false, msg: 'Doit commencer par sk-' };
    }
    return { ok: true };
  }

  // ── Test réel de la clé (appel API) ─────────────────────────────
  async function testKey(name) {
    const value = getKey(name);
    if (!value) return { ok: false, msg: 'Clé non configurée' };

    const format = validateFormat(name, value);
    if (!format.ok) return format;

    try {
      const { url, options } = TEST_ENDPOINTS[name]();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      // 401/403 = clé invalide, 404/405 = endpoint OK mais méthode non autorisée
      // (ce qui veut dire que la clé est probablement acceptée)
      if (res.status === 401 || res.status === 403) {
        return { ok: false, msg: 'Clé refusée (HTTP ' + res.status + ')' };
      }
      if (res.status === 404 || res.status === 405 || res.ok || res.status === 400) {
        return { ok: true, msg: 'Clé valide ✓' };
      }
      return { ok: false, msg: 'HTTP ' + res.status };
    } catch (e) {
      if (e.name === 'AbortError') return { ok: false, msg: 'Timeout (10s)' };
      return { ok: false, msg: 'Erreur réseau : ' + e.message };
    }
  }

  // ── Rendu UI : statut ───────────────────────────────────────────
  function updateStatusUI(name, result) {
    const el = document.getElementById('status-' + name);
    if (!el) return;
    el.className = 'api-status';
    if (!result) {
      el.textContent = 'Non configuré';
      el.classList.add('empty');
    } else if (result.ok) {
      el.textContent = result.msg;
      el.classList.add('ok');
    } else {
      el.textContent = '❌ ' + result.msg;
      el.classList.add('error');
    }
  }

  function refreshAllUI() {
    ['agnes', 'gemini', 'deepseek'].forEach(name => {
      const value = getKey(name);
      if (!value) {
        updateStatusUI(name, null);
      } else {
        const format = validateFormat(name, value);
        updateStatusUI(name, format.ok
          ? { ok: true, msg: 'Format valide · ' + value.slice(0, 6) + '…' + value.slice(-4) }
          : format
        );
      }
      const input = document.getElementById('api-key-' + name);
      if (input) input.value = value;
    });
    updateMainButtonState();
  }

  function updateMainButtonState() {
    const btn = document.getElementById('btn-analyze');
    if (!btn) return;
    const hasAgnes = !!getKey('agnes');
    if (!hasAgnes) {
      btn.disabled = true;
      btn.textContent = '🔑 Configurez Agnes AI d\'abord';
    } else {
      btn.disabled = false;
      btn.textContent = 'Analyser le script →';
    }
  }

  // ── Bind des événements ─────────────────────────────────────────
  function bind() {
    // Afficher / masquer les mots de passe
    document.querySelectorAll('[data-toggle-visibility]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleVisibility;
        const input = document.getElementById(id);
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    // Boutons de test
    document.querySelectorAll('[data-test-api]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.testApi;
        const value = document.getElementById('api-key-' + name)?.value.trim();
        if (value) setKey(name, value);
        btn.disabled = true;
        btn.textContent = '…';
        updateStatusUI(name, { ok: false, msg: 'Test en cours…' });
        const result = await testKey(name);
        updateStatusUI(name, result);
        btn.disabled = false;
        btn.textContent = 'Tester';
      });
    });

    // Enregistrer toutes les clés
    document.getElementById('btn-save-keys')?.addEventListener('click', () => {
      const saved = [];
      ['agnes', 'gemini', 'deepseek'].forEach(name => {
        const input = document.getElementById('api-key-' + name);
        if (input) {
          const v = input.value.trim();
          if (v) {
            setKey(name, v);
            saved.push(name);
          }
        }
      });
      refreshAllUI();
      if (window.showToast) window.showToast(saved.length + ' clé(s) enregistrée(s)', 'success');
      else alert(saved.length + ' clé(s) enregistrée(s)');
    });

    // Effacer toutes les clés
    document.getElementById('btn-clear-keys')?.addEventListener('click', () => {
      if (!confirm('Effacer toutes les clés API enregistrées ?')) return;
      clearAll();
      ['agnes', 'gemini', 'deepseek'].forEach(name => {
        const input = document.getElementById('api-key-' + name);
        if (input) input.value = '';
      });
      refreshAllUI();
      if (window.showToast) window.showToast('Clés effacées', 'warn');
    });
  }

  return { getKey, setKey, clearAll, testKey, refreshAllUI, bind, validateFormat };
})();
