# -*- coding: utf-8 -*-
"""
api/main.py - API FastAPI pour le tableau de bord de prediction du Brent
Expose les endpoints REST consommes par le frontend React.
"""

import os
import sys
import math
import joblib
import numpy as np
import pandas as pd
import yfinance as yf

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional

# APScheduler — installe avec : pip install apscheduler
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    APSCHEDULER_DISPONIBLE = True
except ImportError:
    APSCHEDULER_DISPONIBLE = False
    print("[WARN] APScheduler non installe. Mise a jour automatique desactivee."
          " Installez-le avec : pip install apscheduler")

# ---------------------------------------------------------------------------
# Chemins vers les artefacts ML et les donnees
# ---------------------------------------------------------------------------
BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH     = os.path.join(BASE_DIR, "models", "best_model.pkl")
SCALER_PATH    = os.path.join(BASE_DIR, "models", "scaler.pkl")
PERF_PATH      = os.path.join(BASE_DIR, "models", "performances.csv")
RAW_PATH       = os.path.join(BASE_DIR, "data", "raw", "prix_brent.csv")
PROCESSED_PATH = os.path.join(BASE_DIR, "data", "processed", "dataset_final.csv")

# Noms des features (meme ordre que lors de l'entrainement)
FEATURE_NAMES = [
    "lag_1", "lag_2", "lag_4", "lag_8", "lag_12",
    "MA4", "MA12", "MA26", "std_4",
    "mois", "trimestre", "semaine", "variation_pct",
]

# ---------------------------------------------------------------------------
# Chargement des artefacts au demarrage
# ---------------------------------------------------------------------------
model  = None
scaler = None


def charger_modele():
    """(Re)charge model et scaler depuis le disque. Appele au demarrage et apres mise a jour."""
    global model, scaler
    try:
        model = joblib.load(MODEL_PATH)
        print("[OK] Modele charge : " + MODEL_PATH)
    except Exception as e:
        print("[WARN] Impossible de charger le modele : " + str(e))
        model = None

    try:
        scaler = joblib.load(SCALER_PATH)
        print("[OK] Scaler charge : " + SCALER_PATH)
    except Exception as e:
        print("[WARN] Scaler introuvable, on continue sans lui : " + str(e))
        scaler = None


charger_modele()


# ---------------------------------------------------------------------------
# Tache de mise a jour automatique (APScheduler)
# ---------------------------------------------------------------------------

def _job_mise_a_jour():
    """Execute auto_update puis recharge le modele en memoire."""
    print("[SCHEDULER] Debut de la mise a jour hebdomadaire...")
    try:
        # S'assurer que le chemin racine est dans sys.path
        if BASE_DIR not in sys.path:
            sys.path.insert(0, BASE_DIR)
        from src.auto_update import executer_mise_a_jour
        succes = executer_mise_a_jour()
        if succes:
            charger_modele()
            print("[SCHEDULER] Modele rechargé en mémoire.")
        else:
            print("[SCHEDULER] Mise a jour terminee avec des erreurs.")
    except Exception as e:
        print("[SCHEDULER][ERREUR] " + str(e))


scheduler = None

if APSCHEDULER_DISPONIBLE:
    scheduler = BackgroundScheduler()
    # Chaque lundi a 08h00
    scheduler.add_job(
        _job_mise_a_jour,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="mise_a_jour_hebdomadaire",
        name="Mise a jour donnees + modele Brent",
        replace_existing=True,
    )


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Gere le demarrage et l'arret propre du scheduler."""
    if scheduler is not None:
        scheduler.start()
        print("[OK] Scheduler demarre. Prochaine mise a jour : chaque lundi a 08h00.")
    yield
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
        print("[OK] Scheduler arrete.")


# ---------------------------------------------------------------------------
# Application FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="API Prediction Brent",
    description="API REST pour le tableau de bord de prediction du prix du Brent",
    version="1.0.0",
    lifespan=lifespan,
)

