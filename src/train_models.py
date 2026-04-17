# -*- coding: utf-8 -*-
"""
train_models.py - Entrainement et comparaison de 4 modeles ML
Predit le prix du Brent dans 4 semaines.
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import os
import joblib

from sklearn.linear_model  import LinearRegression
from sklearn.ensemble      import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics       import mean_squared_error, mean_absolute_error, r2_score
from xgboost               import XGBRegressor

# Chemins
PROCESSED_PATH = os.path.join("data", "processed", "dataset_final.csv")
MODELS_DIR     = os.path.join("models")
FIGURES_DIR    = os.path.join("data", "processed")
MODEL_PATH     = os.path.join(MODELS_DIR, "best_model.pkl")
SCALER_PATH    = os.path.join(MODELS_DIR, "scaler.pkl")
PERF_PATH      = os.path.join(MODELS_DIR, "performances.csv")

# Horizon de prediction (semaines dans le futur)
HORIZON = 4


def charger_donnees():
    """Charge le dataset pretraite."""
    print("[INFO] Chargement du dataset pretraite...")
    df = pd.read_csv(PROCESSED_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    print("       " + str(len(df)) + " lignes chargees.")
    return df


def preparer_features_cible(df):
    """
    Cree la variable cible : prix dans HORIZON semaines.
    Supprime les lignes ou la cible est NaN (fin du dataset).
    """
    print("[INFO] Creation de la cible : prix dans " + str(HORIZON) + " semaines...")

    df["cible"] = df["prix"].shift(-HORIZON)
    df = df.dropna(subset=["cible"]).reset_index(drop=True)

    features = [c for c in df.columns if c not in ["date", "prix", "cible"]]
    X     = df[features]
    y     = df["cible"]
    dates = df["date"]

    print("       " + str(len(features)) + " features, " + str(len(df)) + " exemples.")
    return X, y, dates, features


def diviser_train_test(X, y, dates, ratio=0.8):
    """Division chronologique 80% / 20% (pas de melange aleatoire)."""
    coupe = int(len(X) * ratio)
    X_train, X_test   = X.iloc[:coupe],    X.iloc[coupe:]
    y_train, y_test   = y.iloc[:coupe],    y.iloc[coupe:]
    dates_test        = dates.iloc[coupe:]
    print("[INFO] Train : " + str(len(X_train)) + " exemples | Test : " + str(len(X_test)) + " exemples")
    return X_train, X_test, y_train, y_test, dates_test


def normaliser(X_train, X_test):
    """Normalisation (StandardScaler) ajustee sur le train uniquement."""
    scaler     = StandardScaler()
    X_train_s  = scaler.fit_transform(X_train)
    X_test_s   = scaler.transform(X_test)
    return X_train_s, X_test_s, scaler


def calculer_metriques(y_test, y_pred):
    """Calcule RMSE, MAE et R2."""
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae  = float(mean_absolute_error(y_test, y_pred))
    r2   = float(r2_score(y_test, y_pred))
    return {"RMSE": round(rmse, 4), "MAE": round(mae, 4), "R2": round(r2, 4)}


def entrainer_modeles(X_train, X_test, y_train, y_test):
    """
    Entraine les 4 modeles et retourne un dictionnaire
    {nom: {"modele": obj, "metriques": dict, "predictions": array}}.
    """
    modeles = {
        "Regression Lineaire": LinearRegression(),
        "Random Forest":       RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "XGBoost":             XGBRegressor(n_estimators=200, learning_rate=0.05,
                                            max_depth=4, random_state=42, verbosity=0),
        "Gradient Boosting":   GradientBoostingRegressor(n_estimators=200, learning_rate=0.05,
                                                          max_depth=4, random_state=42),
    }

    resultats = {}
    print("\n[INFO] Entrainement des modeles...")
    for nom, modele in modeles.items():
        print("  -> " + nom + "...", end=" ", flush=True)
        try:
            modele.fit(X_train, y_train)
            y_pred    = modele.predict(X_test)
            metriques = calculer_metriques(y_test, y_pred)
            resultats[nom] = {
                "modele":      modele,
                "metriques":   metriques,
                "predictions": y_pred,
            }
            print("RMSE=" + str(metriques["RMSE"]) +
                  "  MAE=" + str(metriques["MAE"]) +
                  "  R2="  + str(metriques["R2"]))
        except Exception as e:
            print("ERREUR : " + str(e))

    return resultats


def afficher_tableau_comparatif(resultats):
    """Affiche un tableau comparatif des performances dans le terminal."""
    print("\n" + "=" * 65)
    print("{:<25} {:>8} {:>8} {:>8}".format("MODELE", "RMSE", "MAE", "R2"))
    print("-" * 65)
    for nom, r in resultats.items():
        m = r["metriques"]
        print("{:<25} {:>8.3f} {:>8.3f} {:>8.3f}".format(nom, m["RMSE"], m["MAE"], m["R2"]))
    print("=" * 65)


def trouver_meilleur_modele(resultats):
    """Retourne le nom du modele avec le RMSE le plus faible."""
    return min(resultats, key=lambda n: resultats[n]["metriques"]["RMSE"])


def sauvegarder_modele(modele, scaler, nom):
    """Sauvegarde le meilleur modele et le scaler."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(modele, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print("\n[OK] Meilleur modele (" + nom + ") sauvegarde -> " + MODEL_PATH)
    print("[OK] Scaler sauvegarde -> " + SCALER_PATH)


