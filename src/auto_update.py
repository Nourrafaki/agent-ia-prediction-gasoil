# -*- coding: utf-8 -*-
"""
auto_update.py - Mise a jour automatique des donnees et du modele Brent.
Telecharge les nouvelles donnees EIA, repretraite et reentraine le modele.
Peut etre execute manuellement ou planifie (APScheduler dans api/main.py).
"""

import os
import sys
import pandas as pd
import yfinance as yf
from datetime import datetime

# S'assurer que le repertoire courant est la racine du projet
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

RAW_PATH   = os.path.join("data", "raw", "prix_brent.csv")
DATE_DEBUT = "2015-01-01"

# ---------------------------------------------------------------------------
# Etape 1 : Collecte des vraies donnees via yfinance
# ---------------------------------------------------------------------------

def _telecharger_yfinance(symbole: str) -> pd.DataFrame | None:
    """
    Telecharge l'historique hebdomadaire complet depuis DATE_DEBUT via yfinance.
    Retourne un DataFrame (date, prix) ou None si le ticker est vide.
    """
    try:
        print("[INFO] Tentative yfinance : " + symbole + " ...")
        raw = yf.download(symbole, start=DATE_DEBUT, interval="1wk", progress=False, auto_adjust=True)
        if raw.empty:
            print("[WARN] " + symbole + " : aucune donnee retournee.")
            return None

        # Aplatir le MultiIndex eventuel sur les colonnes
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)

        df = raw[["Close"]].copy()
        df.index = pd.to_datetime(df.index).tz_localize(None)   # supprimer le timezone
        df = df.rename(columns={"Close": "prix"})
        df.index.name = "date"
        df = df.reset_index()
        df["date"] = df["date"].dt.normalize()                   # minuit, sans heure
        df["prix"] = pd.to_numeric(df["prix"], errors="coerce").round(2)
        df = df.dropna(subset=["prix"]).sort_values("date").reset_index(drop=True)

        print("[OK] " + symbole + " : " + str(len(df)) + " semaines telecharge es.")
        return df

    except Exception as e:
        print("[WARN] " + symbole + " echec : " + str(e))
        return None


def mettre_a_jour_donnees() -> int:
    """
    Telecharge les vraies donnees historiques (BZ=F ou CL=F en fallback)
    et ecrase prix_brent.csv. Retourne le nombre de nouvelles lignes vs l'ancien CSV.
    """
    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)

    # Compter les lignes avant (pour calculer le delta)
    nb_avant = 0
    if os.path.exists(RAW_PATH):
        try:
            nb_avant = len(pd.read_csv(RAW_PATH))
        except Exception:
            nb_avant = 0

    # Essai BZ=F puis CL=F
    df = None
    for symbole in ("BZ=F", "CL=F"):
        df = _telecharger_yfinance(symbole)
        if df is not None and len(df) >= 100:
            break
        df = None

    if df is None:
        raise RuntimeError("Impossible de telecharger les donnees (BZ=F et CL=F ont echoue).")

    df.to_csv(RAW_PATH, index=False)
    nb_apres  = len(df)
    nouvelles = max(0, nb_apres - nb_avant)

    print("[OK] CSV ecrase : " + str(nb_apres) + " lignes reelles.")
    print("     Periode : " + str(df["date"].min().date()) +
          " -> " + str(df["date"].max().date()))
    print("     Prix min : $" + str(df["prix"].min()) +
          "  max : $" + str(df["prix"].max()) +
          "  moy : $" + str(round(df["prix"].mean(), 2)))
    return nouvelles


# ---------------------------------------------------------------------------
# Etape 2 : Pretraitement
# ---------------------------------------------------------------------------

def repretraiter():
    """Relance le pretraitement pour mettre a jour dataset_final.csv."""
    print("[INFO] Relancement du pretraitement...")
    from src.preprocessing import pretraiter
    pretraiter()
    print("[OK] Pretraitement termine.")


# ---------------------------------------------------------------------------
# Etape 3 : Reentreainement du modele
# ---------------------------------------------------------------------------

def reentreainer():
    """Reentraine le meilleur modele et ecrase best_model.pkl."""
    print("[INFO] Reentreainement du modele...")
    from src.train_models import entrainer
    entrainer()
    print("[OK] Modele reentraine et sauvegarde dans models/best_model.pkl.")


# ---------------------------------------------------------------------------
# Point d'entree principal
# ---------------------------------------------------------------------------

def executer_mise_a_jour():
    """Execute les 3 etapes de mise a jour et affiche un log complet."""
    maintenant = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 60)
    print("[AUTO_UPDATE] Debut de la mise a jour : " + maintenant)
    print("=" * 60)

    try:
        nouvelles_lignes = mettre_a_jour_donnees()
    except Exception as e:
        print("[ERREUR] Mise a jour des donnees : " + str(e))
        return False

    try:
        repretraiter()
    except Exception as e:
        print("[ERREUR] Pretraitement : " + str(e))
        return False

    try:
        reentreainer()
    except Exception as e:
        print("[ERREUR] Reentreainement : " + str(e))
        return False

    fin = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 60)
    print("[AUTO_UPDATE] Mise a jour terminee : " + fin)
    print("[AUTO_UPDATE] Nouvelles lignes ajoutees : " + str(nouvelles_lignes))
    print("=" * 60)
    return True


if __name__ == "__main__":
    succes = executer_mise_a_jour()
    sys.exit(0 if succes else 1)
