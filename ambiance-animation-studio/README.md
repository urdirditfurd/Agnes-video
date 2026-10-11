# Ambiance Animation Studio

Boucle d’ambiance 10 s à partir de **n’importe quelle image**  
(cadre fixe — seuls les effets bougent).

## Si le navigateur dit « can't connect to server »

Cela signifie que **aucun serveur n’écoute** sur votre PC.  
`http://127.0.0.1:8765/` ne s’ouvre pas tout seul.

### Windows (recommandé)

1. Téléchargez le dossier **complet** `ambiance-animation-studio`  
   (GitHub → Code → Download ZIP → dézippez)
2. Entrez dans le dossier (vous devez voir `demarrer.bat` + `lib\ffmpeg\`)
3. Double-cliquez **`demarrer.bat`**
4. **Laissez la fenêtre noire ouverte**
5. Une URL verte apparaît, ex. `http://127.0.0.1:8765/` — ouvrez-la dans Chrome

`demarrer.bat` essaie automatiquement :
1. Python → 2. PowerShell (**sans Python**) → 3. Node.js

### Si ça échoue encore

Ouvrez **PowerShell** dans le dossier et collez :

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Puis ouvrez l’URL affichée.

### Mac / Linux

```bash
cd ambiance-animation-studio
chmod +x demarrer.sh
./demarrer.sh
```

## Contenu obligatoire

```
ambiance-animation-studio/
├── demarrer.bat      ← Windows
├── demarrer.sh
├── serve.py / serve.ps1 / serve.mjs
├── index.html
└── lib/ffmpeg/       ← ~31 Mo, obligatoire
```

## Ne pas faire

- ❌ Double-cliquer seulement `index.html`
- ❌ Fermer la fenêtre du serveur puis recharger la page
- ❌ Ouvrir `127.0.0.1` sur un autre ordinateur que celui où tourne `demarrer`
