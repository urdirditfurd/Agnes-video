/* ══════════════════════════════════════════════════════════════════
   STORY PARSER — Analyse & découpage du script
   ══════════════════════════════════════════════════════════════════ */

window.StoryParser = (() => {
  const CONFIG = window.CONFIG?.STORY || {
    chapterThresholdSec: 60,
    clipDurations: { '5s': 5, '10s': 10, '30s': 30, '1min': 60, '5min': 300, '20min': 1200 }
  };

  function uid(prefix='id') {
    return prefix + '_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
  }
  function normalize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function splitSentences(text) {
    return text.replace(/([.!?…]+)\s+/g, '$1\n').split('\n').map(s=>s.trim()).filter(Boolean);
  }
  function countWords(s) { return s.trim().split(/\s+/).filter(Boolean).length; }
  function estimateReadingTime(s) { return Math.round((countWords(s)/150)*60); }

  function detectCharacters(text) {
    const chars = new Map();
    const sentences = splitSentences(text);
    sentences.forEach(sentence => {
      sentence.split(/\s+/).forEach((tok, i) => {
        if (i === 0) return;
        const clean = tok.replace(/[.,;:!?…«»""'']/g,'');
        if (/^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][a-zàâäéèêëîïôöùûüç\-']{1,}$/.test(clean)) {
          if (!chars.has(clean)) {
            chars.set(clean, {
              id: uid('char'), name: clean, aliases: [clean], mentions: 0,
              gender: guessGender(clean),
              visualBible: { age:'adulte', hair:'', eyes:'', clothes:'', bodyType:'', signature:'', styleSeed: Math.floor(Math.random()*1e6) }
            });
          }
          chars.get(clean).mentions++;
        }
      });
    });
    if (chars.size === 0) {
      chars.set('Protagoniste', {
        id: uid('char'), name: 'Protagoniste', aliases: ['il','elle'],
        mentions: 1, gender: 'neutre',
        visualBible: { age:'adulte', hair:'', eyes:'', clothes:'', bodyType:'', signature:'', styleSeed: Math.floor(Math.random()*1e6) }
      });
    }
    return Array.from(chars.values());
  }

  function guessGender(name) {
    const lower = name.toLowerCase();
    if (/[aie]$/.test(lower)) return 'féminin';
    if (/[oe]$/.test(lower)) return 'masculin';
    return 'neutre';
  }

  function detectPlaces(text) {
    const markers = ['dans','sur','sous','devant','derrière','près de','loin de','au bord de','au milieu de'];
    const lower = normalize(text);
    const places = [];
    markers.forEach(m => {
      const re = new RegExp(m + '\\s+([^.,;!?]{2,40})', 'gi');
      let match;
      while ((match = re.exec(lower)) !== null) {
        places.push({ marker: m, raw: match[0].trim() });
      }
    });
    return places;
  }

  function detectTimeMarkers(text) {
    const markers = ['le matin','le soir','la nuit','le jour','l\'aube','soudain','puis','ensuite','plus tard'];
    const lower = normalize(text);
    return markers.filter(m => lower.includes(normalize(m)));
  }

  function detectEmotion(sentence) {
    const lower = normalize(sentence);
    const map = {
      joie: ['sourit','rit','heureux','joie','celebre','danse'],
      tristesse: ['pleure','larme','triste','chagrin','seul'],
      colere: ['crie','furieux','colere','rage','frappe'],
      peur: ['tremble','peur','fuit','angoisse','horreur'],
      amour: ['aime','embrasse','caresse','tendre','coeur'],
      surprise: ['sursaute','stupefait','incroyable','soudain'],
      determination: ['decide','jure','promet','determine'],
      serenite: ['calme','paisible','respire','contemple','medite']
    };
    for (const [emotion, words] of Object.entries(map)) {
      if (words.some(w => lower.includes(w))) return emotion;
    }
    return 'neutre';
  }

  function segmentIntoScenes(text, targetSec = 10) {
    const sentences = splitSentences(text);
    const scenes = [];
    let buffer = '';
    const flush = () => { if (buffer.trim()) { scenes.push(buffer.trim()); buffer = ''; } };

    sentences.forEach((s, i) => {
      const w = countWords(s);
      const isLast = i === sentences.length - 1;
      if (w < 5 && buffer) { buffer += ' ' + s; return; }
      if (w > 40) {
        flush();
        const chunks = s.match(/(.{1,200}?)(?:[.,;!?]|$)/g) || [s];
        chunks.forEach(c => c.trim() && scenes.push(c.trim()));
        return;
      }
      flush();
      buffer = s;
      if (estimateReadingTime(buffer) >= targetSec) flush();
      if (isLast) flush();
    });
    flush();
    return scenes;
  }

  function buildImagePrompt(rawText, characters, places, emotion) {
    const present = characters.filter(c =>
      c.aliases.some(a => normalize(rawText).includes(normalize(a)))
    );
    const parts = [];
    present.forEach(c => {
      const block = window.CharacterBible?.describeBlock(c.name);
      if (block) parts.push(`Character: ${block}`);
    });
    parts.push(`Action: ${rawText}`);
    if (places.length) parts.push(`Location: ${places[0].raw}`);
    parts.push(`Tone: ${emotion}`);
    parts.push('Cinematic portrait 9:16, high detail, coherent character design, no text, no watermark');
    return parts.join('. ');
  }

  function buildMotionPrompt(emotion, shotType) {
    const base = 'Animate this exact image. Preserve subject identity, face, pose, clothing.';
    const emotions = {
      joie: 'Subtle smile, eyes light up, gentle bounce.',
      tristesse: 'Single tear, shoulders drop, slow breath.',
      colere: 'Jaw clench, fists tighten, heavy breath.',
      peur: 'Eyes widen, slight recoil, trembling lip.',
      amour: 'Soft gaze, gentle smile, slight lean.',
      surprise: 'Head tilt, eyes wide, mouth slightly open.',
      determination: 'Chin lifts, eyes lock, subtle lean forward.',
      serenite: 'Slow breath, eyes close gently, stillness.',
      neutre: 'Subtle breathing, micro head movements.'
    };
    const shots = {
      close: 'Slow dolly-in, intimate.',
      medium: 'Gentle handheld, breathing camera.',
      wide: 'Slow parallax, environment depth.'
    };
    return [base, emotions[emotion] || emotions.neutre, shots[shotType] || shots.medium].join(' ');
  }

  function suggestTransition(prev, next) {
    if (prev.emotion === next.emotion) return 'morph';
    if (prev.emotion === 'neutre' || next.emotion === 'neutre') return 'cut';
    return 'fade';
  }

  function buildScene(rawText, index, characters, previousScene) {
    const places = detectPlaces(rawText);
    const times = detectTimeMarkers(rawText);
    const emotion = detectEmotion(rawText);
    const lower = normalize(rawText);
    const present = characters.filter(c => c.aliases.some(a => lower.includes(normalize(a)))).map(c => c.id);
    if (!present.length && characters.length) present.push(characters[0].id);

    let shotType = 'medium';
    if (emotion === 'amour' || emotion === 'tristesse') shotType = 'close';
    else if (places.length) shotType = 'wide';

    return {
      id: uid('scene'), index: index + 1,
      rawText, wordCount: countWords(rawText),
      estimatedDurationSec: Math.max(3, Math.min(15, estimateReadingTime(rawText))),
      characters: present,
      location: places.length ? places[0].raw : '',
      timeMarkers: times, emotion, shotType,
      imagePrompt: buildImagePrompt(rawText, characters, places, emotion),
      motionPrompt: buildMotionPrompt(emotion, shotType),
      previousSceneId: previousScene ? previousScene.id : null,
      nextSceneId: null,
      transition: previousScene ? suggestTransition(previousScene, { emotion }) : 'fade_in',
      status: 'pending', imageUrl: null, videoUrl: null, retries: 0
    };
  }

  function enrichScene(baseText, i) {
    const enrich = [
      'La lumière change imperceptiblement.',
      'Un souffle de vent traverse la scène.',
      'Le silence s\'installe, chargé de sens.',
      'Un reflet passe sur une surface proche.',
      'L\'air semble plus dense, comme avant un orage.'
    ];
    return baseText + ' ' + enrich[i % enrich.length];
  }

  function mergeShortScenes(scenes, targetCount) {
    const merged = [];
    const ratio = scenes.length / targetCount;
    let i = 0;
    while (i < scenes.length) {
      const step = Math.max(1, Math.round(ratio));
      merged.push(scenes.slice(i, i + step).join(' '));
      i += step;
    }
    while (merged.length > targetCount) {
      const last = merged.pop();
      merged[merged.length - 1] += ' ' + last;
    }
    return merged;
  }

  function buildChapters(scenes) {
    const size = 5;
    const chapters = [];
    for (let i = 0; i < scenes.length; i += size) {
      const slice = scenes.slice(i, i + size);
      chapters.push({
        id: uid('chapter'),
        index: chapters.length + 1,
        title: `Chapitre ${chapters.length + 1}`,
        sceneIds: slice.map(s => s.id),
        estimatedDurationSec: slice.reduce((a, s) => a + s.estimatedDurationSec, 0)
      });
    }
    return chapters;
  }

  function parseStory(scriptText, targetDurationKey = '1min') {
    if (!scriptText || scriptText.trim().length < 10) throw new Error('Script trop court');
    const targetSec = CONFIG.clipDurations[targetDurationKey] || 60;
    const clipSec = 10;
    const targetClips = Math.max(1, Math.round(targetSec / clipSec));

    const characters = detectCharacters(scriptText);
    characters.forEach(c => window.CharacterBible?.upsert({
      name: c.name, id: c.id, gender: c.gender,
      age: c.visualBible.age, hair: c.visualBible.hair,
      eyes: c.visualBible.eyes, clothes: c.visualBible.clothes,
      bodyType: c.visualBible.bodyType, signature: c.visualBible.signature
    }));

    let scenes = segmentIntoScenes(scriptText, clipSec);

    if (scenes.length < targetClips) {
      const missing = targetClips - scenes.length;
      for (let i = 0; i < missing; i++) scenes.push(enrichScene(scenes[i % scenes.length], i));
    } else if (scenes.length > targetClips) {
      scenes = mergeShortScenes(scenes, targetClips);
    }

    const structured = [];
    let prev = null;
    scenes.forEach((raw, i) => {
      const scene = buildScene(raw, i, characters, prev);
      if (prev) prev.nextSceneId = scene.id;
      structured.push(scene);
      prev = scene;
    });

    const isLong = targetSec > CONFIG.chapterThresholdSec;
    const chapters = isLong ? buildChapters(structured) : [];

    return {
      meta: {
        scriptLength: scriptText.length, wordCount: countWords(scriptText),
        targetDurationKey, targetDurationSec: targetSec,
        clipDurationSec: clipSec, targetClips, actualClips: structured.length,
        isLong, generatedAt: new Date().toISOString()
      },
      characters, scenes: structured, chapters
    };
  }

  return { parseStory, detectCharacters };
})();
