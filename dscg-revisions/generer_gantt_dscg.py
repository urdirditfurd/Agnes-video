#!/usr/bin/env python3
"""Génère un classeur Excel de suivi des révisions DSCG 1 en diagramme de Gantt."""

from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import DoughnutChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ---------------------------------------------------------------------------
# Constantes visuelles
# ---------------------------------------------------------------------------
NB_SEMAINES = 16
DATE_DEBUT_DEFAUT = date(2026, 1, 5)  # lundi
DATE_EXAMEN_DEFAUT = date(2026, 5, 4)

COULEURS = {
    "titre": "1B3A4B",
    "sous_titre": "2E6B7A",
    "en_tete": "1B3A4B",
    "en_tete_fg": "FFFFFF",
    "alt": "F0F5F7",
    "blanc": "FFFFFF",
    "accent": "C45C26",
    "vert": "2D6A4F",
    "vert_clair": "95D5B2",
    "orange": "E09F3E",
    "rouge": "C1121F",
    "bleu_gantt": "457B9D",
    "bleu_clair": "A8DADC",
    "gris": "6C757D",
    "jaune": "F4D35E",
    "ligne": "CED4DA",
}

STATUTS = ["À faire", "En cours", "Terminé", "En retard", "Reporté"]
PRIORITES = ["Haute", "Moyenne", "Basse"]
TYPES = ["Cours", "Exercices", "Annales", "Fiches", "Révision globale"]

# Thèmes préremplis (DSCG — année 1 typique : UE1, UE2, UE4, UE6 souvent prioritaires)
THEMES = [
    # UE1 Gestion juridique, fiscale et sociale
    ("UE1", "Droit des sociétés — constitution & fonctionnement", "Cours", "Haute", 1, 2, 0),
    ("UE1", "Droit des sociétés — fusions, scissions, dissolution", "Cours", "Haute", 3, 3, 0),
    ("UE1", "Fiscalité des entreprises — IS & intégration fiscale", "Cours", "Haute", 4, 5, 0),
    ("UE1", "Fiscalité — TVA & taxes diverses", "Exercices", "Moyenne", 5, 6, 0),
    ("UE1", "Droit social — contrat de travail & rupture", "Cours", "Haute", 7, 8, 0),
    ("UE1", "Annales UE1 — sujets blancs", "Annales", "Haute", 14, 15, 0),
    # UE2 Finance
    ("UE2", "Diagnostic financier & tableaux de flux", "Cours", "Haute", 1, 2, 0),
    ("UE2", "Évaluation d'entreprise", "Cours", "Haute", 3, 4, 0),
    ("UE2", "Politique d'investissement & VAN/TRI", "Exercices", "Haute", 5, 6, 0),
    ("UE2", "Financement & structure du capital", "Cours", "Moyenne", 7, 8, 0),
    ("UE2", "Ingénierie financière & fusions", "Cours", "Moyenne", 9, 10, 0),
    ("UE2", "Annales UE2 — sujets blancs", "Annales", "Haute", 14, 15, 0),
    # UE3 Management et contrôle de gestion
    ("UE3", "Pilotage stratégique & BSC", "Cours", "Moyenne", 2, 3, 0),
    ("UE3", "Contrôle de gestion — coûts & budgets", "Exercices", "Haute", 4, 6, 0),
    ("UE3", "Gestion de projet & organisation", "Cours", "Basse", 8, 9, 0),
    ("UE3", "Annales UE3 — sujets blancs", "Annales", "Moyenne", 13, 14, 0),
    # UE4 Comptabilité et audit
    ("UE4", "Consolidation — pourcentages & méthodes", "Cours", "Haute", 1, 3, 0),
    ("UE4", "Consolidation — écarts d'acquisition & variation", "Exercices", "Haute", 4, 5, 0),
    ("UE4", "Normes IFRS — immobilisations & instruments", "Cours", "Haute", 6, 8, 0),
    ("UE4", "Audit — démarche & risques", "Cours", "Moyenne", 9, 10, 0),
    ("UE4", "Annales UE4 — sujets blancs", "Annales", "Haute", 14, 15, 0),
    # UE5 MSI
    ("UE5", "Systèmes d'information & gouvernance SI", "Cours", "Basse", 6, 7, 0),
    ("UE5", "Sécurité, ERP & transformation digitale", "Fiches", "Basse", 10, 11, 0),
    # UE6 Anglais
    ("UE6", "Vocabulaire finance & audit", "Fiches", "Moyenne", 2, 12, 0),
    ("UE6", "Entraînement compréhension écrite", "Exercices", "Moyenne", 3, 13, 0),
    # Synthèse
    ("TRANSVERSE", "Planning blancs complets (2 UE / week-end)", "Révision globale", "Haute", 12, 15, 0),
    ("TRANSVERSE", "Fiches express — formules & schémas", "Fiches", "Haute", 13, 16, 0),
]


