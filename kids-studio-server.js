/**
 * Kids Story Studio — API assemblage FFmpeg (VPS)
 * Support : concat en blocs, étirement des clips courts, chapitrage.
 * Déployer vers /opt/kids-studio/server.js puis: pm2 restart kids-studio
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');

const OUTPUTS_DIR = '/opt/kids-studio/outputs';
const UPLOADS_DIR = '/opt/kids-studio/uploads';
const PUBLIC_DIR = '/opt/kids-studio/public';
const OUTPUT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BLOCK_SIZE = 10;
const SHORT_CLIP_SEC = 9;
const STRETCH_FACTOR = 1.15; // ~9s → ~10.3s

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.use('/outputs', express.static(OUTPUTS_DIR, {
    maxAge: '1d',
    setHeaders(res, filePath) {
        if (filePath.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

app.use('/studio', express.static(PUBLIC_DIR, { index: 'studio.html' }));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'studio.html')));
app.get('/studio.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'studio.html')));

const API_KEY = process.env.API_KEY || 'kids-studio-secret-change-me';

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { error: 'Trop de requetes, reessayez dans une heure' }
});
app.use('/assemble', limiter);

app.use((req, res, next) => {
    if (req.path.startsWith('/outputs')) return next();
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Cle API invalide' });
    }
    next();
});

app.get('/health', (req, res) => {
    const payload = { status: 'ok', time: new Date().toISOString(), features: ['block-assemble', 'short-stretch'] };
    const accept = String(req.get('Accept') || req.headers.accept || '');
    if (accept.includes('text/html') || accept.includes('application/xhtml')) {
        res.status(200).set('Content-Type', 'text/html; charset=utf-8').end(
            '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            + '<meta http-equiv="refresh" content="0;url=/studio.html">'
            + '<title>Redirection Kids Story Studio</title></head><body>'
            + '<p><a href="/studio.html">Ouvrir Kids Story Studio</a></p></body></html>'
        );
        return;
    }
    res.json(payload);
});

app.post('/assemble', async (req, res) => {
    const {
        videos,
        musicDataUrl,
        musicVolume,
        blockSize,
        chapterTitles,
        stretchShortClips
    } = req.body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({ error: 'Aucune video fournie' });
    }

    const jobId = uuidv4().slice(0, 8);
    const jobDir = path.join(UPLOADS_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

    const startTime = Date.now();
    const size = Math.max(1, Math.min(30, parseInt(blockSize, 10) || DEFAULT_BLOCK_SIZE));
    const doStretch = stretchShortClips !== false;
    console.log('[' + jobId + '] Demarrage : ' + videos.length + ' videos, blocs de ' + size);

    try {
        console.log('[' + jobId + '] Telechargement...');
        await Promise.all(videos.map((url, i) =>
            downloadFile(url, path.join(jobDir, 'scene_' + String(i).padStart(3, '0') + '.mp4'))
                .catch(err => {
                    console.error('[' + jobId + '] Echec scene ' + i + ' : ' + err.message);
                    return null;
                })
        ));

        let sceneFiles = fs.readdirSync(jobDir)
            .filter(f => f.startsWith('scene_') && f.endsWith('.mp4'))
            .sort();

        if (sceneFiles.length === 0) {
            throw new Error('Aucune video n a pu etre telechargee');
        }
        console.log('[' + jobId + '] ' + sceneFiles.length + '/' + videos.length + ' scenes OK');

        // Étirement doux des clips trop courts (< 9s)
        if (doStretch) {
            for (let i = 0; i < sceneFiles.length; i++) {
                const src = path.join(jobDir, sceneFiles[i]);
                const dur = await probeDuration(src);
                if (dur != null && dur > 0 && dur < SHORT_CLIP_SEC) {
                    const stretched = path.join(jobDir, 'stretch_' + sceneFiles[i]);
                    console.log('[' + jobId + '] Stretch scene ' + i + ' (' + dur.toFixed(1) + 's × ' + STRETCH_FACTOR + ')');
                    try {
                        await runFFmpeg([
                            '-i', src,
                            '-filter_complex',
                            '[0:v]setpts=' + STRETCH_FACTOR + '*PTS[v];[0:a]atempo=' + (1 / STRETCH_FACTOR).toFixed(3) + '[a]',
                            '-map', '[v]',
                            '-map', '[a]',
                            '-c:v', 'libx264',
                            '-preset', 'veryfast',
                            '-crf', '23',
                            '-c:a', 'aac',
                            '-b:a', '128k',
                            '-movflags', '+faststart',
                            stretched
                        ]);
                        fs.renameSync(stretched, src);
                    } catch (stretchErr) {
                        console.error('[' + jobId + '] Stretch echoue scene ' + i + ' : ' + stretchErr.message);
                        try { fs.unlinkSync(stretched); } catch (e) { /* ignore */ }
                    }
                }
            }
        }

        // Assemblage par blocs
        const blockFiles = [];
        const chapters = [];
        let chapterCursorSec = 0;
        const totalBlocks = Math.ceil(sceneFiles.length / size);

        for (let b = 0; b < totalBlocks; b++) {
            const slice = sceneFiles.slice(b * size, (b + 1) * size);
            const blockList = path.join(jobDir, 'block_' + b + '.txt');
            fs.writeFileSync(blockList, slice.map(f => "file '" + path.join(jobDir, f) + "'").join('\n'));
            const blockOut = path.join(jobDir, 'block_' + String(b).padStart(2, '0') + '.mp4');
            console.log('[' + jobId + '] Bloc ' + (b + 1) + '/' + totalBlocks + ' (scenes ' + (b * size + 1) + '-' + (b * size + slice.length) + ')');

            await runFFmpeg([
                '-f', 'concat',
                '-safe', '0',
                '-i', blockList,
                '-c', 'copy',
                '-movflags', '+faststart',
                blockOut
            ]);
            blockFiles.push(blockOut);

            const titleFromClient = Array.isArray(chapterTitles) && chapterTitles[b]
                ? String(chapterTitles[b]).slice(0, 80)
                : defaultChapterTitle(b, totalBlocks);
            chapters.push({ start: Math.round(chapterCursorSec), title: titleFromClient });
            const blockDur = await probeDuration(blockOut);
            chapterCursorSec += blockDur || (slice.length * 10);
        }

        // Concat des blocs
        const blocksList = path.join(jobDir, 'blocks.txt');
        fs.writeFileSync(blocksList, blockFiles.map(f => "file '" + f + "'").join('\n'));
        const concatenatedFile = path.join(jobDir, 'concatenated.mp4');
        await runFFmpeg([
            '-f', 'concat',
            '-safe', '0',
            '-i', blocksList,
            '-c', 'copy',
            '-movflags', '+faststart',
            concatenatedFile
        ]);

        let finalFile = concatenatedFile;

        if (musicDataUrl && musicDataUrl.length > 100) {
            console.log('[' + jobId + '] Ajout musique...');
            const musicFile = path.join(jobDir, 'music.mp3');
            const base64Data = musicDataUrl.replace(/^data:audio\/[\w.+-]+;base64,/, '');
            fs.writeFileSync(musicFile, Buffer.from(base64Data, 'base64'));
            const withMusic = path.join(jobDir, 'with_music.mp4');
            const vol = typeof musicVolume === 'number' ? musicVolume : 0.2;
            try {
                await runFFmpeg([
                    '-i', concatenatedFile,
                    '-stream_loop', '-1',
                    '-i', musicFile,
                    '-filter_complex',
                    '[1:a]volume=' + vol + '[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]',
                    '-map', '0:v',
                    '-map', '[aout]',
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    '-shortest',
                    '-movflags', '+faststart',
                    withMusic
                ]);
                finalFile = withMusic;
            } catch (musicErr) {
                console.error('[' + jobId + '] Mix musique echoue : ' + musicErr.message);
            }
        }

        const outputFile = path.join(OUTPUTS_DIR, jobId + '.mp4');
        fs.copyFileSync(finalFile, outputFile);
        fs.rmSync(jobDir, { recursive: true, force: true });

        const stats = fs.statSync(outputFile);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('[' + jobId + '] Termine en ' + elapsed + 's - ' + (stats.size / 1024 / 1024).toFixed(2) + ' Mo');

        res.json({
            success: true,
            jobId: jobId,
            url: '/outputs/' + jobId + '.mp4',
            size: stats.size,
            scenes: sceneFiles.length,
            blocks: totalBlocks,
            chapters: chapters,
            duration: elapsed,
            retentionDays: 7
        });
    } catch (error) {
        console.error('[' + jobId + '] ' + error.message);
        try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
        res.status(500).json({ error: error.message });
    }
});

