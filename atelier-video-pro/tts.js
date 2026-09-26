/* ══════════════════════════════════════════════════════════════════
   TTS — Voix off (Web Speech API)
   Prévisualisation locale. Export fichier limité par le navigateur.
   Alternative documentée : Edge-TTS / Gemini TTS côté serveur.
   ══════════════════════════════════════════════════════════════════ */

window.TTS = (() => {
  const synth = window.speechSynthesis;

  function pickVoice(voiceId) {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    const lang = voiceId && voiceId.startsWith('fr') ? 'fr' : 'en';
    const byLang = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
    const needle = (voiceId || '').split('-').pop() || '';
    const named = byLang.find((v) => v.name.toLowerCase().includes(needle.toLowerCase()));
    return named || byLang[0] || voices[0];
  }

  /**
   * Lit un texte à voix haute (prévisualisation).
   * @returns {Promise<boolean>}
   */
  function speak(text, voiceId, rate) {
    if (!synth) return Promise.reject(new Error('Web Speech non supporté'));

    return new Promise((resolve, reject) => {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = pickVoice(voiceId);
      utterance.rate = rate != null ? rate : 1.0;
      utterance.pitch = 1.0;
      utterance.lang = (voiceId && voiceId.startsWith('fr')) ? 'fr-FR' : 'en-US';
      utterance.onend = () => resolve(true);
      utterance.onerror = (e) => reject(new Error('TTS: ' + (e.error || 'erreur')));
      synth.speak(utterance);
    });
  }

  /** Alias historique — même comportement que speak. */
  function synthesize(text, voiceId, rate, pitch) {
    return speak(text, voiceId, rate);
  }

  function stop() {
    if (synth) synth.cancel();
  }

  function listVoices() {
    return synth ? synth.getVoices() : [];
  }

  /**
   * Construit le texte narratif scène par scène (pour sync future).
   */
  function buildNarrationScript(scenes) {
    return (scenes || []).map((s) => s.rawText).join(' ');
  }

  return {
    synthesize: synthesize,
    speak: speak,
    stop: stop,
    listVoices: listVoices,
    buildNarrationScript: buildNarrationScript
  };
})();
