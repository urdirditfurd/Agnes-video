#!/usr/bin/env python3
"""Génère un classeur Excel de suivi annuel des révisions DSCG 1 (Gantt).

Contexte élève :
- Début : octobre 2026 → examen final octobre 2027
- Alternance : 3 j. cours / 2 j. entreprise
- Congés : 1 semaine en décembre + 3 semaines l'été
- Objectif : ne pas se perdre dans les révisions sur l'année (pas un bachotage)
"""

from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import DoughnutChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# Octobre 2026 → Octobre 2027 inclus = 13 mois
NB_MOIS = 13
DATE_DEBUT_DEFAUT = date(2026, 10, 1)
DATE_EXAMEN_DEFAUT = date(2027, 10, 15)

# Congés (dates de début de semaine)
CONGES = [
    ("Congés décembre", date(2026, 12, 21), date(2026, 12, 27), 1),
    ("Congés d'été", date(2027, 7, 19), date(2027, 8, 8), 3),
]

COULEURS = {
    "titre": "1B3A4B",
    "sous_titre": "2E6B7A",
    "en_tete": "1B3A4B",
    "en_tete_fg": "FFFFFF",
    "alt": "F0F5F7",
    "accent": "C45C26",
    "vert": "2D6A4F",
    "vert_clair": "95D5B2",
    "orange": "E09F3E",
    "rouge": "C1121F",
    "bleu_gantt": "457B9D",
    "bleu_clair": "A8DADC",
    "gris": "6C757D",
    "violet": "7B2D8E",
    "ligne": "CED4DA",
    "saisie": "FFF8F0",
    "conges": "D4E6F1",
    "entreprise": "FDEBD0",
    "cours": "D5F5E3",
}

MAITRISES = ["Non commencé", "En cours", "Vu une fois", "À consolider", "Acquis"]
PRIORITES = ["Haute", "Moyenne", "Basse"]
TYPES = ["Cours", "Exercices", "Fiches", "Annales", "Relecture", "Mixte"]
ETAPES = ["Pas vu", "Cours OK", "Fiche OK", "Exos OK", "Reprise OK"]