function defaultChapterTitle(blockIndex, totalBlocks) {
    if (blockIndex === 0) return 'Introduction';
    if (blockIndex === totalBlocks - 1) return 'Finale';
    if (blockIndex === 1) return 'La rencontre';
    if (blockIndex === 2) return "L'aventure commence";
    return 'Chapitre ' + (blockIndex + 1);
}

function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', ['-y'].concat(args));
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error('FFmpeg code ' + code + ' : ' + stderr.slice(-500)));
        });
        proc.on('error', reject);
    });
}

function probeDuration(filePath) {
    return new Promise((resolve) => {
        const proc = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]);
        let out = '';
        proc.stdout.on('data', d => { out += d.toString(); });
        proc.on('close', () => {
            const n = parseFloat(out.trim());
            resolve(Number.isFinite(n) ? n : null);
        });
        proc.on('error', () => resolve(null));
    });
}

function downloadFile(url, dest, maxRedirects) {
    if (maxRedirects === undefined) maxRedirects = 5;
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) return reject(new Error('Trop de redirections'));
        const client = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        const request = client.get(url, {
            headers: { 'User-Agent': 'KidsStudio/1.0' },
            timeout: 120000
        }, (response) => {
            if ([301, 302, 303, 307, 308].indexOf(response.statusCode) !== -1) {
                file.close();
                fs.unlink(dest, () => {});
                const location = response.headers.location;
                if (!location) return reject(new Error('Redirect sans Location'));
                return downloadFile(location, dest, maxRedirects - 1).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error('HTTP ' + response.statusCode + ' pour ' + url.slice(0, 80)));
            }
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        });
        request.on('error', (err) => {
            file.close();
            fs.unlink(dest, () => {});
            reject(err);
        });
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout telechargement'));
        });
    });
}

function cleanupOldOutputs() {
    if (!fs.existsSync(OUTPUTS_DIR)) return;
    const now = Date.now();
    let cleaned = 0;
    fs.readdirSync(OUTPUTS_DIR).forEach(f => {
        if (!f.endsWith('.mp4')) return;
        const filePath = path.join(OUTPUTS_DIR, f);
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > OUTPUT_RETENTION_MS) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        } catch (e) { /* ignore */ }
    });
    if (cleaned > 0) console.log('Nettoyage : ' + cleaned + ' film(s)');
}

setInterval(cleanupOldOutputs, CLEANUP_INTERVAL_MS);

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Kids Studio API demarre sur le port ' + PORT);
    console.log('Outputs : ' + OUTPUTS_DIR + ' (retention 7 jours, blocs + stretch)');
    cleanupOldOutputs();
});