def thin_border():
    s = Side(style="thin", color=COULEURS["ligne"])
    return Border(left=s, right=s, top=s, bottom=s)


def fill(hex_color: str) -> PatternFill:
    return PatternFill("solid", fgColor=hex_color)


def style_header_row(ws, row, start_col, end_col):
    for col in range(start_col, end_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = fill(COULEURS["en_tete"])
        cell.font = Font(name="Calibri", bold=True, color=COULEURS["en_tete_fg"], size=11)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border()


def apply_body(cell, center=False, bold=False):
    cell.font = Font(name="Calibri", size=10, bold=bold)
    cell.border = thin_border()
    cell.alignment = Alignment(
        horizontal="center" if center else "left",
        vertical="center",
        wrap_text=True,
    )


# ---------------------------------------------------------------------------
# Feuille 1 — Mode d'emploi
# ---------------------------------------------------------------------------
def build_mode_emploi(wb: Workbook):
    ws = wb.create_sheet("Mode d'emploi", 0)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 92

    ws["B2"] = "DSCG 1 — Suivi des révisions (diagramme de Gantt)"
    ws["B2"].font = Font(name="Calibri", size=20, bold=True, color=COULEURS["titre"])

    ws["B3"] = (
        "Classeur prêt à l'emploi pour planifier, visualiser et suivre tes révisions "
        "par UE jusqu'aux examens."
    )
    ws["B3"].font = Font(name="Calibri", size=12, italic=True, color=COULEURS["sous_titre"])

    etapes = [
        ("1. Paramètres", "Ouvre l'onglet Paramètres. Indique ta date de début de révision et la date d'examen. "
         "Les 16 semaines du Gantt se recalculent automatiquement."),
        ("2. Planning Gantt", "Chaque ligne = un thème de révision. Modifie UE, thème, type, priorité, "
         "dates de début/fin et % d'avancement. Les barres colorées se mettent à jour toutes seules."),
        ("3. Couleurs du Gantt", "Bleu = planifié | Vert = terminé (≥100 %) | Orange = en cours | "
         "Rouge = en retard (date de fin dépassée et avancement < 100 %)."),
        ("4. Tableau de bord", "L'onglet Tableau de bord résume ta progression globale, par UE et les "
         "thèmes en retard. Actualise les filtres si besoin (données → actualiser)."),
        ("5. Personnalisation", "Ajoute des lignes sous les thèmes existants (copie une ligne pour garder "
         "les formules du Gantt). Tu peux supprimer les thèmes qui ne concernent pas tes UE."),
        ("6. Astuce DSCG", "Alterne Cours / Exercices / Annales. Garde 2–3 semaines avant l'examen "
         "uniquement pour les annales chronométrées et les fiches express."),
    ]

    row = 5
    for titre, texte in etapes:
        ws.cell(row=row, column=2, value=titre).font = Font(
            name="Calibri", size=13, bold=True, color=COULEURS["accent"]
        )
        ws.cell(row=row + 1, column=2, value=texte).font = Font(name="Calibri", size=11)
        ws.cell(row=row + 1, column=2).alignment = Alignment(wrap_text=True)
        ws.row_dimensions[row + 1].height = 36
        row += 3

    ws.cell(row=row + 1, column=2, value="Légende rapide des onglets").font = Font(
        name="Calibri", size=13, bold=True, color=COULEURS["titre"]
    )
    legendes = [
        "Paramètres → dates, heures dispo / semaine, objectifs",
        "Planning Gantt → ton outil principal (saisie + visualisation)",
        "Tableau de bord → synthèse et alertes",
        "Bibliothèque UE → idées de thèmes par unité d'enseignement",
    ]
    for i, leg in enumerate(legendes):
        ws.cell(row=row + 3 + i, column=2, value=f"• {leg}").font = Font(name="Calibri", size=11)

    ws.row_dimensions[2].height = 28


# ---------------------------------------------------------------------------
# Feuille 2 — Paramètres
# ---------------------------------------------------------------------------
def build_parametres(wb: Workbook):
    ws = wb.create_sheet("Paramètres", 1)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 38
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["D"].width = 48

    ws["B2"] = "Paramètres du planning"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    labels = [
        ("B4", "Prénom / Identifiant", "C4", "Élève DSCG 1", "Ton nom (optionnel)"),
        ("B5", "Date de début des révisions", "C5", DATE_DEBUT_DEFAUT, "Doit être un lundi de préférence"),
        ("B6", "Date d'examen (1ère épreuve)", "C6", DATE_EXAMEN_DEFAUT, "Date butoir affichée dans le Gantt"),
        ("B7", "Heures dispo / semaine", "C7", 12, "Pour estimer la charge (info)"),
        ("B8", "Objectif d'avancement global", "C8", 1.0, "Ex. 100 % = tout terminé"),
    ]

    for b, label, c, value, aide in labels:
        ws[b] = label
        ws[b].font = Font(name="Calibri", size=11, bold=True)
        ws[c] = value
        ws[c].fill = fill("FFF3E8")
        ws[c].border = thin_border()
        ws[c].font = Font(name="Calibri", size=11, color=COULEURS["accent"], bold=True)
        ws[c].alignment = Alignment(horizontal="center")
        col_d = "D" + c[1:]
        ws[col_d] = aide
        ws[col_d].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["gris"])

    ws["C5"].number_format = "DD/MM/YYYY"
    ws["C6"].number_format = "DD/MM/YYYY"
    ws["C8"].number_format = "0%"

    # Jours de début de chaque semaine (référencés par le Gantt)
    ws["B10"] = "Calendrier des semaines (calculé automatiquement)"
    ws["B10"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    ws["B11"] = "N° semaine"
    ws["C11"] = "Date de début (lundi)"
    ws["D11"] = "Libellé Gantt"
    style_header_row(ws, 11, 2, 4)

    for i in range(1, NB_SEMAINES + 1):
        r = 11 + i
        ws.cell(row=r, column=2, value=i)
        # =Paramètres!$C$5 + (n-1)*7
        ws.cell(row=r, column=3, value=f'=$C$5+({i}-1)*7')
        ws.cell(row=r, column=3).number_format = "DD/MM/YYYY"
        ws.cell(row=r, column=4, value=f'="S"&B{r}&" "&TEXT(C{r},"DD/MM")')
        for col in range(2, 5):
            apply_body(ws.cell(row=r, column=col), center=True)
        if i % 2 == 0:
            for col in range(2, 5):
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])

    # Noms définis via cellules stables
    ws["B30"] = "Cellules clés utilisées par les formules"
    ws["B30"].font = Font(name="Calibri", size=11, bold=True, color=COULEURS["gris"])
    ws["B31"] = "DateDebut"
    ws["C31"] = "=C5"
    ws["C31"].number_format = "DD/MM/YYYY"
    ws["B32"] = "DateExamen"
    ws["C32"] = "=C6"
    ws["C32"].number_format = "DD/MM/YYYY"

    note = ws["B29"]
    note.value = (
        "Ne renomme pas cet onglet ni les cellules C5/C6 : le Planning Gantt s'y réfère."
    )
    note.font = Font(name="Calibri", size=10, italic=True, color=COULEURS["rouge"])