# (UE, thème, type, priorité, mois_debut, mois_fin, maîtrise, nb_passages)
# mois = 1..13 relatifs à oct. 2026 (1=oct26 … 13=oct27)
THEMES = [
    # —— Trimestre 1 : oct–déc 2026 (mois 1–3) ——
    ("UE1", "Droit des sociétés — bases", "Cours", "Haute", 1, 2, "Non commencé", 0),
    ("UE2", "Diagnostic financier", "Cours", "Haute", 1, 2, "Non commencé", 0),
    ("UE4", "Consolidation — méthodes", "Cours", "Haute", 1, 3, "Non commencé", 0),
    ("UE6", "Anglais — vocabulaire finance (fil rouge)", "Fiches", "Moyenne", 1, 13, "Non commencé", 0),
    ("UE1", "Droit des sociétés — opérations", "Cours", "Haute", 2, 3, "Non commencé", 0),
    ("UE2", "Tableaux de flux & ratios", "Exercices", "Haute", 2, 3, "Non commencé", 0),
    ("TRANSVERSE", "Bilan T1 — ce que je maîtrise vraiment", "Mixte", "Haute", 3, 3, "Non commencé", 0),
    # —— Trimestre 2 : jan–mars 2027 (mois 4–6) ——
    ("UE1", "Fiscalité — IS & intégration", "Cours", "Haute", 4, 5, "Non commencé", 0),
    ("UE4", "Consolidation — écarts & variations", "Exercices", "Haute", 4, 5, "Non commencé", 0),
    ("UE3", "Pilotage stratégique & BSC", "Cours", "Moyenne", 4, 5, "Non commencé", 0),
    ("UE2", "Évaluation d'entreprise", "Cours", "Haute", 5, 6, "Non commencé", 0),
    ("UE1", "Fiscalité — TVA", "Exercices", "Moyenne", 5, 6, "Non commencé", 0),
    ("UE4", "IFRS — immobilisations", "Cours", "Haute", 5, 6, "Non commencé", 0),
    ("UE1", "Reprise T1 — sociétés (2e passage)", "Relecture", "Haute", 5, 6, "Non commencé", 0),
    ("UE2", "Reprise T1 — diagnostic (2e passage)", "Relecture", "Haute", 5, 6, "Non commencé", 0),
    ("TRANSVERSE", "Bilan T2 — ce que je maîtrise vraiment", "Mixte", "Haute", 6, 6, "Non commencé", 0),
    # —— Trimestre 3 : avr–juin 2027 (mois 7–9) ——
    ("UE1", "Droit social — contrat & rupture", "Cours", "Haute", 7, 8, "Non commencé", 0),
    ("UE2", "Investissement VAN / TRI", "Exercices", "Haute", 7, 8, "Non commencé", 0),
    ("UE3", "Contrôle de gestion — coûts & budgets", "Exercices", "Haute", 7, 8, "Non commencé", 0),
    ("UE4", "IFRS — instruments & suite", "Cours", "Haute", 7, 8, "Non commencé", 0),
    ("UE5", "Gouvernance SI & ERP", "Cours", "Basse", 7, 8, "Non commencé", 0),
    ("UE2", "Financement & structure du capital", "Cours", "Moyenne", 8, 9, "Non commencé", 0),
    ("UE4", "Audit — démarche & risques", "Cours", "Moyenne", 8, 9, "Non commencé", 0),
    ("UE4", "Reprise consolidation (2e passage)", "Relecture", "Haute", 8, 9, "Non commencé", 0),
    ("UE1", "Reprise fiscalité (2e passage)", "Relecture", "Haute", 8, 9, "Non commencé", 0),
    ("TRANSVERSE", "Bilan T3 — avant l'été", "Mixte", "Haute", 9, 9, "Non commencé", 0),
    # —— Été + rentrée examen : juil–oct 2027 (mois 10–13) ——
    # juil–août = congés 3 sem. → révision légère / fiches seulement
    ("TRANSVERSE", "Été — fiches express (léger, hors congés)", "Fiches", "Moyenne", 10, 11, "Non commencé", 0),
    ("UE2", "Ingénierie financière", "Cours", "Moyenne", 10, 11, "Non commencé", 0),
    ("UE3", "Gestion de projet & organisation", "Cours", "Basse", 10, 11, "Non commencé", 0),
    ("UE5", "Sécurité & transformation digitale", "Fiches", "Basse", 11, 11, "Non commencé", 0),
    ("UE6", "Anglais — comprehension écrite (boost)", "Exercices", "Moyenne", 11, 12, "Non commencé", 0),
    ("UE1", "Consolidation UE1 — annales", "Annales", "Haute", 12, 13, "Non commencé", 0),
    ("UE2", "Consolidation UE2 — annales", "Annales", "Haute", 12, 13, "Non commencé", 0),
    ("UE4", "Consolidation UE4 — annales", "Annales", "Haute", 12, 13, "Non commencé", 0),
    ("UE3", "Consolidation UE3 — annales", "Annales", "Moyenne", 12, 13, "Non commencé", 0),
    ("TRANSVERSE", "Dernier mois — planning des trous", "Mixte", "Haute", 13, 13, "Non commencé", 0),
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


def build_mode_emploi(wb: Workbook):
    ws = wb.create_sheet("Mode d'emploi", 0)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 98

    ws["B2"] = "DSCG 1 — Suivi des révisions sur l'année (alternance)"
    ws["B2"].font = Font(name="Calibri", size=20, bold=True, color=COULEURS["titre"])

    ws["B3"] = (
        "Carte de navigation oct. 2026 → oct. 2027 : savoir où tu en es, quoi reprendre, "
        "et ne rien laisser filer — sans bachoter."
    )
    ws["B3"].font = Font(name="Calibri", size=12, italic=True, color=COULEURS["sous_titre"])

    etapes = [
        (
            "1. Ton rythme (onglet Mon rythme)",
            "3 j. cours + 2 j. entreprise, 1 sem. de congés en décembre, 3 sem. l'été. "
            "C'est ta réalité : les heures de révision perso sont calibrées là-dessus.",
        ),
        (
            "2. Paramètres",
            "Début = 01/10/2026, examen = ~15/10/2027. Tu peux ajuster le délai entre "
            "deux passages d'un thème (révisions espacées) et tes heures dispo / semaine.",
        ),
        (
            "3. Planning Gantt (outil principal)",
            "1 ligne = 1 thème. Zone jaune = saisie (maîtrise, dernière révision, "
            "nb passages, étapes, notes). Les barres montrent les mois prévus. "
            "Les mois de congés sont marqués en bleu clair dans le calendrier.",
        ),
        (
            "4. Ne pas te perdre",
            "Colonne Alerte : « À reprendre », « Période en cours », « À consolider ». "
            "Chaque dimanche (5 min) : filtre les alertes → choisis 2 thèmes max pour la semaine.",
        ),
        (
            "5. Alternance = peu de créneaux",
            "Priorise la qualité : 1 thème bien repris > 5 thèmes survolés. "
            "Les soirs d'entreprise = fiches / annales courtes. Les soirs de cours = "
            "reprendre le chapitre du jour + 1 ancien thème.",
        ),
        (
            "6. Congés",
            "Décembre (1 sem.) : pause réelle, éventuellement 1 fiche légère. "
            "Été (3 sem.) : pause, puis reprise douce via la ligne « fiches express ».",
        ),
    ]

    row = 5
    for titre, texte in etapes:
        ws.cell(row=row, column=2, value=titre).font = Font(
            name="Calibri", size=13, bold=True, color=COULEURS["accent"]
        )
        cell = ws.cell(row=row + 1, column=2, value=texte)
        cell.font = Font(name="Calibri", size=11)
        cell.alignment = Alignment(wrap_text=True)
        ws.row_dimensions[row + 1].height = 42
        row += 3

    ws.cell(row=row + 1, column=2, value="Ce que ce classeur n'est pas").font = Font(
        name="Calibri", size=13, bold=True, color=COULEURS["titre"]
    )
    ws.cell(
        row=row + 3,
        column=2,
        value=(
            "Pas un planning de bachotage pré-examen. C'est un fil rouge sur 13 mois "
            "pour suivre tes acquis au fil des cours, avec des reprises espacées."
        ),
    ).font = Font(name="Calibri", size=11, italic=True)


def build_mon_rythme(wb: Workbook):
    ws = wb.create_sheet("Mon rythme", 1)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 28
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["D"].width = 18
    ws.column_dimensions["E"].width = 18
    ws.column_dimensions["F"].width = 40

    ws["B2"] = "Mon rythme — alternance & congés"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    ws["B3"] = (
        "Semaine type et périodes sans cours. Modifie si ton planning d'entreprise change."
    )
    ws["B3"].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["sous_titre"])

    # Semaine type
    ws["B5"] = "Semaine type"
    ws["B5"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    headers = ["Jour", "Lieu", "Révision perso conseillée", "Durée indicative"]
    for i, h in enumerate(headers, start=2):
        ws.cell(row=6, column=i, value=h)
    style_header_row(ws, 6, 2, 5)

    semaine = [
        ("Lundi", "Cours", "Reprendre le cours du jour + 1 ancien thème", "45–60 min"),
        ("Mardi", "Cours", "Exercices du chapitre en cours", "45–60 min"),
        ("Mercredi", "Cours", "Fiche du chapitre de la semaine", "30–45 min"),
        ("Jeudi", "Entreprise", "Fiches / flashcards (léger)", "20–30 min"),
        ("Vendredi", "Entreprise", "1 exercice court OU rien si fatigue", "0–30 min"),
        ("Samedi", "Perso", "Bloc révision (thème Alerte)", "1h30–2h"),
        ("Dimanche", "Perso", "Bilan 5 min + planning semaine suivante", "15 min"),
    ]
    for i, (jour, lieu, conseil, duree) in enumerate(semaine):
        r = 7 + i
        ws.cell(row=r, column=2, value=jour)
        ws.cell(row=r, column=3, value=lieu)
        ws.cell(row=r, column=4, value=conseil)
        ws.cell(row=r, column=5, value=duree)
        for col in range(2, 6):
            apply_body(ws.cell(row=r, column=col), center=(col in (2, 3, 5)))
        if lieu == "Cours":
            ws.cell(row=r, column=3).fill = fill(COULEURS["cours"])
        elif lieu == "Entreprise":
            ws.cell(row=r, column=3).fill = fill(COULEURS["entreprise"])
        else:
            ws.cell(row=r, column=3).fill = fill(COULEURS["bleu_clair"])

    ws["B15"] = "Charge réaliste / semaine"
    ws["B15"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])
    ws["B16"] = "Heures révision perso (hors cours)"
    ws["C16"] = 6
    ws["D16"] = "→ recopié dans Paramètres!C7 (tu peux modifier là-bas)"
    ws["C16"].fill = fill(COULEURS["saisie"])
    ws["C16"].border = thin_border()
    ws["C16"].font = Font(name="Calibri", bold=True, color=COULEURS["accent"])
    apply_body(ws["B16"])

    ws["B18"] = "Congés (pas de bachotage)"
    ws["B18"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    for i, h in enumerate(["Période", "Début", "Fin", "Semaines", "Consigne"], start=2):
        ws.cell(row=19, column=i, value=h)
    style_header_row(ws, 19, 2, 6)

    for i, (nom, deb, fin, sem) in enumerate(CONGES):
        r = 20 + i
        consigne = (
            "Pause réelle — 1 fiche max si tu en as envie"
            if sem == 1
            else "3 semaines off, puis reprise douce (fiches express)"
        )
        ws.cell(row=r, column=2, value=nom)
        ws.cell(row=r, column=3, value=deb)
        ws.cell(row=r, column=4, value=fin)
        ws.cell(row=r, column=5, value=sem)
        ws.cell(row=r, column=6, value=consigne)
        ws.cell(row=r, column=3).number_format = "DD/MM/YYYY"
        ws.cell(row=r, column=4).number_format = "DD/MM/YYYY"
        for col in range(2, 7):
            apply_body(ws.cell(row=r, column=col), center=(col in (3, 4, 5)))
            ws.cell(row=r, column=col).fill = fill(COULEURS["conges"])

    ws["B24"] = "Règles d'or en alternance"
    ws["B24"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["accent"])
    regles = [
        "• Max 2 thèmes de révision perso par semaine (sinon tu te disperses).",
        "• Après chaque cours : note dans le Gantt si le chapitre est « En cours » ou « Vu une fois ».",
        "• Un thème « Acquis » qui coinçe en TD → repasse-le immédiatement en « À consolider ».",
        "• Les soirs d'entreprise : jamais de nouveau chapitre lourd — fiches ou rien.",
        "• Dimanche = seul moment de pilotage (alertes + choix de la semaine).",
    ]
    for i, regle in enumerate(regles):
        ws.cell(row=25 + i, column=2, value=regle).font = Font(name="Calibri", size=11)


def build_parametres(wb: Workbook):
    ws = wb.create_sheet("Paramètres", 2)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 42
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["D"].width = 55

    ws["B2"] = "Paramètres de l'année"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    labels = [
        ("B4", "Prénom / Identifiant", "C4", "Élève DSCG 1", "Optionnel"),
        ("B5", "Début (1er mois du Gantt)", "C5", DATE_DEBUT_DEFAUT, "Octobre 2026"),
        ("B6", "Examen final (repère)", "C6", DATE_EXAMEN_DEFAUT, "Octobre 2027 — pas un compte à rebours stressant"),
        ("B7", "Heures révision perso / semaine", "C7", 6, "Calé sur ton rythme alternance (voir Mon rythme)"),
        (
            "B8",
            "Délai entre 2 passages (jours)",
            "C8",
            45,
            "Révisions espacées : ~6 semaines entre deux passages",
        ),
    ]

    for b, label, c, value, aide in labels:
        ws[b] = label
        ws[b].font = Font(name="Calibri", size=11, bold=True)
        ws[c] = value
        ws[c].fill = fill(COULEURS["saisie"])
        ws[c].border = thin_border()
        ws[c].font = Font(name="Calibri", size=11, color=COULEURS["accent"], bold=True)
        ws[c].alignment = Alignment(horizontal="center")
        ws["D" + c[1:]] = aide
        ws["D" + c[1:]].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["gris"])

    ws["C5"].number_format = "DD/MM/YYYY"
    ws["C6"].number_format = "DD/MM/YYYY"

    ws["B10"] = "Calendrier des 13 mois (oct. 2026 → oct. 2027)"
    ws["B10"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    ws["B11"] = "N° mois"
    ws["C11"] = "1er jour du mois"
    ws["D11"] = "Libellé Gantt"
    ws["E11"] = "Repère"
    style_header_row(ws, 11, 2, 5)
    ws.column_dimensions["E"].width = 28

    # Mois avec congés partiels
    conges_mois = {3: "Congés déc. (1 sem.)", 10: "Congés été (début)", 11: "Congés été (suite)"}

    for i in range(1, NB_MOIS + 1):
        r = 11 + i
        ws.cell(row=r, column=2, value=i)
        ws.cell(row=r, column=3, value=f"=EDATE($C$5,{i}-1)")
        ws.cell(row=r, column=3).number_format = "DD/MM/YYYY"
        ws.cell(row=r, column=4, value=f'=TEXT(C{r},"MMM YY")')
        repere = conges_mois.get(i, "")
        if i == 13:
            repere = "Mois de l'examen"
        ws.cell(row=r, column=5, value=repere)
        for col in range(2, 6):
            apply_body(ws.cell(row=r, column=col), center=(col != 5))
        if i in conges_mois:
            for col in range(2, 6):
                ws.cell(row=r, column=col).fill = fill(COULEURS["conges"])
        elif i % 2 == 0:
            for col in range(2, 6):
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])

    note = ws["B27"]
    note.value = (
        "Ne renomme pas cet onglet ni C5/C8 : le Planning Gantt s'y réfère."
    )
    note.font = Font(name="Calibri", size=10, italic=True, color=COULEURS["rouge"])


