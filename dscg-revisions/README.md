# DSCG 1 — Suivi des révisions (Gantt Excel)

Classeur Excel pour planifier et suivre les révisions du **DSCG** avec un **diagramme de Gantt** hebdomadaire.

## Fichier

- `DSCG1_Revisions_Gantt.xlsx` — classeur prêt à l'emploi
- `generer_gantt_dscg.py` — script de régénération (Python + openpyxl)

## Onglets

| Onglet | Rôle |
|--------|------|
| Mode d'emploi | Mode d'emploi rapide |
| Paramètres | Date de début, date d'examen, heures / semaine |
| Planning Gantt | Saisie des thèmes + barres Gantt automatiques |
| Tableau de bord | KPI, progression par UE, graphique des statuts |
| Bibliothèque UE | Idées de thèmes par unité d'enseignement |

## Utilisation rapide

1. Ouvre `DSCG1_Revisions_Gantt.xlsx` dans Excel ou LibreOffice Calc.
2. Renseigne **Paramètres** (date de début + date d'examen).
3. Dans **Planning Gantt**, ajuste les thèmes, dates et **% d'avancement**.
4. Les barres et le statut se mettent à jour automatiquement.

## Régénérer le fichier

```bash
pip install openpyxl
python3 generer_gantt_dscg.py
```
