/* ══════════════════════════════════════════════════════════════════
   CHARACTER BIBLE — Verrouille l'identité visuelle des personnages
   ══════════════════════════════════════════════════════════════════ */

window.CharacterBible = (() => {
  const STORAGE_KEY = 'avp_character_bible';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function save(bible) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bible)); } catch (e) {}
  }

  function upsert(character) {
    const bible = load();
    const existing = bible[character.name] || {};

    bible[character.name] = {
      id: existing.id || character.id,
      name: character.name,
      gender: character.gender || existing.gender || 'neutre',
      age: character.age || existing.age || 'adulte',
      hair: character.hair || existing.hair || '',
      eyes: character.eyes || existing.eyes || '',
      clothes: character.clothes || existing.clothes || '',
      bodyType: character.bodyType || existing.bodyType || '',
      signature: character.signature || existing.signature || '',
      styleSeed: existing.styleSeed || Math.floor(Math.random() * 1e6),
      updatedAt: new Date().toISOString()
    };

    save(bible);
    return bible[character.name];
  }

  function describeBlock(name) {
    const bible = load();
    const c = bible[name];
    if (!c) return '';

    const parts = [
      c.name,
      c.gender !== 'neutre' ? c.gender : '',
      c.age,
      c.hair ? `cheveux ${c.hair}` : '',
      c.eyes ? `yeux ${c.eyes}` : '',
      c.clothes ? `vêtements: ${c.clothes}` : '',
      c.bodyType ? `corpulence: ${c.bodyType}` : '',
      c.signature ? `signature: ${c.signature}` : ''
    ].filter(Boolean);

    return parts.join(', ');
  }

  function getSeed(name) {
    const bible = load();
    return bible[name]?.styleSeed || null;
  }

  function all() { return Object.values(load()); }

  function clear() { localStorage.removeItem(STORAGE_KEY); }

  return { upsert, describeBlock, getSeed, all, clear, load, save };
})();