def build_gantt(wb: Workbook):
    ws = wb.create_sheet("Planning Gantt", 3)
    ws.freeze_panes = "J5"
    ws.sheet_view.showGridLines = False

    widths = {
        "A": 3,
        "B": 11,
        "C": 46,
        "D": 11,
        "E": 10,
        "F": 14,
        "G": 13,
        "H": 13,
        "I": 11,
        "J": 14,
        "K": 12,
        "L": 26,
    }
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    first_month_col = 13  # M
    for i in range(NB_MOIS):
        ws.column_dimensions[get_column_letter(first_month_col + i)].width = 5.8

    ws.merge_cells("B2:L2")
    ws["B2"] = "Planning Gantt — fil rouge oct. 2026 → oct. 2027"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    ws.merge_cells("B3:L3")
    ws["B3"] = (
        "Jaune = saisie  •  Alerte = ce qu'il faut regarder dimanche  •  "
        "Barres = mois prévus  •  Déc / été = congés (ne surcharge pas)"
    )
    ws["B3"].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["sous_titre"])

    headers = [
        (2, "UE"),
        (3, "Thème / Chapitre"),
        (4, "Type"),
        (5, "Priorité"),
        (6, "Maîtrise"),
        (7, "Dernière rév."),
        (8, "Prochaine rév."),
        (9, "Nb passages"),
        (10, "Alerte"),
        (11, "Étape"),
        (12, "Notes / bloquants"),
    ]
    for col, title in headers:
        ws.cell(row=4, column=col, value=title)
    style_header_row(ws, 4, 2, 12)

    # Mois congés pour colorer l'en-tête
    conges_mois_nums = {3, 10, 11}  # déc 26, juil 27, août 27

    for i in range(NB_MOIS):
        col = first_month_col + i
        cell = ws.cell(row=4, column=col, value=f"=Paramètres!D{12 + i}")
        if (i + 1) in conges_mois_nums:
            cell.fill = fill("5B8FA8")  # bleu congés distinct
        else:
            cell.fill = fill(COULEURS["en_tete"])
        cell.font = Font(name="Calibri", bold=True, color=COULEURS["en_tete_fg"], size=8)
        cell.alignment = Alignment(
            horizontal="center", vertical="center", wrap_text=True, textRotation=90
        )
        cell.border = thin_border()
    ws.row_dimensions[4].height = 72

    dv_maitrise = DataValidation(
        type="list", formula1='"' + ",".join(MAITRISES) + '"', allow_blank=True
    )
    dv_prio = DataValidation(
        type="list", formula1='"' + ",".join(PRIORITES) + '"', allow_blank=True
    )
    dv_type = DataValidation(
        type="list", formula1='"' + ",".join(TYPES) + '"', allow_blank=True
    )
    dv_etape = DataValidation(
        type="list", formula1='"' + ",".join(ETAPES) + '"', allow_blank=True
    )
    dv_ue = DataValidation(
        type="list",
        formula1='"UE1,UE2,UE3,UE4,UE5,UE6,UE7,TRANSVERSE"',
        allow_blank=True,
    )
    for dv in (dv_maitrise, dv_prio, dv_type, dv_etape, dv_ue):
        ws.add_data_validation(dv)

    max_rows = 50
    data_start = 5

    for idx in range(max_rows):
        r = data_start + idx
        ws.row_dimensions[r].height = 22

        if idx < len(THEMES):
            ue, theme, typ, prio, m_deb, m_fin, maitrise, nb = THEMES[idx]
            etape = "Pas vu"
        else:
            ue = theme = typ = prio = maitrise = etape = None
            m_deb = m_fin = nb = None

        for col, val in {
            2: ue,
            3: theme,
            4: typ,
            5: prio,
            6: maitrise,
            9: nb,
            11: etape,
        }.items():
            cell = ws.cell(row=r, column=col, value=val)
            apply_body(cell, center=(col != 3))
            cell.fill = fill(COULEURS["saisie"])

        cell_dr = ws.cell(row=r, column=7, value=None)
        apply_body(cell_dr, center=True)
        cell_dr.fill = fill(COULEURS["saisie"])
        cell_dr.number_format = "DD/MM/YYYY"

        next_formula = f'=IF(C{r}="","",IF(G{r}="","",G{r}+Paramètres!$C$8))'
        cell_pr = ws.cell(row=r, column=8, value=next_formula)
        apply_body(cell_pr, center=True)
        cell_pr.number_format = "DD/MM/YYYY"

        cell_n = ws.cell(row=r, column=12, value=None)
        apply_body(cell_n)
        cell_n.fill = fill(COULEURS["saisie"])

        if m_deb is not None:
            # Période en cours si mois actuel entre début et fin (via EDATE)
            alerte = (
                f'=IF(C{r}="","",'
                f'IF(AND(F{r}<>"Acquis",H{r}<>"",H{r}<TODAY()),"À reprendre",'
                f'IF(F{r}="À consolider","À consolider",'
                f'IF(AND(F{r}="Non commencé",'
                f'TODAY()>=EDATE(Paramètres!$C$5,{m_deb - 1}),'
                f'TODAY()<EDATE(Paramètres!$C$5,{m_fin})),'
                f'"Période en cours","OK"))))'
            )
        else:
            alerte = (
                f'=IF(C{r}="","",'
                f'IF(AND(F{r}<>"Acquis",H{r}<>"",H{r}<TODAY()),"À reprendre",'
                f'IF(F{r}="À consolider","À consolider","OK")))'
            )
        cell_a = ws.cell(row=r, column=10, value=alerte)
        apply_body(cell_a, center=True)

        for i in range(NB_MOIS):
            col = first_month_col + i
            mois_num = i + 1
            if m_deb is not None and m_fin is not None:
                formula = (
                    f'=IF(C{r}="","",IF(AND({mois_num}>={m_deb},{mois_num}<={m_fin}),1,""))'
                )
            else:
                formula = '=""'
            cell = ws.cell(row=r, column=col, value=formula)
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border()
            cell.font = Font(color="FFFFFF", size=1)

        dv_ue.add(f"B{r}")
        dv_type.add(f"D{r}")
        dv_prio.add(f"E{r}")
        dv_maitrise.add(f"F{r}")
        dv_etape.add(f"K{r}")

    last_data = data_start + max_rows - 1
    last_month_letter = get_column_letter(first_month_col + NB_MOIS - 1)
    gantt_range = f"M{data_start}:{last_month_letter}{last_data}"

    rules = [
        (f'AND(M{data_start}=1,$F{data_start}="Acquis")', COULEURS["vert"]),
        (f'AND(M{data_start}=1,$F{data_start}="À consolider")', COULEURS["rouge"]),
        (f'AND(M{data_start}=1,$F{data_start}="Vu une fois")', COULEURS["violet"]),
        (f'AND(M{data_start}=1,$F{data_start}="En cours")', COULEURS["orange"]),
        (f'AND(M{data_start}=1,$F{data_start}="Non commencé")', COULEURS["bleu_gantt"]),
    ]
    for formula, couleur in rules:
        ws.conditional_formatting.add(
            gantt_range, FormulaRule(formula=[formula], fill=fill(couleur))
        )

    for maitrise, couleur in [
        ("Acquis", COULEURS["vert_clair"]),
        ("En cours", "FCE4B3"),
        ("Vu une fois", "E0C3FC"),
        ("À consolider", "F5C2C7"),
        ("Non commencé", COULEURS["bleu_clair"]),
    ]:
        ws.conditional_formatting.add(
            f"F{data_start}:F{last_data}",
            CellIsRule(operator="equal", formula=[f'"{maitrise}"'], fill=fill(couleur)),
        )

    for alerte, couleur in [
        ("À reprendre", "F5C2C7"),
        ("Période en cours", "FCE4B3"),
        ("À consolider", "F5C2C7"),
        ("OK", COULEURS["vert_clair"]),
    ]:
        ws.conditional_formatting.add(
            f"J{data_start}:J{last_data}",
            CellIsRule(operator="equal", formula=[f'"{alerte}"'], fill=fill(couleur)),
        )

    for prio, couleur in [
        ("Haute", "F5C2C7"),
        ("Moyenne", "FCE4B3"),
        ("Basse", COULEURS["vert_clair"]),
    ]:
        ws.conditional_formatting.add(
            f"E{data_start}:E{last_data}",
            CellIsRule(operator="equal", formula=[f'"{prio}"'], fill=fill(couleur)),
        )

    legend_row = last_data + 2
    ws.cell(row=legend_row, column=2, value="Légende").font = Font(
        name="Calibri", bold=True, size=11, color=COULEURS["titre"]
    )
    legendes = [
        (3, "Non commencé", COULEURS["bleu_gantt"]),
        (4, "En cours", COULEURS["orange"]),
        (5, "Vu une fois", COULEURS["violet"]),
        (6, "À consolider", COULEURS["rouge"]),
        (7, "Acquis", COULEURS["vert"]),
    ]
    for col, label, couleur in legendes:
        cell = ws.cell(row=legend_row, column=col, value=label)
        cell.fill = fill(couleur)
        cell.font = Font(name="Calibri", bold=True, color="FFFFFF", size=9)
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border()

    tip_row = legend_row + 2
    ws.merge_cells(start_row=tip_row, start_column=2, end_row=tip_row, end_column=12)
    ws.cell(
        row=tip_row,
        column=2,
        value=(
            "Routine dimanche (5 min) : filtre Alerte ≠ OK → choisis 2 thèmes max → "
            "après chaque séance : Maîtrise + Dernière rév. + Nb passages + Étape."
        ),
    ).font = Font(name="Calibri", size=9, italic=True, color=COULEURS["sous_titre"])

    ws.print_title_rows = "4:4"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0


