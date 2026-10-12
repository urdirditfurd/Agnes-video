# DSCG 1 — Suivi des révisions sur l'année (Gantt)

Classeur Excel pour **ne pas se perdre** dans tes révisions tout au long de l'année en **alternance** (pas un planning de bachotage).

## Contexte prévu

- **Période** : octobre 2026 → octobre 2027
- **Rythme** : 3 j. cours / 2 j. entreprise
- **Congés** : 1 semaine en décembre + 3 semaines l'été
- **Charge perso** : ~6 h de révision / semaine (hors cours)

## Fichiers

- `DSCG1_Revisions_Gantt.xlsx` — classeur prêt à l'emploi
- `generer_gantt_dscg.py` — script de régénération

## Onglets

| Onglet | Rôle |
|--------|------|
| Mode d'emploi | Prise en main |
| Mon rythme | Semaine type alternance + congés |
| Paramètres | Dates, heures / semaine, délai entre passages |
| Planning Gantt | Fil rouge mensuel + alertes + maîtrise |
| Tableau de bord | Où tu en es par UE |
| Bibliothèque UE | Idées de thèmes à ajouter |

## Routine dimanche (5 min)

1. Filtre **Alerte ≠ OK**
2. Choisis **2 thèmes max** pour la semaine
3. Après chaque séance : Maîtrise + Dernière rév. + Nb passages + Étape

## Régénérer

```bash
pip install openpyxl
python3 generer_gantt_dscg.py
```
