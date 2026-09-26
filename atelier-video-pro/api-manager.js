/* ══════════════════════════════════════════════════════════════════
   API MANAGER — Clés, formats, tests (Agnes sans faux négatif CORS)
   ══════════════════════════════════════════════════════════════════ */

window.ApiManager = (() => {
  function log(msg) {
    console.log('[ApiManager]', msg);
  }

  function keyName(name) {
    const keys = (window.CONFIG && window.CONFIG.API_KEYS) || {};
    return keys[name] || null;
  }

  function getKey(name) {
    const kn = keyName(name);
    if (!kn) return '';
    return (localStorage.getItem(kn) || '').trim();
  }

  function setKey(name, value) {
    const kn = keyName(name);
    if (!kn) return false;
    const v = String(value || '').trim();
    if (!v) {
      localStorage.removeItem(kn);
      return true;
    }
    localStorage.setItem(kn, v);
    return true;
  }

  function validateFormat(name, value) {
    const v = String(value || '').trim();
    if (!v) return { ok: false, msg: 'Clé vide' };

    if (name === 'agnes') {
      if (v.length < 12) return { ok: false, msg: 'Clé Agnes trop courte' };
      // sk-… ou autre token long
      return { ok: true, msg: 'Format OK' };
    }
    if (name === 'gemini') {
      if (!/^AIza[0-9A-Za-z_\-]{20,}$/.test(v) && v.length < 20) {
        return { ok: false, msg: 'Format Gemini suspect (AIza…)' };
      }
      return { ok: true, msg: 'Format OK' };
    }
    if (name === 'deepseek') {
      if (v.length < 16) return { ok: false, msg: 'Clé DeepSeek trop courte' };
      return { ok: true, msg: 'Format OK' };
    }
    return { ok: true, msg: 'Format OK' };
  }

  /**
   * Test clé Agnes : POST minimal.
   * 400/422 = clé acceptée (payload incomplet) → OK
   * 401/403 = refusée
   * CORS → on n'affiche pas "invalide" (faux négatif)
   */
  async function testAgnes(value) {
    const endpoints = (window.CONFIG && window.CONFIG.ENDPOINTS) || {};
    const models = (window.CONFIG && window.CONFIG.MODELS) || {};
    try {
      const res = await fetch(endpoints.agnesVideo, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + value,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: models.agnes || 'agnes-video-v2.0',
          prompt: 'test',
          num_frames: 5,
          frame_rate: 24
        })
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, msg: 'Clé refusée (HTTP ' + res.status + ')' };
      }
      if (res.status === 400 || res.status === 422 || res.ok || res.status === 429) {
        return { ok: true, msg: 'Clé valide ✓' };
      }
      return { ok: false, msg: 'HTTP ' + res.status };
    } catch (e) {
      log('Test Agnes CORS/réseau : ' + e.message);
      return { ok: true, msg: 'Clé enregistrée (test CORS ignoré)' };
    }
  }

  async function testGemini(value) {
    const endpoints = (window.CONFIG && window.CONFIG.ENDPOINTS) || {};
    const url = (endpoints.geminiText || '') + '?key=' + encodeURIComponent(value);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 401 || res.status === 403) {
        return { ok: false, msg: 'Clé refusée (HTTP ' + res.status + ')' };
      }
      if (res.ok || res.status === 400 || res.status === 404 || res.status === 405) {
        return { ok: true, msg: 'Clé valide ✓' };
      }
      return { ok: false, msg: 'HTTP ' + res.status };
    } catch (e) {
      if (e.name === 'AbortError') return { ok: false, msg: 'Timeout (10s)' };
      return { ok: true, msg: 'Clé enregistrée (réseau/CORS ignoré)' };
    }
  }

  async function testKey(name) {
    const value = getKey(name);
    if (!value) return { ok: false, msg: 'Clé non configurée' };

    const format = validateFormat(name, value);
    if (!format.ok) return format;

    if (name === 'agnes') return testAgnes(value);
    if (name === 'gemini') return testGemini(value);

    return { ok: true, msg: 'Clé enregistrée' };
  }

  return {
    getKey: getKey,
    setKey: setKey,
    validateFormat: validateFormat,
    testKey: testKey,
    testAgnes: testAgnes
  };
})();