def sauvegarder_performances(resultats):
    """Sauvegarde les metriques de tous les modeles dans un CSV."""
    rows = [{"modele": nom, **r["metriques"]} for nom, r in resultats.items()]
    df_perf = pd.DataFrame(rows)
    os.makedirs(MODELS_DIR, exist_ok=True)
    df_perf.to_csv(PERF_PATH, index=False)
    print("[OK] Performances sauvegardees -> " + PERF_PATH)


def graphique_predictions(y_test, y_pred, dates_test, nom_modele):
    """Genere le graphique Predictions vs Valeurs reelles."""
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(dates_test.values, y_test.values, label="Valeurs reelles",  color="#003f7f", linewidth=1.8)
    ax.plot(dates_test.values, y_pred,         label="Predictions",      color="#e84545", linewidth=1.5, linestyle="--")
    ax.set_title("Predictions vs Valeurs reelles - " + nom_modele, fontsize=13)
    ax.set_xlabel("Date")
    ax.set_ylabel("Prix Brent ($/baril)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    chemin = os.path.join(FIGURES_DIR, "predictions_vs_reels.png")
    plt.savefig(chemin, dpi=120, bbox_inches="tight")
    plt.close()
    print("[OK] Graphique predictions -> " + chemin)


def graphique_feature_importance(modele, feature_names, nom_modele):
    """Genere le graphique des features les plus importantes."""
    try:
        if hasattr(modele, "feature_importances_"):
            importances = modele.feature_importances_
        elif hasattr(modele, "coef_"):
            importances = np.abs(modele.coef_)
        else:
            print("[INFO] Ce modele ne fournit pas d'importance des features.")
            return

        idx  = np.argsort(importances)[::-1][:15]  # top 15
        noms = [feature_names[i] for i in idx]
        vals = importances[idx]

        fig, ax = plt.subplots(figsize=(10, 6))
        ax.barh(noms[::-1], vals[::-1], color="#003f7f", edgecolor="white")
        ax.set_title("Top 15 Features Importantes - " + nom_modele, fontsize=13)
        ax.set_xlabel("Importance")
        ax.grid(True, axis="x", alpha=0.3)
        plt.tight_layout()

        chemin = os.path.join(FIGURES_DIR, "feature_importance.png")
        plt.savefig(chemin, dpi=120, bbox_inches="tight")
        plt.close()
        print("[OK] Graphique feature importance -> " + chemin)

    except Exception as e:
        print("[WARN] Impossible de generer le graphique d'importance : " + str(e))


def entrainer():
    """Pipeline complet d'entrainement."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(FIGURES_DIR, exist_ok=True)

    df                                               = charger_donnees()
    X, y, dates, feature_names                      = preparer_features_cible(df)
    X_train, X_test, y_train, y_test, dates_test    = diviser_train_test(X, y, dates)
    X_train_s, X_test_s, scaler                     = normaliser(X_train, X_test)
    resultats                                        = entrainer_modeles(X_train_s, X_test_s, y_train, y_test)

    afficher_tableau_comparatif(resultats)

    meilleur_nom = trouver_meilleur_modele(resultats)
    meilleur     = resultats[meilleur_nom]
    print("\n[BEST] Meilleur modele : " + meilleur_nom)

    sauvegarder_modele(meilleur["modele"], scaler, meilleur_nom)
    sauvegarder_performances(resultats)
    graphique_predictions(y_test, meilleur["predictions"], dates_test, meilleur_nom)
    graphique_feature_importance(meilleur["modele"], feature_names, meilleur_nom)

    return resultats, meilleur_nom


if __name__ == "__main__":
    entrainer()
