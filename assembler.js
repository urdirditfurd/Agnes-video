/* ══════════════════════════════════════════════════════════════════
   ASSEMBLER — Montage final avec FFmpeg.wasm
   ══════════════════════════════════════════════════════════════════ */

window.Assembler = (() => {
  let ffmpeg = null;
  let loaded = false;

  async function loadFFmpeg(onProgress) {
    if (loaded) return ffmpeg;

    onProgress?.('Chargement de FFmpeg.wasm…');
    const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ffmpeg.on('progress', ({ progress }) => onProgress?.(`Montage ${Math.round(progress*100)}%`));

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
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
    return new Uint8Array(await res.arrayBuffer());
  }

  async function assemble(scenes, options = {}, onProgress) {
    const { audioUrl = null, transition = 'fade' } = options;
    const ff = await loadFFmpeg(onProgress);

    onProgress?.('Préparation des clips…');
    const completed = scenes.filter(s => s.videoUrl);
    if (!completed.length) throw new Error('Aucun clip à assembler');

    const inputFiles = [];
    for (let i = 0; i < completed.length; i++) {
      const name = `clip_${String(i).padStart(4,'0')}.mp4`;
      const data = await fetchAsUint8(completed[i].videoUrl);
      await ff.writeFile(name, data);
      inputFiles.push(name);
      onProgress?.(`Clip ${i+1}/${completed.length} prêt`);
    }

    const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
    await ff.writeFile('list.txt', new TextEncoder().encode(listContent));

    onProgress?.('Concaténation…');
    await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output_raw.mp4']);

    let finalFile = 'output_raw.mp4';
    if (audioUrl) {
      onProgress?.('Ajout de la piste audio…');
      const audioData = await fetchAsUint8(audioUrl);
      await ff.writeFile('audio.mp3', audioData);
      await ff.exec([
        '-i', 'output_raw.mp4', '-i', 'audio.mp3',
        '-c:v', 'copy', '-c:a', 'aac', '-shortest',
        'output_final.mp4'
      ]);
      finalFile = 'output_final.mp4';
    }

    onProgress?.('Finalisation…');
    const out = await ff.readFile(finalFile);
    const blob = new Blob([out.buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  return { assemble, loadFFmpeg };
})();