# ---------------------------------------------------------------------------
# Feuille 3 — Planning Gantt
# ---------------------------------------------------------------------------
def build_gantt(wb: Workbook):
    ws = wb.create_sheet("Planning Gantt", 2)
    ws.freeze_panes = "H5"
    ws.sheet_view.showGridLines = False

    # Largeurs
    widths = {
        "A": 3, "B": 12, "C": 48, "D": 14, "E": 11, "F": 12, "G": 12,
        "H": 11, "I": 12, "J": 11,
    }
    for col, w in widths.items():
        ws.column_dimensions[col].width = w
    first_week_col = 11  # colonne K
    for i in range(NB_SEMAINES):
        ws.column_dimensions[get_column_letter(first_week_col + i)].width = 5.2

    # Titre
    ws.merge_cells("B2:J2")
    ws["B2"] = "Planning Gantt — Révisions DSCG 1"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    ws.merge_cells("B3:J3")
    ws["B3"] = (
        'Semaines calculées depuis Paramètres!C5  •  '
        'Remplis les colonnes jaunes  •  Les barres se colorent automatiquement'
    )
    ws["B3"].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["sous_titre"])

    # En-têtes fixes
    headers = [
        (2, "UE"),
        (3, "Thème / Chapitre"),
        (4, "Type"),
        (5, "Priorité"),
        (6, "Début"),
        (7, "Fin"),
        (8, "Avancement"),
        (9, "Statut"),
        (10, "Jours restants"),
    ]
    for col, title in headers:
        cell = ws.cell(row=4, column=col, value=title)
    style_header_row(ws, 4, 2, 10)

    # En-têtes semaines
    for i in range(NB_SEMAINES):
        col = first_week_col + i
        # Libellé = Paramètres!D12 pour S1, etc.
        cell = ws.cell(row=4, column=col, value=f"=Paramètres!D{12 + i}")
        cell.fill = fill(COULEURS["en_tete"])
        cell.font = Font(name="Calibri", bold=True, color=COULEURS["en_tete_fg"], size=8)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True, textRotation=90)
        cell.border = thin_border()
    ws.row_dimensions[4].height = 70

    # Validations
    dv_statut = DataValidation(type="list", formula1='"' + ",".join(STATUTS) + '"', allow_blank=True)
    dv_prio = DataValidation(type="list", formula1='"' + ",".join(PRIORITES) + '"', allow_blank=True)
    dv_type = DataValidation(type="list", formula1='"' + ",".join(TYPES) + '"', allow_blank=True)
    dv_ue = DataValidation(
        type="list",
        formula1='"UE1,UE2,UE3,UE4,UE5,UE6,UE7,TRANSVERSE"',
        allow_blank=True,
    )
    for dv in (dv_statut, dv_prio, dv_type, dv_ue):
        ws.add_data_validation(dv)

    max_rows = 40  # lignes préformatées
    data_start = 5

    for idx in range(max_rows):
        r = data_start + idx
        ws.row_dimensions[r].height = 22

        # Données préremplies ou vides
        if idx < len(THEMES):
            ue, theme, typ, prio, sem_d, sem_f, av = THEMES[idx]
            debut = f"=Paramètres!$C$5+({sem_d}-1)*7"
            fin = f"=Paramètres!$C$5+({sem_f})*7-1"
        else:
            ue = theme = typ = prio = None
            debut = fin = None
            av = None

        values = {
            2: ue,
            3: theme,
            4: typ,
            5: prio,
            6: debut,
            7: fin,
            8: av if av is not None else None,
        }
        for col, val in values.items():
            cell = ws.cell(row=r, column=col, value=val)
            apply_body(cell, center=(col != 3))
            if col in (2, 3, 4, 5, 6, 7, 8):
                cell.fill = fill("FFF8F0")  # zone saisie

        ws.cell(row=r, column=6).number_format = "DD/MM/YYYY"
        ws.cell(row=r, column=7).number_format = "DD/MM/YYYY"
        ws.cell(row=r, column=8).number_format = "0%"

        # Statut automatique
        # Terminé si avancement >= 100%
        # En retard si fin < AUJOURDHUI et avancement < 100%
        # En cours si avancement > 0
        # Sinon À faire
        statut_formula = (
            f'=IF(C{r}="","",'
            f'IF(H{r}>=1,"Terminé",'
            f'IF(AND(G{r}<>"",G{r}<TODAY(),H{r}<1),"En retard",'
            f'IF(H{r}>0,"En cours","À faire"))))'
        )
        cell_s = ws.cell(row=r, column=9, value=statut_formula)
        apply_body(cell_s, center=True)

        # Jours restants
        jours_formula = (
            f'=IF(OR(C{r}="",G{r}=""),"",G{r}-TODAY())'
        )
        cell_j = ws.cell(row=r, column=10, value=jours_formula)
        apply_body(cell_j, center=True)

        # Barres Gantt : 1 si la semaine chevauche [début; fin]
        for i in range(NB_SEMAINES):
            col = first_week_col + i
            # Semaine i commence Paramètres!C(12+i)
            # Chevauchement : début <= fin_semaine ET fin >= début_semaine
            week_start = f"Paramètres!$C${12 + i}"
            week_end = f"Paramètres!$C${12 + i}+6"
            formula = (
                f'=IF(OR($C{r}="",$F{r}="",$G{r}=""),"",'
                f'IF(AND($F{r}<={week_end},$G{r}>={week_start}),1,""))'
            )
            cell = ws.cell(row=r, column=col, value=formula)
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border()
            cell.font = Font(color="FFFFFF", size=1)  # masque le 1

        dv_ue.add(f"B{r}")
        dv_type.add(f"D{r}")
        dv_prio.add(f"E{r}")
        dv_statut.add(f"I{r}")

        if idx % 2 == 1:
            for col in range(2, 11):
                if ws.cell(row=r, column=col).fill.fgColor.rgb in (None, "00000000", "FFF8F0"):
                    pass  # keep input fill
            # léger zebra seulement sur jours restants déjà géré

    last_data = data_start + max_rows - 1
    last_week_col = first_week_col + NB_SEMAINES - 1
    last_week_letter = get_column_letter(last_week_col)

    # Mise en forme conditionnelle Gantt
    # Vert si terminé
    ws.conditional_formatting.add(
        f"K{data_start}:{last_week_letter}{last_data}",
        FormulaRule(
            formula=[f'AND(K{data_start}=1,$H{data_start}>=1)'],
            fill=fill(COULEURS["vert"]),
        ),
    )
    # Rouge si en retard
    ws.conditional_formatting.add(
        f"K{data_start}:{last_week_letter}{last_data}",
        FormulaRule(
            formula=[f'AND(K{data_start}=1,$I{data_start}="En retard")'],
            fill=fill(COULEURS["rouge"]),
        ),
    )
    # Orange si en cours
    ws.conditional_formatting.add(
        f"K{data_start}:{last_week_letter}{last_data}",
        FormulaRule(
            formula=[f'AND(K{data_start}=1,$I{data_start}="En cours")'],
            fill=fill(COULEURS["orange"]),
        ),
    )
    # Bleu si planifié (à faire)
    ws.conditional_formatting.add(
        f"K{data_start}:{last_week_letter}{last_data}",
        FormulaRule(
            formula=[f'AND(K{data_start}=1,$I{data_start}="À faire")'],
            fill=fill(COULEURS["bleu_gantt"]),
        ),
    )
    # Reporté = gris
    ws.conditional_formatting.add(
        f"K{data_start}:{last_week_letter}{last_data}",
        FormulaRule(
            formula=[f'AND(K{data_start}=1,$I{data_start}="Reporté")'],
            fill=fill(COULEURS["gris"]),
        ),
    )

    # Couleurs statut
    for statut, couleur in [
        ("Terminé", COULEURS["vert_clair"]),
        ("En cours", "FCE4B3"),
        ("En retard", "F5C2C7"),
        ("À faire", COULEURS["bleu_clair"]),
        ("Reporté", "DEE2E6"),
    ]:
        ws.conditional_formatting.add(
            f"I{data_start}:I{last_data}",
            CellIsRule(operator="equal", formula=[f'"{statut}"'], fill=fill(couleur)),
        )

    # Priorité
    for prio, couleur in [
        ("Haute", "F5C2C7"),
        ("Moyenne", "FCE4B3"),
        ("Basse", COULEURS["vert_clair"]),
    ]:
        ws.conditional_formatting.add(
            f"E{data_start}:E{last_data}",
            CellIsRule(operator="equal", formula=[f'"{prio}"'], fill=fill(couleur)),
        )

    # Légende sous le tableau
    legend_row = last_data + 2
    ws.cell(row=legend_row, column=2, value="Légende Gantt").font = Font(
        name="Calibri", bold=True, size=11, color=COULEURS["titre"]
    )
    legendes = [
        (3, "Planifié", COULEURS["bleu_gantt"]),
        (4, "En cours", COULEURS["orange"]),
        (5, "Terminé", COULEURS["vert"]),
        (6, "En retard", COULEURS["rouge"]),
        (7, "Reporté", COULEURS["gris"]),
    ]
    for col, label, couleur in legendes:
        cell = ws.cell(row=legend_row, column=col, value=label)
        cell.fill = fill(couleur)
        cell.font = Font(name="Calibri", bold=True, color="FFFFFF", size=9)
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border()

    # Marqueur examen — ligne info
    info_row = legend_row + 2
    ws.merge_cells(start_row=info_row, start_column=2, end_row=info_row, end_column=8)
    ws.cell(
        row=info_row,
        column=2,
        value=(
            "Astuce : mets à jour la colonne « Avancement » (ex. 25 %, 50 %, 100 %). "
            "Le statut et les couleurs du Gantt se mettent à jour tout seuls."
        ),
    )
    ws.cell(row=info_row, column=2).font = Font(name="Calibri", size=9, italic=True)
    ws.cell(row=info_row, column=9, value="Examen →")
    ws.cell(row=info_row, column=9).font = Font(
        name="Calibri", size=9, bold=True, color=COULEURS["accent"]
    )
    ws.cell(row=info_row, column=10, value="=Paramètres!C6")
    ws.cell(row=info_row, column=10).number_format = "DD/MM/YYYY"
    ws.cell(row=info_row, column=10).font = Font(
        name="Calibri", size=10, bold=True, color=COULEURS["accent"]
    )

    # Impression
    ws.print_title_rows = "4:4"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0