def build_dashboard(wb: Workbook):
    ws = wb.create_sheet("Tableau de bord", 4)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    for col, w in enumerate([26, 14, 14, 14, 16, 14], start=2):
        ws.column_dimensions[get_column_letter(col)].width = w
    ws.column_dimensions["H"].width = 18
    ws.column_dimensions["I"].width = 12

    ws["B2"] = "Tableau de bord — où j'en suis"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])

    ws["B3"] = (
        '=CONCATENATE("Année : ",TEXT(Paramètres!C5,"DD/MM/YYYY"),'
        '" → examen ",TEXT(Paramètres!C6,"DD/MM/YYYY"))'
    )
    ws["B3"].font = Font(name="Calibri", size=11, italic=True, color=COULEURS["sous_titre"])

    kpis = [
        ("B5", "Thèmes suivis", "C5", "=COUNTA('Planning Gantt'!C5:C54)"),
        ("B6", "Acquis", "C6", '=COUNTIF(\'Planning Gantt\'!F5:F54,"Acquis")'),
        ("B7", "À consolider", "C7", '=COUNTIF(\'Planning Gantt\'!F5:F54,"À consolider")'),
        (
            "B8",
            "Alertes actives",
            "C8",
            (
                '=COUNTIF(\'Planning Gantt\'!J5:J54,"À reprendre")'
                '+COUNTIF(\'Planning Gantt\'!J5:J54,"Période en cours")'
                '+COUNTIF(\'Planning Gantt\'!J5:J54,"À consolider")'
            ),
        ),
        ("B9", "Passages cumulés", "C9", "=SUM('Planning Gantt'!I5:I54)"),
    ]
    for label_cell, label, value_cell, formula in kpis:
        ws[label_cell] = label
        ws[label_cell].font = Font(name="Calibri", size=11, bold=True)
        ws[label_cell].fill = fill(COULEURS["alt"])
        ws[label_cell].border = thin_border()
        ws[value_cell] = formula
        ws[value_cell].font = Font(
            name="Calibri", size=14, bold=True, color=COULEURS["accent"]
        )
        ws[value_cell].alignment = Alignment(horizontal="center")
        ws[value_cell].border = thin_border()
        ws[value_cell].fill = fill(COULEURS["saisie"])

    ws["B11"] = "Couverture par UE"
    ws["B11"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])

    headers = ["UE", "Nb thèmes", "Acquis", "À consolider", "Non commencé", "% acquis"]
    for i, h in enumerate(headers, start=2):
        ws.cell(row=12, column=i, value=h)
    style_header_row(ws, 12, 2, 7)

    ues = ["UE1", "UE2", "UE3", "UE4", "UE5", "UE6", "UE7", "TRANSVERSE"]
    for i, ue in enumerate(ues):
        r = 13 + i
        ws.cell(row=r, column=2, value=ue)
        ws.cell(row=r, column=3, value=f"=COUNTIF('Planning Gantt'!B:B,B{r})")
        ws.cell(
            row=r,
            column=4,
            value=f'=COUNTIFS(\'Planning Gantt\'!B:B,B{r},\'Planning Gantt\'!F:F,"Acquis")',
        )
        ws.cell(
            row=r,
            column=5,
            value=(
                f'=COUNTIFS(\'Planning Gantt\'!B:B,B{r},'
                f'\'Planning Gantt\'!F:F,"À consolider")'
            ),
        )
        ws.cell(
            row=r,
            column=6,
            value=(
                f'=COUNTIFS(\'Planning Gantt\'!B:B,B{r},'
                f'\'Planning Gantt\'!F:F,"Non commencé")'
            ),
        )
        ws.cell(row=r, column=7, value=f'=IF(C{r}=0,"",D{r}/C{r})')
        ws.cell(row=r, column=7).number_format = "0%"
        for col in range(2, 8):
            apply_body(ws.cell(row=r, column=col), center=(col > 2))
            if i % 2 == 1:
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])

    ws["H5"] = "Maîtrise"
    ws["I5"] = "Nombre"
    style_header_row(ws, 5, 8, 9)
    for i, m in enumerate(MAITRISES):
        r = 6 + i
        ws.cell(row=r, column=8, value=m)
        ws.cell(row=r, column=9, value=f"=COUNTIF('Planning Gantt'!F:F,H{r})")
        apply_body(ws.cell(row=r, column=8))
        apply_body(ws.cell(row=r, column=9), center=True)

    chart = DoughnutChart()
    chart.title = "Répartition des maîtrises"
    labels = Reference(ws, min_col=8, min_row=6, max_row=10)
    data = Reference(ws, min_col=9, min_row=5, max_row=10)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(labels)
    chart.dataLabels = DataLabelList()
    chart.dataLabels.showPercent = True
    chart.dataLabels.showVal = False
    chart.width = 12
    chart.height = 8
    ws.add_chart(chart, "H12")

    ws["B23"] = "Cette semaine (rappels)"
    ws["B23"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["accent"])
    steps = [
        "1. Planning Gantt → filtre Alerte ≠ OK.",
        "2. Choisis 2 thèmes max (priorité Haute, compatible avec 6 h perso / semaine).",
        "3. Soirs cours = chapitre du jour + 1 reprise. Soirs entreprise = fiches légères.",
        "4. Dimanche = 15 min de pilotage, pas de session marathon.",
    ]
    for i, s in enumerate(steps):
        ws.cell(row=24 + i, column=2, value=s).font = Font(name="Calibri", size=11)

    ws["B29"] = "Repères année"
    ws["B29"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])
    ws["B30"] = "Heures perso / semaine"
    ws["C30"] = "=Paramètres!C7"
    ws["B31"] = "Délai entre passages (j)"
    ws["C31"] = "=Paramètres!C8"
    ws["B32"] = "Jours avant l'examen (info)"
    ws["C32"] = "=Paramètres!C6-TODAY()"
    for r in (30, 31, 32):
        apply_body(ws.cell(row=r, column=2))
        apply_body(ws.cell(row=r, column=3), center=True, bold=True)
        ws.cell(row=r, column=3).fill = fill(COULEURS["saisie"])