# Autorise les appels depuis le serveur de developpement Vite (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _charger_historique() -> pd.DataFrame:
    """Charge le fichier CSV des prix bruts et retourne un DataFrame trie."""
    if not os.path.exists(RAW_PATH):
        raise FileNotFoundError("Fichier introuvable : " + RAW_PATH)
    df = pd.read_csv(RAW_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def _charger_processed() -> pd.DataFrame:
    """Charge le dataset pretraite et retourne un DataFrame trie."""
    if not os.path.exists(PROCESSED_PATH):
        raise FileNotFoundError("Fichier introuvable : " + PROCESSED_PATH)
    df = pd.read_csv(PROCESSED_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def _obtenir_rmse() -> float:
    """Lit le RMSE du meilleur modele dans performances.csv."""
    try:
        df_perf = pd.read_csv(PERF_PATH)
        # Le meilleur modele est celui avec le RMSE le plus bas
        return float(df_perf["RMSE"].min())
    except Exception:
        return 5.0  # valeur par defaut si le fichier est absent


def _derniere_date_donnees() -> str:
    """Retourne la date de la derniere entree dans prix_brent.csv."""
    try:
        df = pd.read_csv(RAW_PATH, parse_dates=["date"])
        return df["date"].max().strftime("%Y-%m-%d")
    except Exception:
        return "N/A"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def racine():
    """Point d'entree de l'API."""
    return {"message": "API Prediction Brent operationnelle", "version": "1.0.0"}


@app.get("/api/historique")
def historique():
    """
    Retourne les 100 derniers prix historiques du Brent.
    Format : liste de {date: str, valeur: float}
    """
    try:
        df = _charger_historique()
        resultats = [
            {
                "date":   row["date"].strftime("%Y-%m-%d"),
                "valeur": round(float(row["prix"]), 2),
            }
            for _, row in df.iterrows()
        ]
        return {"data": resultats, "count": len(resultats)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la lecture de l'historique : " + str(e))


@app.get("/api/prediction")
def prediction():
    """
    Retourne la prediction du prix du Brent dans 4 semaines.
    Format : {prediction: float, borne_inf: float, borne_sup: float, date_prediction: str, prix_actuel: float}
    L'intervalle de confiance est calcule avec +/- 1.96 * RMSE.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Modele non disponible. Lancez d'abord train_models.py.")

    try:
        df = _charger_processed()

        # Derniere ligne disponible comme point de depart pour la prediction
        derniere_ligne = df.iloc[-1]
        prix_actuel    = float(derniere_ligne["prix"])
        date_actuelle  = derniere_ligne["date"]

        # Extraire uniquement les colonnes features (meme ordre qu'a l'entrainement)
        features_disponibles = [f for f in FEATURE_NAMES if f in df.columns]
        X_pred = pd.DataFrame(
            [derniere_ligne[features_disponibles].values],
            columns=features_disponibles,
        )

        # Appliquer le scaler si disponible (DataFrame pour eviter le warning feature names)
        if scaler is not None:
            X_pred = pd.DataFrame(scaler.transform(X_pred), columns=features_disponibles)

        # Prediction
        valeur_predite = float(model.predict(X_pred)[0])

        # Intervalle de confiance base sur le RMSE
        rmse       = _obtenir_rmse()
        marge      = 1.96 * rmse
        borne_inf  = round(valeur_predite - marge, 2)
        borne_sup  = round(valeur_predite + marge, 2)

        # Date estimee de la prediction (+ 4 semaines = 28 jours)
        date_pred  = pd.Timestamp(date_actuelle) + pd.Timedelta(weeks=4)

        return {
            "prediction":           round(valeur_predite, 2),
            "borne_inf":            borne_inf,
            "borne_sup":            borne_sup,
            "date_prediction":      date_pred.strftime("%Y-%m-%d"),
            "prix_actuel":          round(prix_actuel, 2),
            "variation_pct":        round((valeur_predite - prix_actuel) / prix_actuel * 100, 2),
            "derniere_mise_a_jour": _derniere_date_donnees(),
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur de prediction : " + str(e))


@app.get("/api/metriques")
def metriques():
    """
    Retourne les metriques de performance de tous les modeles.
    Format : liste de {modele: str, RMSE: float, MAE: float, R2: float}
    """
    try:
        if not os.path.exists(PERF_PATH):
            raise FileNotFoundError("Fichier performances.csv introuvable.")

        df_perf = pd.read_csv(PERF_PATH)

        # Trouver le meilleur modele (RMSE minimal)
        idx_best   = df_perf["RMSE"].idxmin()
        nom_meilleur = str(df_perf.loc[idx_best, "modele"])

        resultats = []
        for _, row in df_perf.iterrows():
            resultats.append({
                "modele":    str(row["modele"]),
                "RMSE":      round(float(row["RMSE"]), 4),
                "MAE":       round(float(row["MAE"]),  4),
                "R2":        round(float(row["R2"]),   4),
                "meilleur":  str(row["modele"]) == nom_meilleur,
            })

        return {"data": resultats, "meilleur_modele": nom_meilleur}

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la lecture des metriques : " + str(e))


@app.get("/api/features")
def features():
    """
    Retourne les 5 features les plus importantes du meilleur modele.
    Format : liste de {feature: str, importance: float}
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Modele non disponible.")

    try:
        # Recuperer les importances selon le type de modele
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "coef_"):
            importances = np.abs(model.coef_)
        else:
            # Modele sans importance explicite : retourner des valeurs uniformes
            n = len(FEATURE_NAMES)
            importances = np.ones(n) / n

        # Charger les noms de features depuis le dataset si possible
        try:
            df = _charger_processed()
            feature_cols = [c for c in df.columns if c not in ["date", "prix"]]
        except Exception:
            feature_cols = FEATURE_NAMES

        # S'assurer que les longueurs correspondent
        n = min(len(importances), len(feature_cols))
        importances  = importances[:n]
        feature_cols = feature_cols[:n]

        # Trier par importance decroissante et garder le top 5
        idx_tries = np.argsort(importances)[::-1][:5]
        resultats = [
            {
                "feature":    feature_cols[i],
                "importance": round(float(importances[i]), 6),
            }
            for i in idx_tries
        ]

        # Normaliser les importances pour l'affichage (somme = 1 sur le top 5)
        total = sum(r["importance"] for r in resultats)
        if total > 0:
            for r in resultats:
                r["importance_norm"] = round(r["importance"] / total, 4)
        else:
            for r in resultats:
                r["importance_norm"] = 0.2

        return {"data": resultats}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors du calcul des features : " + str(e))


def _fetch_ticker(symbole: str):
    """Tente de recuperer l'historique 1 mois pour un symbole yfinance. Retourne None si vide."""
    try:
        hist = yf.Ticker(symbole).history(period="1mo")
        if hist.empty or len(hist) < 1:
            return None, symbole
        return hist, symbole
    except Exception:
        return None, symbole


def _fallback_prix_csv():
    """Lit la derniere valeur connue dans prix_brent.csv."""
    df = pd.read_csv(RAW_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    derniere = df.iloc[-1]
    prix_veille = float(df.iloc[-2]["prix"]) if len(df) >= 2 else float(derniere["prix"])
    prix = float(derniere["prix"])
    variation_pct = round((prix - prix_veille) / prix_veille * 100, 2) if prix_veille else 0.0
    return prix, variation_pct, derniere["date"].strftime("%Y-%m-%d"), "CSV local (fallback)"


@app.get("/api/sparkline")
def sparkline():
    """Retourne les 10 derniers prix hebdomadaires pour le mini-graphique sparkline."""
    try:
        df = _charger_historique().tail(10).reset_index(drop=True)
        return {"data": [{"date": row["date"].strftime("%Y-%m-%d"), "prix": round(float(row["prix"]), 2)}
                         for _, row in df.iterrows()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur sparkline : " + str(e))


@app.get("/api/prix_actuel")
def prix_actuel():
    """
    Retourne le dernier prix disponible du Brent en temps reel.
    Essaie BZ=F, puis CL=F, puis BNO ; repli sur prix_brent.csv si tout echoue.
    Format : {prix: float, variation_pct: float, date: str, source: str}
    """
    tickers_a_essayer = [
        ("BZ=F", "Yahoo Finance (BZ=F — Brent futures)"),
        ("CL=F", "Yahoo Finance (CL=F — WTI crude)"),
        ("BNO",  "Yahoo Finance (BNO — ETF Brent)"),
    ]

    hist = None
    source = ""
    for symbole, label in tickers_a_essayer:
        hist, _ = _fetch_ticker(symbole)
        if hist is not None:
            source = label
            break

    try:
        if hist is not None:
            prix        = round(float(hist.iloc[-1]["Close"]), 2)
            date_prix   = hist.index[-1].strftime("%Y-%m-%d")
            if len(hist) >= 2:
                prix_veille   = float(hist.iloc[-2]["Close"])
                variation_pct = round((prix - prix_veille) / prix_veille * 100, 2)
            else:
                variation_pct = 0.0
        else:
            # Fallback : derniere valeur du CSV local
            prix, variation_pct, date_prix, source = _fallback_prix_csv()

        return {
            "prix":          prix,
            "variation_pct": variation_pct,
            "date":          date_prix,
            "source":        source,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur prix temps reel : " + str(e))


class MessageChat(BaseModel):
    message: str


def _construire_reponse_chat(message: str, prix_actuel: float, prix_predit: float, variation: float) -> dict:
    """
    Logique de reponse basee sur des regles.
    Detecte l'intention du message et retourne la recommandation adaptee.
    """
    variation_abs = abs(variation)
    diff_prix     = round(prix_predit - prix_actuel, 2)
    signe         = "+" if diff_prix >= 0 else ""

    # --- Determination de la recommandation selon le seuil de variation ---
    if variation > 3:
        recommandation = "ACHETER MAINTENANT"
        couleur        = "vert"
        msg_defaut     = (
            "Le prix du gasoil devrait augmenter de " + str(variation) + "% dans 4 semaines "
            "(de $" + str(prix_actuel) + " a $" + str(prix_predit) + "). "
            "Nous recommandons de constituer vos stocks maintenant pour realiser des economies."
        )
    elif variation < -3:
        recommandation = "ATTENDRE"
        couleur        = "rouge"
        msg_defaut     = (
            "Le prix devrait baisser de " + str(variation_abs) + "% dans 4 semaines "
            "(de $" + str(prix_actuel) + " a $" + str(prix_predit) + "). "
            "Attendez avant d'acheter pour profiter de prix plus avantageux."
        )
    else:
        recommandation = "NEUTRE"
        couleur        = "jaune"
        msg_defaut     = (
            "Le prix devrait rester stable autour de $" + str(prix_predit) + " dans 4 semaines "
            "(variation de " + str(variation) + "%). "
            "Achetez selon vos besoins habituels sans urgence particuliere."
        )

    # --- Detection d'intention par mots-cles ---
    msg_lower = message.lower()

    if any(mot in msg_lower for mot in ("acheter", "stocker", "maintenant", "stock")):
        reponse = (
            recommandation + "\n\n"
            + msg_defaut + "\n\n"
            "Avec une variation prevue de " + signe + str(diff_prix) + " $/baril, "
            "chaque tranche de 1 000 litres achetee aujourd'hui vous fait "
            + ("economiser" if variation > 0 else "depenser") + " environ $"
            + str(round(abs(diff_prix) * 1000 / 159, 2))
            + " vs un achat dans 4 semaines (1 baril = 159 litres)."
        )

    elif any(mot in msg_lower for mot in ("tendance", "evolution", "prix", "marche")):
        direction = "hausse" if variation > 0 else ("baisse" if variation < 0 else "stabilite")
        reponse   = (
            recommandation + "\n\n"
            "Tendance actuelle : " + direction.upper() + "\n"
            "Prix actuel : $" + str(prix_actuel) + "/baril\n"
            "Prediction a 4 semaines : $" + str(prix_predit) + "/baril\n"
            "Variation attendue : " + signe + str(variation) + "% ("
            + signe + str(diff_prix) + " $/baril)."
        )

    elif any(mot in msg_lower for mot in ("risque", "attendre", "patienter")):
        # Calcul sur une consommation type de 5 000 litres/semaine (camion)
        conso_semaine_litres  = 5000
        conso_semaine_barils  = conso_semaine_litres / 159
        cout_supplementaire   = round(diff_prix * conso_semaine_barils * 4, 2)
        signe_cout            = "+" if cout_supplementaire >= 0 else ""
        reponse = (
            recommandation + "\n\n"
            "En attendant 4 semaines avec une consommation type de "
            + str(conso_semaine_litres) + " L/semaine (soit ~"
            + str(round(conso_semaine_litres * 4)) + " L/mois) :\n"
            "Difference de cout estimee : " + signe_cout + "$" + str(abs(cout_supplementaire))
            + " (" + ("surcoût" if cout_supplementaire > 0 else "economie") + ").\n"
            + msg_defaut
        )

    elif any(mot in msg_lower for mot in ("bonjour", "salut", "hello", "bonsoir")):
        reponse = (
            recommandation + "\n\n"
            "Bonjour ! Voici le resume du marche gasoil :\n"
            "- Prix actuel : $" + str(prix_actuel) + "/baril\n"
            "- Prediction 4 semaines : $" + str(prix_predit) + "/baril\n"
            "- Variation prevue : " + signe + str(variation) + "%\n\n"
            + msg_defaut
        )

    else:
        reponse = recommandation + "\n\n" + msg_defaut

    return {
        "reponse":       reponse,
        "recommandation": recommandation,
        "couleur":       couleur,
        "prix_actuel":   prix_actuel,
        "prix_predit":   prix_predit,
        "variation":     variation,
    }


@app.post("/api/chat")
def chat(body: MessageChat):
    """
    Chatbot conseiller achat gasoil — logique de regles (sans API externe).
    Recommandation basee sur la variation % entre prix actuel et prix predit a 4 semaines.
    """
    # Recuperer le prix actuel depuis le marche
    prix_actuel: float = 0.0
    try:
        hist = None
        for sym in ("BZ=F", "CL=F", "BNO"):
            h, _ = _fetch_ticker(sym)
            if h is not None:
                hist = h
                break
        if hist is not None:
            prix_actuel = round(float(hist.iloc[-1]["Close"]), 2)
    except Exception:
        pass

    # Recuperer la prediction ML
    prix_predit: float = prix_actuel
    try:
        if model is not None:
            df          = _charger_processed()
            derniere    = df.iloc[-1]
            feats_dispo = [f for f in FEATURE_NAMES if f in df.columns]
            X_pred      = pd.DataFrame([derniere[feats_dispo].values], columns=feats_dispo)
            if scaler is not None:
                X_pred = pd.DataFrame(scaler.transform(X_pred), columns=feats_dispo)
            prix_predit = round(float(model.predict(X_pred)[0]), 2)
            # Utiliser le prix du dataset si yfinance n'a rien retourne
            if prix_actuel == 0.0:
                prix_actuel = round(float(derniere["prix"]), 2)
    except Exception:
        pass

    variation = round((prix_predit - prix_actuel) / prix_actuel * 100, 2) if prix_actuel else 0.0

    return _construire_reponse_chat(body.message, prix_actuel, prix_predit, variation)


@app.get("/api/statut")
def statut():
    """
    Retourne le statut du systeme : date des dernieres donnees et prochaine mise a jour.
    """
    prochaine = "Non planifiee (APScheduler absent)"
    if scheduler is not None and scheduler.running:
        job = scheduler.get_job("mise_a_jour_hebdomadaire")
        if job and job.next_run_time:
            prochaine = job.next_run_time.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "derniere_mise_a_jour": _derniere_date_donnees(),
        "prochaine_mise_a_jour": prochaine,
        "scheduler_actif": scheduler is not None and scheduler.running,
    }


# ---------------------------------------------------------------------------
# Point d'entree direct
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