# ---------------------------------------------------------------------------
# Feuille 4 — Tableau de bord
# ---------------------------------------------------------------------------
def build_dashboard(wb: Workbook):
    ws = wb.create_sheet("Tableau de bord", 3)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    for col, w in enumerate([22, 14, 14, 14, 14, 14, 18], start=2):
        ws.column_dimensions[get_column_letter(col)].width = w

    ws["B2"] = "Tableau de bord — progression DSCG 1"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    ws["B3"] = (
        '=CONCATENATE("Période : ",TEXT(Paramètres!C5,"DD/MM/YYYY"),'
        '" → ",TEXT(Paramètres!C6,"DD/MM/YYYY"))'
    )
    ws["B3"].font = Font(name="Calibri", size=11, italic=True, color=COULEURS["sous_titre"])

    # KPI cards
    kpis = [
        ("B5", "Thèmes planifiés", 'C5', '=COUNTA(\'Planning Gantt\'!C5:C44)'),
        ("B6", "Terminés", 'C6', '=COUNTIF(\'Planning Gantt\'!I5:I44,"Terminé")'),
        ("B7", "En cours", 'C7', '=COUNTIF(\'Planning Gantt\'!I5:I44,"En cours")'),
        ("B8", "En retard", 'C8', '=COUNTIF(\'Planning Gantt\'!I5:I44,"En retard")'),
        ("B9", "Avancement moyen", 'C9', '=IFERROR(AVERAGEIF(\'Planning Gantt\'!C5:C44,"<>",\'Planning Gantt\'!H5:H44),0)'),
    ]
    for label_cell, label, value_cell, formula in kpis:
        ws[label_cell] = label
        ws[label_cell].font = Font(name="Calibri", size=11, bold=True)
        ws[label_cell].fill = fill(COULEURS["alt"])
        ws[label_cell].border = thin_border()
        ws[value_cell] = formula
        ws[value_cell].font = Font(name="Calibri", size=14, bold=True, color=COULEURS["accent"])
        ws[value_cell].alignment = Alignment(horizontal="center")
        ws[value_cell].border = thin_border()
        ws[value_cell].fill = fill("FFF8F0")
    ws["C9"].number_format = "0%"

    # Progression par UE
    ws["B11"] = "Progression par UE"
    ws["B11"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    headers = ["UE", "Nb thèmes", "Terminés", "En retard", "Avancement moyen"]
    for i, h in enumerate(headers, start=2):
        ws.cell(row=12, column=i, value=h)
    style_header_row(ws, 12, 2, 6)

    ues = ["UE1", "UE2", "UE3", "UE4", "UE5", "UE6", "UE7", "TRANSVERSE"]
    for i, ue in enumerate(ues):
        r = 13 + i
        ws.cell(row=r, column=2, value=ue)
        ws.cell(row=r, column=3, value=f'=COUNTIF(\'Planning Gantt\'!B:B,B{r})')
        ws.cell(
            row=r,
            column=4,
            value=f'=COUNTIFS(\'Planning Gantt\'!B:B,B{r},\'Planning Gantt\'!I:I,"Terminé")',
        )
        ws.cell(
            row=r,
            column=5,
            value=f'=COUNTIFS(\'Planning Gantt\'!B:B,B{r},\'Planning Gantt\'!I:I,"En retard")',
        )
        ws.cell(
            row=r,
            column=6,
            value=(
                f'=IFERROR(AVERAGEIF(\'Planning Gantt\'!B:B,B{r},\'Planning Gantt\'!H:H),0)'
            ),
        )
        ws.cell(row=r, column=6).number_format = "0%"
        for col in range(2, 7):
            apply_body(ws.cell(row=r, column=col), center=(col > 2))
            if i % 2 == 1:
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])

    # Graphique donut sur répartition statuts
    ws["H5"] = "Statut"
    ws["I5"] = "Nombre"
    style_header_row(ws, 5, 8, 9)
    for i, statut in enumerate(["À faire", "En cours", "Terminé", "En retard", "Reporté"]):
        r = 6 + i
        ws.cell(row=r, column=8, value=statut)
        ws.cell(row=r, column=9, value=f'=COUNTIF(\'Planning Gantt\'!I:I,H{r})')
        apply_body(ws.cell(row=r, column=8))
        apply_body(ws.cell(row=r, column=9), center=True)

    chart = DoughnutChart()
    chart.title = "Répartition des statuts"
    labels = Reference(ws, min_col=8, min_row=6, max_row=10)
    data = Reference(ws, min_col=9, min_row=5, max_row=10)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(labels)
    chart.dataLabels = DataLabelList()
    chart.dataLabels.showPercent = True
    chart.dataLabels.showVal = False
    chart.dataLabels.showCatName = False
    chart.width = 12
    chart.height = 8
    ws.add_chart(chart, "H12")

    # Alertes — thèmes en retard
    ws["B23"] = "Alertes — thèmes en retard ou à traiter cette semaine"
    ws["B23"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["rouge"])

    ws["B24"] = (
        "Filtre l'onglet Planning Gantt sur Statut = « En retard » ou Priorité = « Haute ». "
        "Objectif : zéro retard 14 jours avant l'examen."
    )
    ws["B24"].font = Font(name="Calibri", size=10, italic=True)
    ws.merge_cells("B24:F24")

    # Charge hebdo indicative
    ws["B26"] = "Rappel charge"
    ws["B26"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])
    ws["B27"] = "Heures / semaine (paramètre)"
    ws["C27"] = "=Paramètres!C7"
    ws["B28"] = "Jours restants avant examen"
    ws["C28"] = "=Paramètres!C6-TODAY()"
    ws["B29"] = "Heures totales restantes (approx.)"
    ws["C29"] = "=MAX(0,C28/7)*Paramètres!C7"
    for r in (27, 28, 29):
        apply_body(ws.cell(row=r, column=2))
        apply_body(ws.cell(row=r, column=3), center=True, bold=True)
        ws.cell(row=r, column=3).fill = fill("FFF8F0")


