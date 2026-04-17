# -*- coding: utf-8 -*-
"""
collect_data.py - Collecte des donnees du prix du petrole Brent
Tente d'abord l'API EIA, puis genere des donnees simulees si indisponible.
"""

import pandas as pd
import numpy as np
import requests
import os
from datetime import datetime

# Chemin de sauvegarde
RAW_PATH = os.path.join("data", "raw", "prix_brent.csv")


def telecharger_depuis_eia():
    """Tente de telecharger les donnees depuis l'API publique EIA."""
    url = (
        "https://api.eia.gov/v2/petroleum/pri/spt/data/"
        "?api_key=DEMO"
        "&frequency=weekly"
        "&data[0]=value"
        "&facets[series][]=RBRTE"
        "&sort[0][column]=period"
        "&sort[0][direction]=desc"
        "&length=600"
    )
    print("[INFO] Tentative de connexion a l'API EIA...")
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        json_data = response.json()

        # Extraction des donnees depuis la reponse JSON
        donnees = json_data.get("response", {}).get("data", [])
        if not donnees:
            print("[WARN] L'API EIA n'a retourne aucune donnee.")
            return None

        df = pd.DataFrame(donnees)
        df = df.rename(columns={"period": "date", "value": "prix"})
        df["date"] = pd.to_datetime(df["date"])
        df["prix"] = pd.to_numeric(df["prix"], errors="coerce")
        df = df[["date", "prix"]].dropna().sort_values("date").reset_index(drop=True)
        print("[OK] " + str(len(df)) + " enregistrements recuperes depuis l'API EIA.")
        return df

    except requests.exceptions.RequestException as e:
        print("[ERREUR] Reseau : " + str(e))
        return None
    except Exception as e:
        print("[ERREUR] Parsing EIA : " + str(e))
        return None


def generer_donnees_simulees():
    """
    Genere un dataset simule realiste du prix du Brent (2015 - avril 2026).
    Inclut les chocs majeurs : COVID-19 (2020), guerre Ukraine (2022),
    et la correction baissiere de 2025-2026.
    """
    print("[INFO] Generation de donnees simulees realistes (2015-2026)...")

    np.random.seed(42)
    debut = datetime(2015, 1, 5)
    fin   = datetime(2026, 4, 13)   # Derniere semaine connue (avril 2026)

    # Toutes les dates hebdomadaires (lundi)
    dates = pd.date_range(start=debut, end=fin, freq="W-MON")
    n = len(dates)

    # Prix de base avec tendance longue
    prix = np.zeros(n)
    prix[0] = 55.0  # prix de depart ($/baril)

    for i in range(1, n):
        semaine = dates[i].isocalendar()[1]
        d = dates[i].to_pydatetime()

        # Choc COVID : effondrement mars-avril 2020, puis rebond
        if datetime(2020, 3, 1) <= d <= datetime(2020, 4, 30):
            derive = -1.8
        elif datetime(2020, 5, 1) <= d <= datetime(2021, 6, 30):
            derive = +0.5
        # Choc guerre Ukraine : envolee debut 2022
        elif datetime(2022, 2, 20) <= d <= datetime(2022, 6, 30):
            derive = +1.2
        elif datetime(2022, 7, 1) <= d <= datetime(2022, 12, 31):
            derive = -0.6
        # Tendance haussiere 2017-2018
        elif 2017 <= dates[i].year <= 2018:
            derive = +0.3
        # Effondrement fin 2018
        elif datetime(2018, 10, 1) <= d <= datetime(2019, 1, 31):
            derive = -0.8
        # Stabilisation 2023 autour de 80-85 $/baril
        elif datetime(2023, 1, 1) <= d <= datetime(2023, 12, 31):
            derive = +0.05
        # Correction baissiere 2024 (suroffre, ralentissement chine)
        elif datetime(2024, 1, 1) <= d <= datetime(2024, 12, 31):
            derive = -0.15
        # Correction marquee debut 2025 (annonces tarifaires, pression OPEP+)
        elif datetime(2025, 1, 1) <= d <= datetime(2025, 6, 30):
            derive = -0.35
        # Stabilisation basse mi-2025 autour de 65-70 $/baril
        elif datetime(2025, 7, 1) <= d <= datetime(2025, 12, 31):
            derive = -0.1
        # Legere reprise debut 2026
        elif datetime(2026, 1, 1) <= d:
            derive = +0.05
        else:
            derive = 0.0

        # Saisonnalite annuelle
        saisonnalite = 3.0 * np.sin(2 * np.pi * semaine / 52)

        # Bruit gaussien
        bruit = np.random.normal(0, 1.2)

        # Inertie du prix precedent
        prix[i] = max(15, prix[i-1] * 0.98 + prix[i-1] * 0.02 + derive + saisonnalite * 0.3 + bruit)

    df = pd.DataFrame({"date": dates, "prix": np.round(prix, 2)})
    print("[OK] " + str(len(df)) + " semaines simulees (2015-2026).")
    return df


def collecter_et_sauvegarder():
    """Point d'entree principal : collecte et sauvegarde les donnees."""
    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)

    # Essai API reelle, puis fallback simule
    df = telecharger_depuis_eia()
    if df is None or len(df) < 100:
        print("[INFO] Utilisation des donnees simulees comme alternative.")
        df = generer_donnees_simulees()

    # Sauvegarde CSV
    df.to_csv(RAW_PATH, index=False)
    print("[OK] Donnees sauvegardees -> " + RAW_PATH)
    print("     Periode : " + str(df["date"].min().date()) + " -> " + str(df["date"].max().date()))
    print("     Prix min : $" + str(round(df["prix"].min(), 2)) +
          "  max : $" + str(round(df["prix"].max(), 2)) +
          "  moy : $" + str(round(df["prix"].mean(), 2)))
    return df


if __name__ == "__main__":
    collecter_et_sauvegarder()
