/* ══════════════════════════════════════════════════════════════════
   ASSEMBLER — Montage FFmpeg.wasm + fallback robuste
   Nécessite parfois crossOriginIsolated (COOP/COEP) pour SharedArrayBuffer.
   ══════════════════════════════════════════════════════════════════ */

window.Assembler = (() => {
  let ffmpeg = null;
  let loaded = false;

  async function loadFFmpeg(onProgress) {
    if (loaded && ffmpeg) return ffmpeg;

    try {
      if (onProgress) onProgress('Chargement de FFmpeg.wasm…');

      if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
        console.warn('[FFmpeg] crossOriginIsolated=false — SharedArrayBuffer peut échouer');
      }

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
      console.log('[FFmpeg] Chargé');
      return ffmpeg;
    } catch (e) {
      console.error('[FFmpeg] Échec chargement :', e);
      throw new Error("FFmpeg.wasm n'a pas pu charger (connexion / isolation navigateur)");
    }
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

  async function assemble(scenes, options, onProgress) {
    const opts = options || {};
    const audioUrl = opts.audioUrl || null;
    const completed = (scenes || []).filter((s) => s.videoUrl);
    if (!completed.length) throw new Error('Aucun clip à assembler');

    if (completed.length === 1 && !audioUrl) {
      if (onProgress) onProgress("Clip unique — pas d'assemblage nécessaire");
      return completed[0].videoUrl;
    }

    const ff = await loadFFmpeg(onProgress);
    if (onProgress) onProgress('Préparation des clips…');

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
    if (inputFiles.length === 1 && !audioUrl) {
      // Un seul clip récupéré → pas besoin de concat
      const single = await ff.readFile(inputFiles[0]);
      return URL.createObjectURL(new Blob([single.buffer], { type: 'video/mp4' }));
    }

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
      try {
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
      } catch (e) {
        console.warn('[Assembler] audio ignoré :', e.message);
      }
    }

    if (onProgress) onProgress('Finalisation…');
    const out = await ff.readFile(finalFile);
    return URL.createObjectURL(new Blob([out.buffer], { type: 'video/mp4' }));
  }

  async function assembleFallback(scenes, onProgress) {
    if (onProgress) onProgress('Mode dégradé (sans FFmpeg)…');
    const completed = (scenes || []).filter((s) => s.videoUrl);
    if (!completed.length) throw new Error('Aucun clip');
    // Si plusieurs clips : on renvoie le premier (lecteur) — ZIP non dispo ici
    if (completed.length > 1 && onProgress) {
      onProgress(completed.length + ' clips — FFmpeg KO, lecture du 1er');
    }
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
