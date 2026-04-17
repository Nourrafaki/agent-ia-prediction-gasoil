# -*- coding: utf-8 -*-
"""
preprocessing.py - Pretraitement des donnees et ingenierie des features
Charge les donnees brutes, cree les features temporelles et sauvegarde le dataset final.
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # backend non-interactif
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Chemins
RAW_PATH       = os.path.join("data", "raw",       "prix_brent.csv")
PROCESSED_PATH = os.path.join("data", "processed", "dataset_final.csv")
FIGURES_DIR    = os.path.join("data", "processed")


def charger_donnees():
    """Charge les donnees brutes depuis le CSV."""
    print("[INFO] Chargement des donnees brutes...")
    df = pd.read_csv(RAW_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    print("       " + str(len(df)) + " lignes chargees.")
    return df


def gerer_valeurs_manquantes(df):
    """Comble les valeurs manquantes par interpolation lineaire."""
    nb_manquants = df["prix"].isna().sum()
    if nb_manquants > 0:
        print("[WARN] " + str(nb_manquants) + " valeurs manquantes -> interpolation lineaire.")
        df["prix"] = df["prix"].interpolate(method="linear")
    else:
        print("[OK]   Aucune valeur manquante.")
    return df


def creer_features(df):
    """
    Cree toutes les features de series temporelles :
      - Lags : t-1, t-2, t-4, t-8, t-12
      - Moyennes mobiles : MA4, MA12, MA26
      - Ecart-type glissant sur 4 semaines
      - Variables temporelles : mois, trimestre, numero de semaine
      - Variation % semaine sur semaine
    """
    print("[INFO] Creation des features...")

    # Lags (valeurs passees)
    for lag in [1, 2, 4, 8, 12]:
        df["lag_" + str(lag)] = df["prix"].shift(lag)

    # Moyennes mobiles
    for fenetre in [4, 12, 26]:
        df["MA" + str(fenetre)] = df["prix"].rolling(window=fenetre).mean()

    # Ecart-type glissant (volatilite court terme)
    df["std_4"] = df["prix"].rolling(window=4).std()

    # Variables temporelles
    df["mois"]      = df["date"].dt.month
    df["trimestre"] = df["date"].dt.quarter
    df["semaine"]   = df["date"].dt.isocalendar().week.astype(int)

    # Variation hebdomadaire en pourcentage
    df["variation_pct"] = df["prix"].pct_change() * 100

    print("       " + str(len(df.columns) - 2) + " features creees (hors date et prix).")
    return df


def supprimer_lignes_incompletes(df):
    """Supprime les lignes avec NaN dues aux fenetres glissantes et lags."""
    avant = len(df)
    df = df.dropna().reset_index(drop=True)
    apres = len(df)
    print("       " + str(avant - apres) + " lignes supprimees (debut de serie), " +
          str(apres) + " lignes conservees.")
    return df


def afficher_statistiques(df):
    """Affiche les statistiques descriptives du dataset."""
    print("\n[INFO] Statistiques descriptives :")
    print(df.describe().round(2).to_string())


def sauvegarder_graphique_correlation(df):
    """Genere et sauvegarde la matrice de correlation des features numeriques."""
    print("\n[INFO] Generation du graphique de correlation...")
    os.makedirs(FIGURES_DIR, exist_ok=True)

    cols_numeriques = df.select_dtypes(include=[np.number]).columns.tolist()
    corr = df[cols_numeriques].corr()

    fig, ax = plt.subplots(figsize=(14, 10))
    sns.heatmap(
        corr,
        annot=True,
        fmt=".2f",
        cmap="coolwarm",
        center=0,
        linewidths=0.5,
        ax=ax,
        annot_kws={"size": 7},
    )
    ax.set_title("Matrice de correlation des features", fontsize=14, pad=15)
    plt.tight_layout()

    chemin = os.path.join(FIGURES_DIR, "correlation_matrix.png")
    plt.savefig(chemin, dpi=120, bbox_inches="tight")
    plt.close()
    print("       Graphique sauvegarde -> " + chemin)


def pretraiter():
    """Pipeline complet de pretraitement."""
    os.makedirs(os.path.dirname(PROCESSED_PATH), exist_ok=True)

    df = charger_donnees()
    df = gerer_valeurs_manquantes(df)
    df = creer_features(df)
    df = supprimer_lignes_incompletes(df)
    afficher_statistiques(df)
    sauvegarder_graphique_correlation(df)

    df.to_csv(PROCESSED_PATH, index=False)
    print("\n[OK] Dataset final sauvegarde -> " + PROCESSED_PATH)
    print("     Shape : " + str(df.shape[0]) + " lignes x " + str(df.shape[1]) + " colonnes")
    return df


if __name__ == "__main__":
    pretraiter()
