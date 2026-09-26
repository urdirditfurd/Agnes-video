/* ══════════════════════════════════════════════════════════════════
   ASSEMBLER — Montage final avec FFmpeg.wasm
   Note : import dynamique CDN requis (pas d'inline local) pour
   charger FFmpeg uniquement au moment du montage.
   ══════════════════════════════════════════════════════════════════ */

window.Assembler = (() => {
  let ffmpeg = null;
  let loaded = false;

  async function loadFFmpeg(onProgress) {
    if (loaded && ffmpeg) return ffmpeg;

    if (onProgress) onProgress('Chargement de FFmpeg.wasm…');

    // Import dynamique CDN — exception documentée (module ESM distant)
    const ffmpegMod = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const utilMod = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

    ffmpeg = new ffmpegMod.FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) onProgress('Montage ' + Math.round(progress * 100) + '%');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await utilMod.toBlobURL(baseURL + '/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await utilMod.toBlobURL(baseURL + '/ffmpeg-core.wasm', 'application/wasm')
    });

    loaded = true;
    return ffmpeg;
  }

  async function fetchAsUint8(url) {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      return new Uint8Array(await res.arrayBuffer());
    }
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Téléchargement clip HTTP ' + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  /**
   * Concatène les clips dans l'ordre narratif.
   * Options : { audioUrl, transition }
   * @returns {Promise<string>} Object URL du MP4 final
   */
  async function assemble(scenes, options, onProgress) {
    const opts = options || {};
    const audioUrl = opts.audioUrl || null;
    const ff = await loadFFmpeg(onProgress);

    if (onProgress) onProgress('Préparation des clips…');
    const completed = (scenes || []).filter((s) => s.videoUrl);
    if (!completed.length) throw new Error('Aucun clip à assembler');

    const inputFiles = [];
    for (let i = 0; i < completed.length; i++) {
      const name = 'clip_' + String(i).padStart(4, '0') + '.mp4';
      try {
        const data = await fetchAsUint8(completed[i].videoUrl);
        await ff.writeFile(name, data);
        inputFiles.push(name);
        if (onProgress) onProgress('Clip ' + (i + 1) + '/' + completed.length + ' prêt');
      } catch (e) {
        console.warn('[Assembler] clip ' + i + ' ignoré :', e.message);
      }
    }

    if (!inputFiles.length) throw new Error('Aucun clip téléchargeable (CORS ?)');

    const listContent = inputFiles.map((f) => "file '" + f + "'").join('\n');
    await ff.writeFile('list.txt', new TextEncoder().encode(listContent));

    if (onProgress) onProgress('Concaténation…');
    await ff.exec([
      '-f', 'concat', '-safe', '0',
      '-i', 'list.txt',
      '-c', 'copy',
      'output_raw.mp4'
    ]);

    let finalFile = 'output_raw.mp4';

    if (audioUrl) {
      if (onProgress) onProgress('Ajout de la piste audio…');
      const audioData = await fetchAsUint8(audioUrl);
      await ff.writeFile('audio.mp3', audioData);
      await ff.exec([
        '-i', 'output_raw.mp4',
        '-i', 'audio.mp3',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'output_final.mp4'
      ]);
      finalFile = 'output_final.mp4';
    }

    if (onProgress) onProgress('Finalisation…');
    const out = await ff.readFile(finalFile);
    const blob = new Blob([out.buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  /**
   * Mode dégradé sans FFmpeg : renvoie le premier clip (preview).
   */
  async function assembleFallback(scenes, onProgress) {
    if (onProgress) onProgress('Mode dégradé (sans FFmpeg)…');
    const completed = (scenes || []).filter((s) => s.videoUrl);
    if (!completed.length) throw new Error('Aucun clip');
    return completed[0].videoUrl;
  }

  async function assembleSafe(scenes, options, onProgress) {
    try {
      return await assemble(scenes, options, onProgress);
    } catch (e) {
      console.warn('[Assembler] FFmpeg échoué, fallback :', e.message);
      if (onProgress) onProgress('FFmpeg indisponible — lecture du premier clip');
      return assembleFallback(scenes, onProgress);
    }
  }

  return {
    assemble: assemble,
    assembleSafe: assembleSafe,
    loadFFmpeg: loadFFmpeg
  };
})();
