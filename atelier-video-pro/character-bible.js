/* ══════════════════════════════════════════════════════════════════
   CHARACTER BIBLE — Verrouille l'identité visuelle des personnages
   Seed fixe + description réinjectée dans CHAQUE prompt image.
   ══════════════════════════════════════════════════════════════════ */

window.CharacterBible = (() => {
  const STORAGE_KEY = 'avp_character_bible';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function save(bible) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bible));
    } catch (e) {
      console.warn('[CharacterBible] sauvegarde impossible', e);
    }
  }

  /**
   * Crée ou met à jour la bible visuelle d'un personnage.
   * Le styleSeed est figé à la première création (cohérence image).
   */
  function upsert(character) {
    const bible = load();
    const existing = bible[character.name] || {};

    bible[character.name] = {
      id: existing.id || character.id || ('char_' + Date.now().toString(36)),
      name: character.name,
      gender: character.gender || existing.gender || 'neutre',
      age: character.age || existing.age || 'adulte',
      hair: character.hair || existing.hair || '',
      eyes: character.eyes || existing.eyes || '',
      clothes: character.clothes || existing.clothes || '',
      bodyType: character.bodyType || existing.bodyType || '',
      signature: character.signature || existing.signature || '',
      styleSeed: existing.styleSeed != null
        ? existing.styleSeed
        : (character.styleSeed != null
          ? character.styleSeed
          : Math.floor(Math.random() * 1e6)),
      updatedAt: new Date().toISOString()
    };

    save(bible);
    return bible[character.name];
  }

  /** Bloc compact à injecter dans un prompt image. */
  function describeBlock(name) {
    const bible = load();
    const c = bible[name];
    if (!c) return '';

    const parts = [
      c.name,
      c.gender !== 'neutre' ? c.gender : '',
      c.age,
      c.hair ? 'cheveux ' + c.hair : '',
      c.eyes ? 'yeux ' + c.eyes : '',
      c.clothes ? 'vêtements: ' + c.clothes : '',
      c.bodyType ? 'corpulence: ' + c.bodyType : '',
      c.signature ? 'signature: ' + c.signature : ''
    ].filter(Boolean);

    return parts.join(', ');
  }

  function getSeed(name) {
    const bible = load();
    return bible[name] ? bible[name].styleSeed : null;
  }

  function getById(id) {
    return all().find((c) => c.id === id) || null;
  }

  function all() {
    return Object.values(load());
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { upsert, describeBlock, getSeed, getById, all, clear, load, save };
})();
