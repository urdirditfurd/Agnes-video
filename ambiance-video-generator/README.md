# Ambiance Video Generator

Image + clé **Agnes IA** → clip ambiance (caméra fixe) → boucle **3&nbsp;h** locale (FFmpeg.wasm) → MP4.

Le projet (image + audio + clé) est **mémorisé en local** (IndexedDB). La **veille flux** sonde Agnes en continu et lance vidéo + montage dès qu’un canal se libère.

## Utilisation

1. Place image + audio dans `bande-son/` (voir `bande-son/README.md`)
2. Lance `demarrer.bat` / `demarrer.sh` → http://127.0.0.1:8765/
3. Vérifie le **prompt automne cozy** (éditable) — vapeur, feuilles, micro-vie capybara, caméra fixe
4. Colle ta clé Agnes (`sk-…`)
5. **Veille flux jusqu’à succès** (recommandé) — sondage actif jusqu’au 1er canal libre
6. Ou uploade manuellement si tu n’utilises pas le dossier `bande-son/`

## Veille flux (pas d’heure fixe)

Agnes n’expose pas d’API « file libre ». Le signal, c’est la réponse de `POST /v1/videos` :
- `503` / `No available channel` → saturé, on re-sonde
- `200` + `video_id` → canal libre → poll + montage 3h **immédiatement**

En rythme **Rapide** (défaut) :
- sonde toutes les **3–6&nbsp;s**
- en parallèle sur Flash / 2.5 / v2.0 (1er canal qui accepte gagne)
- précharge FFmpeg pendant l’attente pour enchaîner le montage sans délai
- jusqu’à **24&nbsp;h**, reprise auto si tu recharges la page

Laisse l’onglet ouvert (PC allumé, navigateur non suspendu).

## Pourquoi les 503 / CORS ?

Saturation côté Agnes + en `file://` les hébergeurs publics échouent souvent. Contournements :
- veille flux rapide
- stratégie **v2.0** (base64)
- ouvrir via `demarrer.bat` / `demarrer.sh` pour Flash/2.5

## Technique

- Create : `POST https://apihub.agnes-ai.com/v1/videos`
- Poll : `GET https://apihub.agnes-ai.com/agnesapi?video_id=…&model_name=…`
- Prompt : `NO camera movement, NO zoom, NO pan`
- FFmpeg.wasm (unpkg) + boucle 3h en `-c:v copy`
- Mémoire projet : IndexedDB `ambiance-video-generator`
