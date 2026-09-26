/* ══════════════════════════════════════════════════════════════════
   TTS — Voix off gratuite (Web Speech API)
   ══════════════════════════════════════════════════════════════════ */

window.TTS = (() => {
  const synth = window.speechSynthesis;

  async function synthesize(text, voiceId, rate = 1.0, pitch = 1.0) {
    if (!synth) throw new Error('Web Speech non supporté');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = synth.getVoices().find(v => v.name.includes(voiceId.split('-')[1])) || null;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = voiceId.startsWith('fr') ? 'fr-FR' : 'en-US';

    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve(true);
      utterance.onerror = (e) => reject(new Error('TTS: ' + e.error));
      synth.speak(utterance);
    });
  }

  function speak(text, voiceId, rate = 1.0) {
    return synthesize(text, voiceId, rate);
  }

  function stop() {
    synth?.cancel();
  }

  function listVoices() {
    return synth?.getVoices() || [];
  }

  return { synthesize, speak, stop, listVoices };
})();
