# Ambiance Video Generator

Image + clé **Agnes IA** → clip ambiance (caméra fixe) → boucle **3&nbsp;h** locale (FFmpeg.wasm) → MP4.

Le projet (image + audio + clé) est **mémorisé en local** (IndexedDB). Tu peux laisser l’onglet ouvert la nuit et lancer la génération quand Agnes n’est plus saturé.

## Utilisation

1. Ouvre `index.html` (idéalement via `demarrer.bat` / `demarrer.sh` — pas en `file://` si tu veux Flash/2.5)
2. Uploade une image (+ musique optionnelle) — sauvegardées automatiquement
3. Colle ta clé Agnes (`sk-…`)
4. Choisis la stratégie de file (Auto recommandé ; **v2.0** si tu es en `file://`)
5. Soit **Générer maintenant** (~20&nbsp;min de collage intensif), soit **Surveiller jusqu’à succès** (jusqu’à 12&nbsp;h, retries espacés)
6. Optionnel : programme le démarrage à **03:00** (hors pic)

## Mode Surveiller (recommandé si 503)

Agnes renvoie `HTTP 503` / `No available channel` quand **leur file d’inférence est pleine**. Il n’existe **pas** d’API « priorité ».

Ce que fait le mode Surveiller :
- mémorise image + audio + clé en IndexedDB
- attend l’heure choisie (ex. 03:00) puis recolle la file toutes les 1,5–3&nbsp;min jusqu’à 12&nbsp;h
- reprend auto si tu recharges la page pendant la surveillance
- tente de garder l’écran éveillé (`wakeLock`) + notification quand c’est prêt

Laisse l’onglet ouvert (PC allumé, navigateur non suspendu).

## Pourquoi les 503 ?

Saturation côté Agnes — pas un bug de l’app. Contournements :
- enchaîne plusieurs files : `agnes-video-2.5-flash` → `agnes-video-2.5` → `agnes-video-v2.0`
- mode Surveiller / lancement à 3h
- en `file://`, les hébergeurs publics (litterbox/catbox/tmpfiles) échouent en CORS → utilise **v2.0** (base64)

## Technique

- Create : `POST https://apihub.agnes-ai.com/v1/videos`
- Poll : `GET https://apihub.agnes-ai.com/agnesapi?video_id=…&model_name=…`
- Prompt : `NO camera movement, NO zoom, NO pan`
- FFmpeg.wasm (unpkg) + boucle 3h en `-c:v copy`
- Mémoire projet : IndexedDB `ambiance-video-generator`
