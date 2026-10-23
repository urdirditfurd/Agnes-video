# Pixora — Fresque d’1 million de pixels

Application web (prête Capacitor pour App Store / Play Store) où les utilisateurs **achètent des blocs de pixels à 1 € / pixel**, les personnalisent via un **builder par blocs**, et composent une fresque collective de **1 000 × 1 000 = 1 000 000 pixels**.

Inspiré du concept type Million Dollar Homepage / Pixbid / apps « Million Pixel ».

## Fonctionnalités

- Grille interactive 1000×1000 (zoom, pan, sélection)
- **Builder · Blocks** : zone, peinture, image, texte, lien
- Prix = `largeur × hauteur × 1 €` (min. 10×10)
- **Paiement démo sans frais** (par défaut)
- **Stripe Checkout** optionnel (0 commission Pixora ; seuls les frais processeur Stripe s’appliquent)
- Persistance SQLite
- Config Capacitor (`com.pixora.fresque`) pour packaging iOS / Android

## Démarrage

```bash
cd pixel-fresque
npm install
npm run dev
```

- UI : http://localhost:5173  
- API : http://localhost:8787  

## Paiement

| Mode | Quand | Frais |
|------|--------|-------|
| Démo | Par défaut | **0 €** — inscription immédiate |
| Stripe | `STRIPE_SECRET_KEY` + case cochée | Frais Stripe uniquement (pas de marge Pixora) |

```bash
export STRIPE_SECRET_KEY=sk_test_...
export CLIENT_URL=http://localhost:5173
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Stores (plus tard)

```bash
npm run cap:sync
npx cap add ios
npx cap add android
```

Puis ouvrir Xcode / Android Studio. Pour les stores, brancher **Apple Pay / Google Play Billing** en plus ou à la place de Stripe web selon les règles des plateformes.

## Structure

```
pixel-fresque/
  server/          API Express + SQLite + Stripe
  src/             React (canvas + builder)
  capacitor.config.ts
```
