# Ambiance Video Generator — Automne cozy 3h

Image (ex. capybara onsen) + bande-son → Agnes IA (caméra fixe) → **MP4 3&nbsp;h YouTube**.

## Plan d’animation (prompt par défaut)

- Vapeur fine qui monte du bain
- Ondulations d’eau + feuilles d’érable flottantes
- Feuilles qui tombent en arrière-plan
- Micro-clignement / micro-mouvement de tête du capybara
- **Caméra verrouillée** (pas de zoom / pan)

## Utilisation

1. Place **image + audio** dans `bande-son/`
2. Lance `demarrer.bat` / `demarrer.sh` → http://127.0.0.1:8765/
3. Colle ta clé Agnes
4. **Veille flux jusqu’à succès** (sonde Agnes jusqu’au 1er canal libre)

### Montage seul

Si tu as déjà le clip court Agnes : dépose aussi un `.mp4` dans `bande-son/` (ou uploade-le) + audio → **Montage 3h seul**.

## Montage 3h (amélioré)

- Boucle vidéo exacte **10800&nbsp;s** (`-c:v copy`)
- Audio AAC **192&nbsp;kb/s / 48&nbsp;kHz**, fade-in 2,5&nbsp;s + fade-out 5&nbsp;s
- Fichier : `capybara-automne-lofi-3h.mp4`

## Veille flux

Sondage actif de `POST /v1/videos` (3–6&nbsp;s) — pas d’heure fixe. Le PC doit rester allumé.