def build_bibliotheque(wb: Workbook):
    ws = wb.create_sheet("Bibliothèque UE", 5)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 55
    ws.column_dimensions["D"].width = 55

    ws["B2"] = "Bibliothèque de thèmes par UE"
    ws["B2"].font = Font(name="Calibri", size=18, bold=True, color=COULEURS["titre"])
    ws["B3"] = (
        "Ajoute ce dont tu as besoin dans le Gantt (copie une ligne existante). "
        "Découpe large au début, affine au fil des cours."
    )
    ws["B3"].font = Font(name="Calibri", size=10, italic=True, color=COULEURS["sous_titre"])

    headers = ["UE", "Intitulé", "Découpage possible"]
    for i, h in enumerate(headers, start=2):
        ws.cell(row=5, column=i, value=h)
    style_header_row(ws, 5, 2, 4)

    rows = [
        ("UE1", "Gestion juridique, fiscale et sociale",
         "Sociétés ; IS ; TVA ; contrôle fiscal ; droit social"),
        ("UE2", "Finance",
         "Diagnostic ; évaluation ; investissement ; financement ; ingénierie"),
        ("UE3", "Management et contrôle de gestion",
         "Stratégie ; budgets ; coûts ; performance ; projet"),
        ("UE4", "Comptabilité et audit",
         "Consolidation ; IFRS ; audit ; contrôle interne"),
        ("UE5", "Management des SI",
         "Gouvernance SI ; ERP ; sécurité ; data"),
        ("UE6", "Anglais des affaires",
         "Vocabulaire ; reading — fil rouge toute l'année"),
        ("UE7", "Relations professionnelles",
         "Problématique ; lit. ; terrain ; rédaction"),
    ]
    for i, (ue, titre, idees) in enumerate(rows):
        r = 6 + i
        ws.cell(row=r, column=2, value=ue)
        ws.cell(row=r, column=3, value=titre)
        ws.cell(row=r, column=4, value=idees)
        for col in range(2, 5):
            apply_body(ws.cell(row=r, column=col), center=(col == 2))
        ws.cell(row=r, column=2).font = Font(
            name="Calibri", bold=True, color=COULEURS["accent"]
        )
        if i % 2 == 1:
            for col in range(2, 5):
                ws.cell(row=r, column=col).fill = fill(COULEURS["alt"])
        ws.row_dimensions[r].height = 30

    ws["B15"] = "Cycle sur l'année (par thème)"
    ws["B15"].font = Font(name="Calibri", size=13, bold=True, color=COULEURS["sous_titre"])
    cycles = [
        "1. Découverte en cours → Maîtrise « En cours », Étape « Cours OK »",
        "2. Exercices dans les 2–4 semaines → Étape « Exos OK »",
        "3. Reprise espacée (~6 sem.) → ligne « 2e passage » ou Nb passages +1",
        "4. Si trou → « À consolider » tout de suite, même en milieu d'année",
        "5. Annales seulement quand le thème est au moins « Vu une fois »",
    ]
    for i, c in enumerate(cycles):
        ws.cell(row=16 + i, column=2, value=c).font = Font(name="Calibri", size=11)


def main():
    wb = Workbook()
    wb.remove(wb.active)
    build_mode_emploi(wb)
    build_mon_rythme(wb)
    build_parametres(wb)
    build_gantt(wb)
    build_dashboard(wb)
    build_bibliotheque(wb)
    out = Path(__file__).resolve().parent / "DSCG1_Revisions_Gantt.xlsx"
    wb.save(out)
    print(f"Fichier créé : {out}")
    print(f"Thèmes : {len(THEMES)} | Mois : {NB_MOIS} | {DATE_DEBUT_DEFAUT} → {DATE_EXAMEN_DEFAUT}")


if __name__ == "__main__":
    main()
