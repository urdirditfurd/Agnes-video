# Ambiance Animation Studio

## Démarrer sur Windows (si ça ne marche pas)

### Méthode A — la plus simple

1. Téléchargez le **ZIP complet** du projet (GitHub → Code → Download ZIP)
2. Dézippez (clic droit → Extraire)
3. Ouvrez le dossier jusqu’à voir ces fichiers :
   - `1-LANCER.bat`
   - `index.html`
   - `lib` (dossier)
4. Double-cliquez **`1-LANCER.bat`**  
   (ou `LANCER.vbs` si le .bat se ferme tout de suite)
5. **Laissez la fenêtre ouverte**
6. Chrome doit s’ouvrir sur `http://127.0.0.1:8765/`

### Méthode B — si A échoue

1. Dans le dossier, double-cliquez **`diagnostique.bat`**
2. Photo / copiez tout le texte
3. Toujours dans le dossier : barre d’adresse → effacez → tapez `powershell` → Entrée
4. Collez :

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; .\serve.ps1
```

### Si vous voyez encore « can't connect »

- La fenêtre noire / PowerShell a été **fermée** → relancez `1-LANCER.bat`
- Vous avez ouvert seulement `index.html` → **ne pas faire ça**
- Mauvais dossier (pas de dossier `lib`) → reprise du ZIP complet

Le fichier **`demarrer-log.txt`** est créé automatiquement : envoyez-le pour de l’aide.

## Mac / Linux

```bash
./demarrer.sh
```