# ---------------------------------------------------------------------------
# Feuille 5 — Bibliothèque UE
# ---------------------------------------------------------------------------
def build_bibliotheque(wb: Workbook):
    ws = wb.create_sheet("Bibliothèque UE", 4)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 55
    ws.column_dimensions["D"].width = 50

    ws["B2"] = "Bibliothèque de thèmes par UE (DSCG)"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])
    ws["B3"] = (
        "Inspire-toi de cette liste pour compléter le Planning Gantt. "
        "Copie un thème → colle-le dans une ligne vide du Gantt."
    )
    ws["B3"].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["sous_titre"])

    headers = ["UE", "Intitulé officiel / thème", "Idées de découpage"]
    for i, h in enumerate(headers, start=2):
        ws.cell(row=5, column=i, value=h)
    style_header_row(ws, 5, 2, 4)

    rows = [
        ("UE1", "Gestion juridique, fiscale et sociale",
         "Sociétés ; IS ; TVA ; contrôle fiscal ; droit social ; contentieux"),
        ("UE2", "Finance",
         "Diagnostic ; évaluation ; investissement ; financement ; ingénierie ; trésorerie"),
        ("UE3", "Management et contrôle de gestion",
         "Stratégie ; budgets ; coûts ; performance ; projet ; RH"),
        ("UE4", "Comptabilité et audit",
         "Consolidation ; IFRS ; audit légal ; contrôle interne"),
        ("UE5", "Management des systèmes d'information",
         "Gouvernance SI ; ERP ; sécurité ; data ; projets SI"),
        ("UE6", "Anglais des affaires",
         "Reading ; vocabulaire finance/audit ; rédaction ; oral"),
        ("UE7", "Relations professionnelles (mémoire)",
         "Problématique ; revue de lit. ; entretiens ; rédaction ; soutenance"),
    ]

    for i, (ue, titre, idees) in enumerate(rows):
        r = 6 + i
        ws.cell(row=r, column=2, value=ue)
        ws.cell(row=r, column=3, value=titre)
        ws.cell(row=r, column=4, value=idees)
        for col in range(2, 5):
            apply_body(ws.cell(row=r, column=col), center=(col == 2))
        ws.cell(row=r, column=2).font = Font(name="Calibri", bold=True, color=COULEURS["accent"])
        if i % 2 == 1:
            for col in range(2, 5):
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])
        ws.row_dimensions[r].height = 30

    ws["B15"] = "Méthode conseillée (cycle par thème)"
    ws["B15"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])
    cycles = [
        "1. Cours / manuel — comprendre (1ère passe)",
        "2. Fiche recto-verso — synthétiser",
        "3. Exercices ciblés — appliquer",
        "4. Annale chronométrée — condition d'examen",
        "5. Correction active — noter les erreurs récurrentes",
    ]
    for i, c in enumerate(cycles):
        ws.cell(row=16 + i, column=2, value=c).font = Font(name="Calibri", size=11)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    wb = Workbook()
    # remove default
    default = wb.active
    wb.remove(default)

    build_mode_emploi(wb)
    build_parametres(wb)
    build_gantt(wb)
    build_dashboard(wb)
    build_bibliotheque(wb)

    out = Path(__file__).resolve().parent / "DSCG1_Revisions_Gantt.xlsx"
    wb.save(out)
    print(f"Fichier créé : {out}")


if __name__ == "__main__":
    main()
