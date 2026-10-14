# Ambiance Video Generator

Image + clé **Agnes IA** → clip ambiance (caméra fixe) → boucle **3&nbsp;h** locale (FFmpeg.wasm) → MP4.

## Utilisation

1. Ouvre `index.html`
2. Uploade une image (+ musique optionnelle)
3. Colle ta clé Agnes (`sk-…`)
4. Choisis la stratégie de file (Auto recommandé)
5. Clique **Générer** — en cas de 503, l’app colle les files jusqu’à ~20&nbsp;min

## Pourquoi les 503 ?

Agnes renvoie `HTTP 503` / `video_queue_full` quand **leur file d’inférence est pleine**.  
Il n’existe **pas** d’API « priorité » pour sauter la queue.

Ce que fait l’app à la place :
- enchaîne plusieurs files : `agnes-video-2.5-flash` → `agnes-video-2.5` → `agnes-video-v2.0`
- recolle la file toutes les 25–55&nbsp;s pendant ~20&nbsp;min
- pour 2.5/Flash : mode `keyframe` + URL publique de l’image

## Technique

- Create : `POST https://apihub.agnes-ai.com/v1/videos`
- Poll : `GET https://apihub.agnes-ai.com/agnesapi?video_id=…&model_name=…`
- Prompt : `NO camera movement, NO zoom, NO pan`
- FFmpeg.wasm (unpkg) + boucle 3h en `-c:v copy`
