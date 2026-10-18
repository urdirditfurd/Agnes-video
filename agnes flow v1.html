# 🎬 Visual.Studio — Film Factory

> **Un scénario · deux visages · 100 plans prêts à copier · prompts image + vidéo optimisés pour Google Flow / Veo**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Single File](https://img.shields.io/badge/Single--File-HTML%20%2B%20JS-blue)]()
[![No Build](https://img.shields.io/badge/Build-None-green)]()

---

## 📖 Table des matières

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Comment ça marche](#-comment-ça-marche)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Styles disponibles](#-styles-disponibles-38)
- [Format des prompts](#-format-des-prompts)
- [Clés API](#-clés-api)
- [Architecture technique](#-architecture-technique)
- [Personnalisation](#-personnalisation)
- [Dépannage](#-dépannage)
- [Roadmap](#-roadmap)
- [Licence](#-licence)

---

## 🎯 Présentation

**Visual.Studio — Film Factory** est une application web **mono-fichier** (HTML + CSS + JavaScript, sans dépendances, sans build) qui transforme un **scénario écrit** et **1 ou 2 photos de personnages** en un **storyboard complet de 100 plans**, prêt à être utilisé dans Google Flow (Veo) ou tout autre générateur vidéo IA.

L'application ne génère **aucune image**. Elle produit uniquement des **prompts texte** extrêmement précis que vous copiez-collez dans votre générateur préféré :

- 📸 **1 prompt image** (en anglais) — la première image-clé du plan
- 🎬 **1 prompt vidéo** (en anglais + dialogue français intégré) — l'animation du plan
- 💬 **Le dialogue français cohérent** — lu en ordre, il raconte l'histoire
- 🔊 **Les bruitages** et la règle « **no music, only French dialogue and natural sound effects** »

**Objectif** : produire en **une seule étape** un film cohérent de 100 plans — pas des images hallucinées sans lien entre elles.

---

## ✨ Fonctionnalités

### 🎯 Pipeline complet en **1 clic**
Un seul bouton lance tout :
1. Analyse forensique des visages (photos A et/ou B)
2. Écriture du scénario structuré (titre, logline, casting, lieux, arc en 5 actes)
3. Génération de **100 plans cohérents** répartis en **5 actes de 20 plans** (parallélisés)
4. Ouverture de la visionneuse plan-par-plan

### 👥 Deux personnages photos (optionnels)
- **Personnage A** = protagoniste principal (⭐)
- **Personnage B** = second rôle (🌟)
- Les visages sont analysés forensiquement : gender, âge, ethnicité, forme du visage, pommettes, mâchoire, menton, front, sourcils, yeux, nez, bouche, lèvres, oreilles, cheveux, particularités — **90 à 140 mots** par visage
- Le DNA du visage est **injecté verbatim** dans chaque plan où le personnage apparaît, garantissant la **cohérence absolue du film**

### 🎨 38 styles répartis en 4 catégories
- **10 cinéastes réalistes** : Wes Anderson, Kubrick, Chaplin, Truffaut, Hitchcock, Kurosawa, Fellini, Lynch, Tarantino, Villeneuve
- **10 styles manga/anime** : Ghibli, Shinkai, Kon, Otomo, shōnen N&B, seinen N&B, shōjo pastel, anime 90s, anime 2020s, webtoon
- **8 styles 3D/animation** : Pixar, DreamWorks, Laika, Aardman, Disney 2D, ligne claire, low-poly/voxel, argile
- **10 styles mixtes/expérimentaux** : Spider-Verse, collage Gilliam, néon rétro-futuriste, pictural Van Gogh, surréaliste Dalí, Art Nouveau, ukiyo-e Hokusai, Sin City N&B, marionnettes Quay, **🎲 Mix total**

### 🎬 Visionneuse intégrée
- Navigation **plan par plan** avec boutons ←/→ et flèches du clavier
- **Bandeau visuel** de 100 cases colorées par type de plan
- Numéro de plan, label, beat narratif affichés
- **3 boutons de copie** : « Copier image + vidéo », « Vidéo seule », « Image seule »

### 📋 Copie et export
- **Copier image + vidéo** sur un plan → un seul bloc formaté
- **Tout copier** → le script entier (100 plans) dans le presse-papier
- **Télécharger .txt** → le film complet dans un fichier

### 🔒 Cohérence narrative garantie
- **Dialogue obligatoire** dans chaque plan : soit un personnage parle, soit voix off
- **Fil narratif par acte** : la ligne 1 ouvre l'acte, les lignes du milieu référencent les **événements-clés**, la ligne 20 clôture
- **Répartition imposée** : décors (3-5) · protagoniste seul (5-7) · second rôle (2-4) · duo (3-5) · groupe (2-4) · autres (3-4) · détails (2-3)
- **Face lock** : les visages A et B sont décrits **verbatim** dans chaque prompt où ils apparaissent

### 🛡️ Robustesse
- **Rotation automatique des clés API** (1 clé par requête)
- **Détection de placeholder** : si l'IA recopie le schéma au lieu de le remplir → avertissement + fallback
- **Réparation JSON automatique** (apostrophes, guillemets, virgules orphelines)
- **Verrouillage UI** pendant les opérations longues (sauf bouton Stop)
- **Reprise en cas d'échec** d'un acte → fallback générique par acte

---

## 🧠 Comment ça marche

### Étape 1 — Avatars (optionnel)
Les photos A et B sont analysées via `apiVision` (vision multimodale). Le modèle produit un JSON forensique :

```json
{
  "face_dna": "A woman in her early thirties, pale skin scattered with freckles...",
  "body_dna": "Tall, slender build, narrow shoulders...",
  "typical_outfit": "Charcoal wool trench coat over a cream silk shirt..."
}
```

### Étape 2 — Scénario structuré
Le scénario + les DNA des avatars + le style choisi sont envoyés à `apiChat`. Le modèle renvoie un JSON complet :

```json
{
  "title": "Les Nuits de Montparnasse",
  "logline": "Une détective solitaire enquête sur la disparition d'un pianiste de jazz...",
  "characters": [
    { "name": "Élise", "role": "protagoniste", "description": "..." },
    { "name": "Marc",  "role": "secondaire principal", "description": "..." }
  ],
  "locations": ["A smoky jazz cellar on rue de la Huchette", "..."],
  "arc": [
    { "beat": "Ouverture", "summary": "...", "keyEvents": ["...", "..."] }
  ]
}
```

### Étape 3 — 100 plans en parallèle
Cinq appels `apiChat` **en parallèle** (un par acte de 20 plans). Chaque appel reçoit :
- Le contexte complet du film
- L'acte précis à écrire (summary, startState, endState, keyEvents)
- Le style choisi (medium + DNA visuel)
- Les blocs de visage (A et B)
- Les 2 exemples few-shot (décor avec voix off / groupe avec dialogue)
- L'instruction de cohérence du fil narratif

### Étape 4 — Assemblage et visionneuse
Chaque plan reçoit :
- **Bloc image** : prompt EN brut + face lock si pertinent + style DNA + règles absolues
- **Bloc vidéo** : prompt EN + injection du dialogue `Spoken in French by [nom]: « ligne »` + règle « No music » + durée/format
- **Bloc FR** : traduction pour comprendre ce qui se passe

---

## 🚀 Installation

### Méthode 1 — Ouvrir directement (le plus simple)
1. Téléchargez le fichier `index.html`
2. Ouvrez-le dans votre navigateur (Chrome, Firefox, Safari, Edge)
3. C'est tout. L'application fonctionne **100 % en local**.

### Méthode 2 — Héberger sur GitHub Pages
1. Forkez ce dépôt
2. Dans **Settings → Pages**, activez GitHub Pages sur la branche `main`
3. Votre app sera disponible sur `https://votre-username.github.io/visual-studio-film-factory/`

### Méthode 3 — Servir en local

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# Puis ouvrez http://localhost:8000/
```

### Prérequis
- **Aucun** — pas de Node.js, pas de npm, pas de build
- Un navigateur moderne (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Connexion Internet (pour les appels API)
- Clé(s) API Agnes AI (voir [Clés API](#-clés-api))

---

## 📚 Utilisation

### 1. Configuration des clés API
Collez vos clés (une par ligne) dans la section **🔑 Clés API Agnes**, puis cliquez sur **Valider et enregistrer**.

```
sk-8pC9jKyH8M0pVskY214CNwWBsLRGD7X8djLrYhlBrVousiZP
sk-xLleBUYo8JjPNWjRpeQuIkV7gqtCIYNqh6JR4dwI6aGmlBeQ
```

> 💡 **Plus vous avez de clés, plus la génération est rapide.** Les clés tournent automatiquement, 1 clé par requête.

### 2. Choix du style
Sélectionnez un style dans la liste déroulante. Un encart s'affiche sous la liste pour décrire le medium, le DNA visuel et l'esprit du style.

### 3. Ajout des photos (optionnel)
- **Personnage A (⭐)** = protagoniste
- **Personnage B (🌟)** = second rôle
- Cliquez sur la vignette → choisissez une photo → saisissez un prénom (optionnel)

> Si aucune photo n'est fournie, l'IA invente un protagoniste cohérent avec le scénario.

### 4. Écriture du scénario
Racontez votre film : intrigue, personnages, lieux, ton, époque. Plus c'est détaillé, meilleur sera le résultat.

**Exemple :**
> Dans le Paris des années 60, une détective solitaire enquête sur la disparition d'un pianiste de jazz. Elle croise des musiciens de nuit, des cafés enfumés, des quais brumeux. Peu à peu, elle tombe amoureuse du principal suspect.

### 5. Notes artistiques (optionnel)
Direction artistique libre : palette, références, ambiance, contraintes visuelles.

### 6. Créer le film
Cliquez sur **▸ Créer le film (100 plans)**. Comptez **2 à 6 minutes** selon le nombre de clés.

Vous verrez en direct :
- L'analyse des avatars
- L'écriture du scénario (titre, logline, casting, lieux, arc)
- L'écriture des 5 actes (progression 1/5, 2/5…)
- L'ouverture de la visionneuse

### 7. Navigation et copie
- Utilisez **←/→** (boutons ou flèches du clavier) pour passer d'un plan à l'autre
- Cliquez sur une **case du bandeau** pour aller directement à un plan
- **📋 Copier image + vidéo** → un seul bloc formaté pour Google Flow
- **📋 Tout copier** → les 100 plans d'un coup
- **💾 Télécharger .txt** → sauvegarde locale du storyboard

---

## 🎨 Styles disponibles (38)

### 🎥 Cinéma réaliste — 10 réalisateurs

| Style | Medium | Caractéristique |
|---|---|---|
| **Wes Anderson** | 35mm anamorphique | Symétrie parfaite, palette pastel, décors poupée |
| **Stanley Kubrick** | 35mm, 18-25mm | Perspective centrale obsessionnelle, symétrie clinique |
| **Charlie Chaplin** | N&B muet, 16 fps | Grâce burlesque, tendresse humaine |
| **François Truffaut** | 35mm, lumière naturelle | Nouvelle Vague, caméra portée, Paris urbain |
| **Alfred Hitchcock** | 35mm Technicolor | Suspense, cadres au cordeau, ombres dramatiques |
| **Akira Kurosawa** | 35mm téléobjectif | Plans comprimés, plusieurs actions simultanées, météo |
| **Federico Fellini** | 35mm théâtral | Théâtre surréel, foules oniriques, beauté grotesque |
| **David Lynch** | 35mm, rouge profond | Surréalisme familier, tension sourde, étrangeté |
| **Quentin Tarantino** | 35mm pulp | Cadres bas, saturation, esthétique vintage |
| **Denis Villeneuve** | 65mm digital | Échelle monumentale, brume atmosphérique, brutalisme |

### 🎌 Manga / Anime — 10 styles

| Style | Medium | Caractéristique |
|---|---|---|
| **Studio Ghibli** | Cellulo, aquarelles | Nature luxuriante, vents doux, chaleur nostalgique |
| **Makoto Shinkai** | Anime digital HD | Ciels lumineux, mélancolie romantique, lumière magique |
| **Satoshi Kon** | Anime psychologique | Transitions qui déforment la réalité, tension sourde |
| **Katsuhiro Otomo (Akira)** | Anime cyberpunk | Néo-Tokyo ultra-détaillée, rouges saturés |
| **Shōnen N&B** | Manga encré | Traits puissants, lignes de vitesse, énergie explosive |
| **Seinen N&B** | Manga raffiné | Atmosphères matures, instants introspectifs |
| **Shōjo pastel** | Pastels délicats | Fleurs, regards brillants, romantisme onirique |
| **Anime 90s** | Cellulo années 90 | Contours visibles, couleurs plates, grain TV |
| **Anime 2020s** | Anime digital moderne | Trait net, couleurs vives, éclairages cinéma |
| **Webtoon couleur** | Webtoon coréen | Couleurs douces, brillances propres |

### 🎭 3D & Animation — 8 styles

| Style | Medium | Caractéristique |
|---|---|---|
| **Pixar 3D** | CGI cinématographique | Personnages attachants, émotion, lumière douce |
| **DreamWorks 3D** | CGI stylisé | Expressions exagérées, énergie d'aventure |
| **Laika** | Stop-motion | Marionnettes tactiles, ambiance conte gothique |
| **Aardman** | Claymation | Pâte à modeler, humour britannique chaleureux |
| **Disney 2D** | Celluloïds peints | Cadrages lyriques, beauté intemporelle |
| **Ligne claire** | Bande dessinée franco-belge | Trait uniforme, Moebius/Hergé, élégance |
| **Low-poly / Voxel** | 3D facetté ou cubes | Esthétique rétro-numérique |
| **Argile / Pâte à modeler** | Modelage artisan | Formes douces, empreintes tactiles |

### 🎨 Mixtes & Expérimentaux — 10 styles

| Style | Medium | Caractéristique |
|---|---|---|
| **Spider-Verse** | 2D/3D hybride | Trames, aberrations, énergie pop-art |
| **Terry Gilliam collage** | Papier découpé | Gravures victoriennes, absurdité surréaliste |
| **Néon rétro-futuriste** | Cyberpunk + Ghibli | Néons, pluie, hologrammes, beauté mélancolique |
| **Pictural (Van Gogh)** | Huile impressionniste | Coups de pinceau, ciels tourbillonnants |
| **Surréaliste (Dalí)** | Peinture surréaliste | Scènes impossibles, étrangeté calme |
| **Art nouveau (Mucha)** | Illustration Art nouveau | Courbes, ornements botaniques, Gaudí |
| **Ukiyo-e (Hokusai)** | Estampe japonaise | Vagues stylisées, papier washi, aplats |
| **Sin City N&B** | Noir extrême | Silhouettes graphiques, un seul accent couleur |
| **Marionnettes Quay** | Stop-motion gothique | Beauté inquiétante, poussière, étrangeté |
| **🎲 Mix total** | Fusion imprévisible | Combine plusieurs univers, chaque plan surprend |

---

## 📝 Format des prompts

Chaque plan généré contient **quatre blocs** :

### 📸 Bloc 1 — PROMPT IMAGE (EN)
Le prompt complet en anglais, prêt à coller dans Google Flow, DALL·E, Midjourney, etc.

```
Empty rain-soaked cobblestone street in 1962 Paris at 3am, wet reflections of a single 
flickering streetlamp, closed shutters, one abandoned bicycle leaning on a wall, thin 
fog crawling along the ground, 35mm Kodak Portra 400 pushed to 800, anamorphic lens, 
fine grain, deep shadows, melancholic noir mood, no people.

═══ VISUAL STYLE — FOLLOW EXACTLY ═══
STYLE: François Truffaut
MEDIUM: 35mm film, natural light, French New Wave grain
STYLE DNA: Handheld camera, natural light, documentary-like spontaneity...
═══════════════════════════════════════

═══ ABSOLUTE RULES ═══
- Real photographic medium consistent with the STYLE above.
- Vertical 9:16, cinematic framing, striking eye-catching composition.
- NO text, NO watermark, NO logo, NO caption inside the image.
```

### 🎬 Bloc 2 — PROMPT VIDÉO (EN + dialogue FR)
Le prompt vidéo pour Google Flow (Veo), avec **le dialogue français intégré**.

```
Static wide shot of an empty rain-soaked cobblestone street at 3am, wet reflections on 
the ground, thin fog drifting slowly, one flickering streetlamp, no people, cinematic 
35mm film look, shallow depth of field, melancholic noir night mood. Voice-over in French: 
« Trois heures du matin. La ville dort, mais moi je ne dors plus depuis dix ans. » 
No music. Only French dialogue and natural sound effects. Duration 5 seconds. Vertical 9:16.
```

### 💬 Bloc 3 — DIALOGUE FR

```
🎙 VOIX OFF : « Trois heures du matin. La ville dort, mais moi je ne dors plus depuis dix ans. »
🔊 pluie fine sur les pavés, grésillement du lampadaire, pas lointains
📖 Plan large fixe d'une rue vide et humide.
```

### 🇫🇷 Bloc 4 — Traduction / explication
La version française du prompt image, pour comprendre ce que raconte le plan.

---

## 🔑 Clés API

### Obtenir une clé
1. Rendez-vous sur [platform.agnes-ai.com](https://platform.agnes-ai.com)
2. Créez un compte
3. **Settings → API Keys → Create new key**
4. Copiez la clé (elle commence par `sk-`)

### Combien de clés utiliser ?

| Nombre de clés | Vitesse | Recommandé pour |
|---|---|---|
| **1 clé** | Lent (~10-15 min) | Tester |
| **3-5 clés** | Rapide (~4-6 min) | Usage normal |
| **10+ clés** | Très rapide (~2-3 min) | Production intensive |

Les clés sont **validées au démarrage** (test léger), puis **tournent automatiquement** : 1 clé utilisée par requête, ce qui évite de saturer une seule clé.

### Sécurité
⚠️ **Vos clés restent dans votre navigateur** (`localStorage` + `sessionStorage`). Elles **ne sont jamais transmises** à un serveur tiers autre qu'Agnes AI. L'application fonctionne 100 % côté client.

---

## 🏗️ Architecture technique

### Stack
- **HTML5** — structure
- **CSS3** — design (thème sombre slate/amber, aucun framework)
- **JavaScript ES6+** — logique (aucune dépendance, aucun bundler)

### Structure du fichier

```
index.html
├── <style>        ~400 lignes CSS
├── <body>         ~250 lignes HTML
└── <script>       ~1200 lignes JS
    ├── CONFIG
    ├── STYLE_GROUPS (38 styles)
    ├── EXEMPLES few-shot
    ├── STATE
    ├── UTILS
    ├── STORAGE
    ├── API (apiChat, apiVision)
    ├── JSON (repairJson, extractJson)
    ├── PIPELINE (analyzeAvatar, analyzeStory, buildStoryboard)
    ├── RENDER (viewer, scenario, style dropdown)
    └── BIND
```

### Flux de données

```
Photos A/B ──► apiVision ──► DNA forensique A/B
                                  │
Scénario ────────┐                │
Style choisi ────┼──► apiChat ────┴──► Story structurée
Notes art. ──────┘                     │
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
                  Acte 1            Acte 2      ...  Acte 5
                 (20 plans)        (20 plans)       (20 plans)
                     │                 │                 │
                     └─────────────────┼─────────────────┘
                                       ▼
                                 100 plans
                                       │
                                       ▼
                            Visionneuse + Copie
```

### Modèles utilisés

| Modèle | Usage |
|---|---|
| `agnes-2.5-flash` | Texte + vision (analyse avatar, scénario, plans) |

### Endpoints

| Endpoint | Méthode | Usage |
|---|---|---|
| `/chat/completions` | POST | Chat + Vision |

### Optimisations
- **Parallélisation** : 5 appels simultanés pour les 5 actes
- **Rotation des clés** : 1 clé par requête, distribue la charge
- **Détection de placeholder** : rejette les valeurs-types recopiées du schéma
- **Réparation JSON** : gère les apostrophes, guillemets, virgules orphelines
- **Stockage local** : restaure clés, photos, scénario et style au rechargement

---

## 🛠️ Personnalisation

### Ajouter un style
Dans `STYLE_GROUPS`, ajoutez un objet dans la bonne catégorie :

```javascript
{ 
  id: 'mon_style', 
  name: 'Mon réalisateur',
  medium: '35mm film, lumière naturelle',
  styleDna: 'Description précise du style — composition, palette, lumière, grain, mood, cadrage...',
  videoHint: 'Mouvement de caméra typique',
  desc: 'Courte description en français pour la liste déroulante.'
}
```

### Ajouter une catégorie

```javascript
{ 
  group: '🎪 Ma catégorie', 
  items: [ /* objets styles */ ] 
}
```

### Changer le nombre de plans

```javascript
const SHOTS_TOTAL = 100;      // Nombre total de plans
const SHOTS_PER_CHUNK = 20;   // Plans par acte
const SHOT_CHUNKS = SHOTS_TOTAL / SHOTS_PER_CHUNK;  // Nombre d'actes
```

### Ajuster les délais entre requêtes

```javascript
const CONCURRENCY_PER_KEY = 2;   // Requêtes simultanées par clé
const DELAY_PER_KEY_MS = 3400;   // Délai minimum entre 2 requêtes (ms)
```

### Changer le modèle

```javascript
const MODEL_TEXT = 'agnes-2.5-flash';   // Modèle texte/vision
```

---

## 🐛 Dépannage

### « Analyse impossible — JSON invalide »
L'IA n'a pas produit un JSON valide. **Solutions :**
- Relancez l'analyse
- Reformulez le scénario (plus court ou plus précis)
- Changez de clé API
- Réduisez les notes artistiques

### « L'analyse n'a pas produit de vrai visage — relancez »
Le modèle a recopié le schéma au lieu de le remplir. **Solutions :**
- Relancez l'analyse (souvent ça passe au 2e essai)
- Vérifiez que la photo est bien nette et centrée sur le visage
- Reformulez le scénario

### Les plans sont génériques / se ressemblent
- Ajoutez plus de détails dans le **scénario** (lieux, époques, personnages secondaires)
- Enrichissez les **notes artistiques**
- Changez de style (essayez « Mix total »)

### La copie ne fonctionne pas
- Certains navigateurs bloquent `execCommand('copy')` hors contexte utilisateur. Cliquez directement sur le bouton
- Sur mobile, vérifiez les autorisations de presse-papier

### Les dialogues ne sont pas cohérents
- Rallongez le **scénario** (l'IA a besoin de matière)
- Précisez les **personnages** (noms, relations, motivations)
- Relancez (température `0.85` = variabilité)

### « HTTP 429 » ou « HTTP 503 »
Rate limit atteint. **Solutions :**
- Ajoutez plus de clés API
- Augmentez `DELAY_PER_KEY_MS`
- Attendez quelques minutes

### L'UI semble figée
C'est **normal** pendant la génération : l'UI est **verrouillée volontairement** (sauf bouton Stop) pour éviter les incohérences. Regardez la barre de statut en bas pour la progression.

---

## 🗺️ Roadmap

- [ ] Support de styles personnalisés utilisateur (sauvegarde locale)
- [ ] Export au format CSV / Notion / Obsidian
- [ ] Mode « reprise de film » (reprendre depuis un plan précis)
- [ ] Prévisualisation via une IA image (optionnelle)
- [ ] Support d'autres fournisseurs (OpenAI, Anthropic)
- [ ] Génération d'une bande-son (voix off FR via TTS)
- [ ] Storyboard au format PDF
- [ ] Multi-langue UI (EN / ES / DE)

---

## 📄 Licence

MIT License — voir le fichier `LICENSE`.

Vous êtes libre d'utiliser, modifier et distribuer ce code, à condition de conserver l'attribution originale.

---

## 🙏 Crédits

- **Idée & direction** : projet personnel
- **Modèles IA** : [Agnes AI](https://platform.agnes-ai.com)
- **Inspirations cinématographiques** : les 38 réalisateurs et styles cités
- **Police & design** : thème sombre *slate + amber*, polices système, aucune dépendance externe

---

## 📬 Contribution

Les contributions sont bienvenues ! Pour proposer une amélioration :

1. Forkez le dépôt
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Poussez (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une **Pull Request**

### Idées de contribution
- Ajouter de nouveaux styles dans `STYLE_GROUPS`
- Améliorer les prompts few-shot
- Ajouter des tests unitaires (Jest ou Vitest)
- Traduire l'UI en d'autres langues
- Documenter de nouveaux cas d'usage

---

## ⭐ Si ce projet vous plaît

N'hésitez pas à mettre une ⭐ sur GitHub et à partager le projet !

**Bon film. 🎬**
