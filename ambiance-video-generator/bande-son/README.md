# bande-son/

Dépose ici **les 2 fichiers** du projet automne cozy, puis lance `../demarrer.bat` ou `../demarrer.sh`.

## Obligatoire

| Fichier | Rôle |
|---------|------|
| **1 image** (`.png` / `.jpg` / `.webp`) | Image capybara / onsen → Agnes image-to-video |
| **1 audio** (`.mp3` / `.wav` / `.ogg` / `.m4a`) | Bande-son bouclée 3&nbsp;h avec fades YouTube |

## Optionnel

| Fichier | Rôle |
|---------|------|
| **1 clip** (`.mp4`) | Si Agnes a déjà généré le court clip → bouton **Montage 3h seul** |

Exemples de noms : `capybara-automne.png` + `lofi-onsen.mp3` (+ `clip-agnes.mp4`).

## Workflow

1. Copie image + bande-son dans ce dossier
2. `demarrer.bat` / `demarrer.sh` → http://127.0.0.1:8765/
3. Vérifie le prompt (vapeur, eau, feuilles, micro-clignement)
4. Colle la clé Agnes → **Veille flux jusqu’à succès**
5. Ou, si tu as déjà un MP4 court : **Montage 3h seul**

Les médias restent locaux (non commités — voir `.gitignore`).
