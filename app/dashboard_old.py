"""
dashboard.py — Interface Streamlit : Agent IA — Prédiction du Prix du Gasoil
Palette professionnelle bleu marine / blanc.
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import joblib
import os

# ─── Configuration de la page ─────────────────────────────────────────────────
st.set_page_config(
    page_title="Agent IA — Prix du Gasoil",
    page_icon="⛽",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── CSS personnalisé (bleu marine / blanc) ────────────────────────────────────
st.markdown("""
<style>
    /* Fond général */
    .stApp { background-color: #f0f4f8; }

    /* Barre supérieure */
    header { background-color: #001f4d !important; }

    /* Titres */
    h1 { color: #001f4d !important; }
    h2, h3 { color: #003f7f !important; }

    /* Cartes métriques */
    [data-testid="metric-container"] {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,31,77,0.12);
        border-left: 5px solid #003f7f;
    }

    /* Séparateur */
    hr { border-color: #003f7f44; }
</style>
""", unsafe_allow_html=True)

# ─── Chemins ──────────────────────────────────────────────────────────────────
RAW_PATH       = os.path.join("data", "raw",       "prix_brent.csv")
PROCESSED_PATH = os.path.join("data", "processed", "dataset_final.csv")
MODEL_PATH     = os.path.join("models", "best_model.pkl")
SCALER_PATH    = os.path.join("models", "scaler.pkl")
PERF_PATH      = os.path.join("models", "performances.csv")
FIG_PRED       = os.path.join("data", "processed", "predictions_vs_reels.png")
FIG_IMP        = os.path.join("data", "processed", "feature_importance.png")
FIG_CORR       = os.path.join("data", "processed", "correlation_matrix.png")


@st.cache_data
def charger_prix_bruts():
    return pd.read_csv(RAW_PATH, parse_dates=["date"]).sort_values("date")


@st.cache_data
def charger_dataset():
    return pd.read_csv(PROCESSED_PATH, parse_dates=["date"]).sort_values("date")


@st.cache_resource
def charger_modele():
    modele = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return modele, scaler


@st.cache_data
def charger_performances():
    return pd.read_csv(PERF_PATH)


def faire_prediction(modele, scaler, df: pd.DataFrame) -> tuple[float, float]:
    """
    Utilise la dernière ligne du dataset pour prédire le prix dans 4 semaines.
    Retourne (prix_actuel, prix_prédit).
    """
    feature_cols = [c for c in df.columns if c not in ["date", "prix", "cible"]]
    derniere_ligne = df[feature_cols].iloc[[-1]]
    derniere_ligne_s = scaler.transform(derniere_ligne)
    prix_prédit = modele.predict(derniere_ligne_s)[0]
    prix_actuel = df["prix"].iloc[-1]
    return float(prix_actuel), float(prix_prédit)


def jauge_coloree(prix_actuel: float, prix_predit: float):
    """Affiche une jauge colorée (vert = baisse, rouge = hausse)."""
    variation = prix_predit - prix_actuel
    variation_pct = (variation / prix_actuel) * 100
    hausse = variation > 0

    couleur      = "#e84545" if hausse   else "#27ae60"
    fleche       = "▲"       if hausse   else "▼"
    tendance     = "HAUSSE"  if hausse   else "BAISSE"
    fond_couleur = "#fff0f0" if hausse   else "#f0fff4"

    st.markdown(f"""
    <div style="
        background:{fond_couleur};
        border:2px solid {couleur};
        border-radius:16px;
        padding:28px 24px;
        text-align:center;
        margin:8px 0;
    ">
        <div style="font-size:2.8rem; font-weight:800; color:{couleur};">
            {fleche} {tendance}
        </div>
        <div style="font-size:1.2rem; color:#333; margin-top:8px;">
            Prix actuel : <b>${prix_actuel:.2f}/baril</b>
        </div>
        <div style="font-size:2rem; font-weight:700; color:{couleur}; margin-top:6px;">
            Prédiction dans 4 semaines : <b>${prix_predit:.2f}</b>
        </div>
        <div style="font-size:1rem; color:{couleur}; margin-top:4px;">
            Variation estimée : {fleche} {abs(variation):.2f} $ ({abs(variation_pct):.1f}%)
        </div>
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERFACE PRINCIPALE
# ═══════════════════════════════════════════════════════════════════════════════

# ─── En-tête ──────────────────────────────────────────────────────────────────
st.markdown("""
<div style="background:#001f4d;padding:24px 32px;border-radius:12px;margin-bottom:24px;">
    <h1 style="color:white;margin:0;font-size:2.2rem;">⛽ Agent IA — Prédiction du Prix du Gasoil</h1>
    <p style="color:#a0c4ff;margin:6px 0 0 0;font-size:1rem;">
        Modèle de Machine Learning basé sur le prix du pétrole Brent
    </p>
</div>
""", unsafe_allow_html=True)

# Vérification des fichiers nécessaires
fichiers_requis = [RAW_PATH, PROCESSED_PATH, MODEL_PATH, SCALER_PATH, PERF_PATH]
manquants = [f for f in fichiers_requis if not os.path.exists(f)]
if manquants:
    st.error(f"❌ Fichiers manquants : {manquants}\n\nLancez d'abord `python run.py` pour générer les données et entraîner le modèle.")
    st.stop()

# Chargement des données
try:
    df_brut  = charger_prix_bruts()
    df_proc  = charger_dataset()
    modele, scaler = charger_modele()
    df_perf  = charger_performances()
    prix_actuel, prix_predit = faire_prediction(modele, scaler, df_proc)
except Exception as e:
    st.error(f"❌ Erreur lors du chargement : {e}")
    st.stop()

# ─── KPIs rapides ─────────────────────────────────────────────────────────────
c1, c2, c3, c4 = st.columns(4)
with c1:
    st.metric("Prix actuel ($/baril)",     f"${prix_actuel:.2f}")
with c2:
    delta = prix_predit - prix_actuel
    st.metric("Prédiction dans 4 sem.",    f"${prix_predit:.2f}", delta=f"{delta:+.2f}$")
with c3:
    st.metric("Données disponibles",       f"{len(df_brut)} semaines")
with c4:
    st.metric("Période",
              f"{df_brut['date'].min().year}–{df_brut['date'].max().year}")

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — Historique des prix
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("## 📈 Section 1 — Historique des prix du Brent")

# Filtre par plage de dates
col_filtre1, col_filtre2 = st.columns(2)
with col_filtre1:
    date_debut = st.date_input("Depuis", value=df_brut["date"].min().date())
with col_filtre2:
    date_fin   = st.date_input("Jusqu'à", value=df_brut["date"].max().date())

masque = (df_brut["date"].dt.date >= date_debut) & (df_brut["date"].dt.date <= date_fin)
df_filtre = df_brut[masque]

fig1, ax1 = plt.subplots(figsize=(14, 4))
ax1.plot(df_filtre["date"], df_filtre["prix"], color="#003f7f", linewidth=1.5)
ax1.fill_between(df_filtre["date"], df_filtre["prix"], alpha=0.15, color="#003f7f")
ax1.set_title("Évolution du prix du pétrole Brent ($/baril)", fontsize=13)
ax1.set_xlabel("Date")
ax1.set_ylabel("Prix ($/baril)")
ax1.grid(True, alpha=0.3)

# Annotations des événements marquants
for evt_date, evt_label, evt_color in [
    ("2020-04-21", "Covid\n−70%",   "#e84545"),
    ("2022-03-07", "Ukraine\n+35%", "#e67e22"),
]:
    evt = pd.Timestamp(evt_date)
    if df_filtre["date"].min() <= evt <= df_filtre["date"].max():
        prix_evt = df_brut.loc[(df_brut["date"] - evt).abs().idxmin(), "prix"]
        ax1.annotate(evt_label, xy=(evt, prix_evt),
                     xytext=(evt, prix_evt + 8),
                     fontsize=8, color=evt_color,
                     arrowprops=dict(arrowstyle="->", color=evt_color))

plt.tight_layout()
st.pyplot(fig1)
plt.close()

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — Prédiction avec jauge
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("## 🎯 Section 2 — Prédiction du prix dans 4 semaines")

col_pred, col_expl = st.columns([2, 1])
with col_pred:
    jauge_coloree(prix_actuel, prix_predit)
with col_expl:
    st.markdown("""
    **Comment interpréter :**
    - 🟢 **Vert** : baisse du prix prévue
    - 🔴 **Rouge** : hausse du prix prévue
    - La prédiction est basée sur les **dernières données disponibles**
    - Horizon : **4 semaines**

    > ⚠️ Ces prédictions sont indicatives et ne constituent pas des conseils financiers.
    """)

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — Performances du modèle
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("## 📊 Section 3 — Performances des modèles")

# Mise en forme du tableau
df_perf_aff = df_perf.rename(columns={
    "modele": "Modèle", "RMSE": "RMSE (↓)", "MAE": "MAE (↓)", "R2": "R² (↑)"
})

# Mettre en évidence le meilleur modèle (RMSE min)
idx_meilleur = df_perf["RMSE"].idxmin()

def style_meilleur(row):
    if row.name == idx_meilleur:
        return ["background-color: #e8f4ff; font-weight: bold; color: #001f4d;"] * len(row)
    return [""] * len(row)

st.dataframe(
    df_perf_aff.style.apply(style_meilleur, axis=1).format(
        {"RMSE (↓)": "{:.4f}", "MAE (↓)": "{:.4f}", "R² (↑)": "{:.4f}"}
    ),
    use_container_width=True,
    height=200,
)

# Graphique prédictions vs réels
if os.path.exists(FIG_PRED):
    st.markdown("**Prédictions vs Valeurs réelles (jeu de test) :**")
    st.image(FIG_PRED, use_container_width=True)

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — Feature Importance
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("## 🔍 Section 4 — Variables les plus importantes")

col_fi, col_corr = st.columns(2)
with col_fi:
    if os.path.exists(FIG_IMP):
        st.markdown("**Importance des features (meilleur modèle) :**")
        st.image(FIG_IMP, use_container_width=True)
    else:
        st.info("Graphique d'importance non disponible pour ce modèle.")

with col_corr:
    if os.path.exists(FIG_CORR):
        st.markdown("**Matrice de corrélation :**")
        st.image(FIG_CORR, use_container_width=True)

st.markdown("---")

# ─── Pied de page ─────────────────────────────────────────────────────────────
st.markdown("""
<div style="text-align:center;color:#666;font-size:0.85rem;padding:16px 0;">
    Agent IA — Prédiction du Prix du Gasoil &nbsp;|&nbsp;
    Données : pétrole Brent ($/baril) &nbsp;|&nbsp;
    Modèle : Machine Learning (scikit-learn / XGBoost)
</div>
""", unsafe_allow_html=True)
