# Documentation complète — Agent IA Prédiction Gasoil
### Expliquée pour un débutant complet

---

## C'est quoi ce projet, en mots simples ?

Imagine que tu es directeur d'une entreprise de camions.  
Chaque semaine tu achètes du gasoil.  
Si tu achètes quand le prix est bas → tu économises de l'argent.  
Si tu attends et que le prix monte → tu perds de l'argent.

Ce projet est un **programme informatique intelligent** qui :

1. Regarde l'historique des prix du pétrole depuis 2015
2. Apprend des patterns (tendances, saisons, cycles)
3. Te dit : *"Dans 4 semaines, le prix sera à peu près $X"*
4. Affiche tout dans un beau tableau de bord accessible depuis un navigateur

---

## La structure du projet — les dossiers

```
projet_gasoil/
│
├── src/                         ← Les cerveaux du projet (Python)
│   ├── collect_data.py          → Étape 1 : récupérer les données
│   ├── preprocessing.py         → Étape 2 : préparer les données
│   ├── train_models.py          → Étape 3 : entraîner l'intelligence artificielle
│   └── auto_update.py           → Met tout à jour automatiquement chaque lundi
│
├── api/
│   └── main.py                  ← Le serveur web (le "guichet" entre Python et le navigateur)
│
├── frontend/
│   └── src/                     ← L'interface visuelle (ce que l'utilisateur voit)
│       ├── pages/Dashboard.tsx  → La page principale
│       ├── pages/About.tsx      → La page "À propos"
│       └── components/          → Les petits blocs visuels réutilisables
│
├── data/
│   ├── raw/prix_brent.csv       ← Les vrais prix historiques du pétrole
│   └── processed/               ← Les données enrichies, prêtes pour l'IA
│
└── models/
    ├── best_model.pkl           ← L'IA entraînée, sauvegardée sur le disque
    └── scaler.pkl               ← Un outil de normalisation des données
```

---

## FICHIER 1 — `src/collect_data.py` — "Aller chercher les données"

> **Analogie :** C'est comme aller au marché acheter les ingrédients avant de cuisiner.

### Ce que fait ce fichier

```
Internet (Yahoo Finance)
        ↓
yfinance télécharge le prix du pétrole chaque semaine depuis 2015
        ↓
Sauvegarde dans : data/raw/prix_brent.csv
```

Le fichier CSV ressemble à un tableau Excel :

| date       | prix  |
|------------|-------|
| 2015-01-01 | 48.65 |
| 2015-01-08 | 48.48 |
| ...        | ...   |
| 2026-04-09 | 97.44 |

**589 semaines de prix réels.**

### Explication ligne par ligne

```python
import yfinance as yf
# yfinance = une bibliothèque qui parle à Yahoo Finance
# Comme une application qui lit automatiquement les cours de bourse
```

```python
raw = yf.download("BZ=F", start="2015-01-01", interval="1wk")
# "BZ=F" = code boursier du pétrole Brent (Brent Crude Futures)
# start="2015-01-01" = on commence depuis le 1er janvier 2015
# interval="1wk" = on veut UN prix par semaine (pas par jour ou par heure)
```

```python
df = raw[["Close"]].copy()
# "Close" = prix de clôture (le dernier prix de la semaine)
# On garde uniquement cette colonne
```

```python
df.to_csv(RAW_PATH, index=False)
# Sauvegarde le résultat dans un fichier .csv
# C'est comme "Enregistrer sous" dans Excel
```

---

## FICHIER 2 — `src/preprocessing.py` — "Préparer les données"

> **Analogie :** C'est comme éplucher et couper les légumes avant de les mettre dans la casserole.

L'IA ne peut pas apprendre juste avec "date + prix".  
Elle a besoin de beaucoup plus d'informations.  
Ce fichier **crée 13 nouvelles colonnes** à partir du prix brut.

### Les "features" (colonnes créées)

#### Les lags (valeurs passées)

```python
df["lag_1"]  = df["prix"].shift(1)   # Prix de la semaine d'avant
df["lag_2"]  = df["prix"].shift(2)   # Prix d'il y a 2 semaines
df["lag_4"]  = df["prix"].shift(4)   # Prix d'il y a 1 mois
df["lag_8"]  = df["prix"].shift(8)   # Prix d'il y a 2 mois
df["lag_12"] = df["prix"].shift(12)  # Prix d'il y a 3 mois
```

> **Pourquoi ?**  
> Si le prix était à $100 la semaine dernière et $95 il y a 2 semaines,
> ça dit quelque chose sur la tendance actuelle.

#### Les moyennes mobiles (tendances lissées)

```python
df["MA4"]  = df["prix"].rolling(window=4).mean()   # Moyenne des 4 dernières semaines
df["MA12"] = df["prix"].rolling(window=12).mean()  # Moyenne des 3 derniers mois
df["MA26"] = df["prix"].rolling(window=26).mean()  # Moyenne des 6 derniers mois
```

> **Analogie :**  
> Regarder la météo sur 1 mois pour voir s'il fait tendanciellement chaud ou froid,
> plutôt que de regarder juste la météo d'aujourd'hui.

#### L'écart-type (mesure de la volatilité)

```python
df["std_4"] = df["prix"].rolling(window=4).std()
# std = standard deviation = écart-type en français
# Mesure si les prix bougent beaucoup ou peu sur 4 semaines
```

> **Pourquoi ?**  
> Si les prix bougent de ±10$/semaine, c'est risqué.  
> Si les prix bougent de ±1$/semaine, c'est stable.

#### Les variables de calendrier

```python
df["mois"]      = df["date"].dt.month    # 1 à 12 (janvier = 1)
df["trimestre"] = df["date"].dt.quarter  # 1 à 4 (printemps = 2)
df["semaine"]   = df["date"].isocalendar().week  # 1 à 52
```

> **Pourquoi ?**  
> Le pétrole est souvent plus cher en été (climatisation USA)
> et en hiver (chauffage Europe). Le mois a son importance.

#### La variation hebdomadaire

```python
df["variation_pct"] = df["prix"].pct_change() * 100
# Ex: prix passe de 95$ à 97$ → variation_pct = +2.1%
# pct_change() = calcule automatiquement le % de changement
```

### Résultat final

Le fichier `dataset_final.csv` contient **15 colonnes** et **564 lignes**.  
Les 25 premières lignes sont supprimées car les fenêtres glissantes  
(MA26 = 26 semaines) ne peuvent pas être calculées pour les premières semaines.

```
Avant le prétraitement :  2 colonnes  (date, prix)
Après le prétraitement : 15 colonnes  (date, prix, lag_1..12, MA4/12/26, std_4, 
                                       mois, trimestre, semaine, variation_pct)
```

---

## FICHIER 3 — `src/train_models.py` — "Entraîner l'intelligence artificielle"

> **Analogie :**  
> Apprendre à un élève à reconnaître des chats en lui montrant 1000 photos.  
> Sauf qu'ici, on apprend à un programme à prédire un prix futur.

### Étape 1 : Créer la "bonne réponse"

```python
df["cible"] = df["prix"].shift(-4)
# shift(-4) = décale vers l'avenir de 4 semaines
# Pour chaque semaine, la "bonne réponse" est le prix 4 semaines plus tard
```

> **Exemple concret :**  
> Semaine du 1er janvier : prix = $97, features = [lag_1=95, MA4=94, mois=1, ...]  
> La "bonne réponse" pour cette semaine = prix du 29 janvier = $101

### Étape 2 : Découper les données

```python
coupe = int(len(X) * 0.8)    # 80% pour apprendre
X_train = X.iloc[:coupe]      # Les 80 premières % = la "salle de cours"
X_test  = X.iloc[coupe:]      # Les 20 dernières % = "l'examen final"
```

> **Important :**  
> On respecte l'ordre chronologique.  
> On n'utilise JAMAIS des données futures pour apprendre le passé.  
> Ce serait comme donner les réponses de l'examen pendant les cours.

### Étape 3 : Normaliser les données (StandardScaler)

```python
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)  # Calibre ET transforme le train
X_test_s  = scaler.transform(X_test)       # Transforme le test avec la même calibration
```

> **Analogie :**  
> Convertir tout en euros pour pouvoir comparer des pommes avec des oranges.  
> `lag_1` va de 13$ à 122$.  
> `semaine` va de 1 à 52.  
> Sans normalisation, le modèle serait biaisé vers les grandes valeurs.  
> Le scaler ramène tout entre -3 et +3 environ.

### Étape 4 : Les 4 algorithmes comparés

```python
"Regression Lineaire" : LinearRegression()
# Trouve la droite qui passe au mieux à travers tous les points
# Rapide, simple, souvent le meilleur sur des données financières

"Random Forest" : RandomForestRegressor(n_estimators=100)
# 100 arbres de décision votent ensemble
# La majorité l'emporte → résultat plus stable

"XGBoost" : XGBRegressor(n_estimators=200, learning_rate=0.05)
# Construit 200 arbres en série
# Chaque arbre corrige les erreurs du précédent
# Très puissant, souvent gagnant en compétition

"Gradient Boosting" : GradientBoostingRegressor(n_estimators=200)
# Même principe qu'XGBoost mais implémentation différente
```

| Algorithme | Explication en 1 phrase |
|---|---|
| Régression Linéaire | Trace une droite à travers les données |
| Random Forest | 100 arbres de décision votent ensemble |
| XGBoost | 200 arbres en chaîne, chacun corrige le précédent |
| Gradient Boosting | Même idée qu'XGBoost, autre implémentation |

### Étape 5 : Mesurer les erreurs

```python
rmse = sqrt(mean_squared_error(y_test, y_pred))
# RMSE = Root Mean Square Error
# Si RMSE = 6.74 → en moyenne, la prédiction se trompe de ±6.74$/baril

mae = mean_absolute_error(y_test, y_pred)
# MAE = Mean Absolute Error
# Si MAE = 4.48 → 50% du temps, l'erreur est inférieure à 4.48$

r2 = r2_score(y_test, y_pred)
# R² va de 0 (modèle nul) à 1 (modèle parfait)
# Notre R² = 0.49 → le modèle capture 49% de la variabilité des prix
```

### Étape 6 : Sauvegarder le meilleur modèle

```python
joblib.dump(meilleur_modele, "models/best_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")
# .pkl = format "pickle" = sauvegarde Python
# Comme congeler un plat cuisiné pour le réchauffer plus tard
# Permet de réutiliser le modèle sans le réentraîner à chaque fois
```

### Résultats obtenus sur données réelles

| Modèle | RMSE | R² | Résultat |
|---|---|---|---|
| **Régression Linéaire** | **6.74** | **0.49** | **MEILLEUR** |
| Gradient Boosting | 8.74 | 0.14 | |
| XGBoost | 8.82 | 0.12 | |
| Random Forest | 9.58 | -0.03 | |

---

## FICHIER 4 — `src/auto_update.py` — "Le robot de maintenance"

> **Analogie :**  
> C'est le gardien qui vient chaque lundi matin, récupère les nouveaux prix,
> met à jour les données, et réentraîne l'IA automatiquement.

### Ce que fait ce fichier

```python
# Chaque lundi à 08h00, ce programme fait exactement 3 choses :

# ─── ÉTAPE 1 : Télécharger les nouveaux prix ────────────────────
df = yf.download("BZ=F", start="2015-01-01", interval="1wk")
# Si BZ=F (Brent) est indisponible → essaie CL=F (WTI pétrole américain)
# Écrase l'ancien fichier prix_brent.csv avec les nouvelles données

# ─── ÉTAPE 2 : Relancer le prétraitement ────────────────────────
from src.preprocessing import pretraiter
pretraiter()
# Recrée dataset_final.csv avec les nouvelles semaines ajoutées

# ─── ÉTAPE 3 : Réentraîner les 4 modèles ────────────────────────
from src.train_models import entrainer
entrainer()
# Réentraîne les 4 algorithmes sur les données à jour
# Sauvegarde le meilleur dans best_model.pkl
```

> **Résultat :** Sans intervention humaine, chaque lundi l'IA est automatiquement
> mise à jour avec les prix de la semaine écoulée.

---

## FICHIER 5 — `api/main.py` — "Le serveur / le guichet"

> **Analogie :**  
> C'est comme un guichetier à la banque.  
> Le navigateur (frontend) pose des questions → l'API répond avec les données.

### Ce qu'est une API

```
Navigateur web (frontend)              Serveur Python (api/main.py)
         │                                        │
         │  "Je veux la prédiction"               │
         │ ─────────────────────────────────────► │
         │  GET /api/prediction                   │ ← Charge le modèle
         │                                        │ ← Calcule la prédiction
         │  { "prediction": 101.23, ... }         │
         │ ◄───────────────────────────────────── │
         │                                        │
         │  Affiche $101.23 à l'écran             │
```

### Les endpoints disponibles (les "guichets")

```python
GET  /api/historique    → "Donne-moi tous les prix depuis 2015"
GET  /api/prediction    → "Quel sera le prix dans 4 semaines ?"
GET  /api/prix_actuel   → "Quel est le prix en ce moment ?" (via Yahoo Finance)
GET  /api/sparkline     → "Donne-moi les 10 derniers prix pour le mini-graphique"
GET  /api/metriques     → "Quelles sont les performances des 4 modèles ?"
GET  /api/statut        → "Le scheduler fonctionne-t-il ?"
POST /api/chat          → "Je pose une question au chatbot conseiller"
```

### Comment fonctionne la prédiction en temps réel

```python
@app.get("/api/prediction")
def prediction():

    # 1. Charge la dernière ligne du dataset (la semaine la plus récente)
    df = pd.read_csv("data/processed/dataset_final.csv")
    derniere_ligne = df.iloc[-1]
    # iloc[-1] = "donne-moi la toute dernière ligne"

    # 2. Extrait les 13 features de cette ligne
    X_pred = pd.DataFrame(
        [derniere_ligne[FEATURE_NAMES]],
        columns=FEATURE_NAMES
    )

    # 3. Normalise avec le même scaler utilisé à l'entraînement
    X_pred = scaler.transform(X_pred)

    # 4. Demande au modèle sa prédiction
    valeur_predite = model.predict(X_pred)[0]   # Ex: 101.23

    # 5. Calcule l'intervalle de confiance
    # 1.96 × RMSE couvre 95% des cas statistiquement
    marge = 1.96 * 6.74   # ≈ ±13.21$

    # 6. Retourne le résultat au navigateur
    return {
        "prediction":      101.23,
        "borne_inf":        88.02,   # 101.23 - 13.21
        "borne_sup":       114.44,   # 101.23 + 13.21
        "date_prediction": "2026-05-14",
        "prix_actuel":      97.44,
        "variation_pct":    +3.88,   # +3.88% de hausse prévue
    }
```

### Le chatbot — logique de règles

```python
@app.post("/api/chat")
def chat(body):

    # Calcule la variation entre prix actuel et prix prédit
    variation = (prix_predit - prix_actuel) / prix_actuel × 100

    # ─── Règle 1 : Si le prix va beaucoup monter ────────────────
    if variation > +3%:
        recommandation = "ACHETER MAINTENANT"
        message = "Le prix va passer de $97 à $101 (+3.88%). 
                   Constituez vos stocks maintenant !"

    # ─── Règle 2 : Si le prix va beaucoup baisser ───────────────
    elif variation < -3%:
        recommandation = "ATTENDRE"
        message = "Le prix va passer de $97 à $93 (-4.1%). 
                   Attendez 4 semaines pour économiser."

    # ─── Règle 3 : Prix stable ───────────────────────────────────
    else:
        recommandation = "NEUTRE"
        message = "Le prix restera stable autour de $97. 
                   Achetez selon vos besoins habituels."

    # Détecte aussi des mots-clés dans la question :
    # "risque"   → calcule le coût financier d'attendre
    # "tendance" → donne les chiffres détaillés
    # "bonjour"  → message de résumé complet
```

### Le scheduler (réveil automatique)

```python
# Au démarrage du serveur, on programme une alarme :
scheduler.add_job(
    _job_mise_a_jour,            # La fonction à exécuter
    trigger=CronTrigger(
        day_of_week="mon",       # Chaque lundi
        hour=8,                  # À 8h00
        minute=0                 # À 0 minute
    )
)

# Résultat :
# Chaque lundi matin le serveur se réveille tout seul,
# télécharge les nouveaux prix, réentraîne l'IA,
# et recharge le modèle en mémoire.
# Personne n'a besoin de faire quoi que ce soit.
```

---

## FICHIER 6 — `frontend/` — "L'interface visuelle"

> **Analogie :**  
> Tout ce qui précède est le moteur d'une voiture.  
> Le frontend, c'est le tableau de bord et le volant —  
> ce que le conducteur voit et touche.

### Technologies utilisées

| Technologie | Rôle simple |
|---|---|
| **React** | Système pour construire des pages web en "blocs" réutilisables |
| **TypeScript** | Comme JavaScript mais avec vérification des erreurs avant lancement |
| **Recharts** | Bibliothèque pour dessiner des graphiques interactifs |
| **Axios** | Outil pour appeler le serveur FastAPI depuis le navigateur |

### Structure d'un composant React

```tsx
// Un composant = un bloc visuel réutilisable
// Exemple : PredictionCard.tsx = la carte qui affiche le prix + prédiction

const PredictionCard = () => {

  // ─── 1. ÉTAT : les données que le composant mémorise ────────
  const [prediction, setPrediction] = useState(null)
  // useState(null) = "au départ, il n'y a rien. 
  //                   Quand on reçoit des données, on les stocke ici"

  const [prixActuel, setPrixActuel] = useState(null)

  // ─── 2. EFFET : code qui s'exécute au chargement de la page ─
  useEffect(() => {

    // Appelle le serveur FastAPI pour récupérer les données
    fetchPrediction().then(res => setPrediction(res))
    fetchPrixActuel().then(res => setPrixActuel(res))

    // Rafraîchit le prix toutes les 60 secondes
    setInterval(fetchPrixActuel, 60_000)

  }, [])  // [] = exécuter une seule fois au chargement

  // ─── 3. RENDU : ce qui s'affiche à l'écran ──────────────────
  return (
    <div>
      <h2>Prix actuel : ${prixActuel.prix}</h2>
      <h2>Prédiction : ${prediction.prediction}</h2>
    </div>
  )
}
```

### L'animation des chiffres (useCompteur)

```tsx
// Ce "hook" fait monter un chiffre progressivement de 0 vers sa valeur finale
// Ex : affiche 0 → 20 → 55 → 85 → 97.44 en 0.9 secondes

function useCompteur(cible: number, duree = 900): number {
  const [val, setVal] = useState(0)  // Commence à 0

  useEffect(() => {
    const debut = performance.now()  // Note l'heure de départ en millisecondes

    const step = (now) => {
      const p    = (now - debut) / duree  // Progression : 0 → 1 en 900ms
      const ease = 1 - (1 - p) puissance 3  // Ralentit en fin d'animation

      setVal(cible × ease)  // Met à jour le chiffre affiché

      if (p < 1) requestAnimationFrame(step)  // Continue l'animation
    }

    requestAnimationFrame(step)  // Lance l'animation
  }, [cible])

  return val  // Retourne la valeur animée actuelle
}

// Utilisation dans le composant :
const prixAnime = useCompteur(97.44)
// → L'écran affichera : 0 ... 23 ... 65 ... 92 ... 97.44
```

### Le mini-graphique sparkline (SVG)

```tsx
// SVG = format vectoriel pour dessiner dans le navigateur
// Comme du dessin vectoriel (Illustrator) mais dans du code

const Sparkline = ({ values }) => {

  const min = Math.min(...values)  // Plus petit prix des 10 dernières semaines
  const max = Math.max(...values)  // Plus grand prix des 10 dernières semaines

  // Calcule la position de chaque point sur le graphique
  const points = values.map((v, i) => {
    const x = (i / 9) × 100    // Position horizontale : 0 à 100 pixels
    const y = 32 - ((v - min) / (max - min)) × 28  // Position verticale : 0 à 32 pixels
    return `${x},${y}`
  })

  // Dessine la courbe avec SVG
  return (
    <svg viewBox="0 0 100 32">
      <path d={`M${points.join('L')}`}    // M = "Move to", L = "Line to"
            stroke="#10B981"               // Couleur verte
            strokeWidth="1.5"
            fill="none" />
    </svg>
  )
}
// Résultat : une petite courbe des 10 derniers prix sous le prix actuel
```

### Le Calculateur d'économies

```tsx
const Calculateur = ({ prediction }) => {
  const [litres, setLitres] = useState('5000')  // Valeur par défaut

  const TAUX_MAD         = 10    // 1 dollar = 10 dirhams marocains
  const LITRES_PAR_BARIL = 159   // 1 baril de pétrole = 159 litres

  // Convertit les litres en nombre de barils
  const barils = litres / 159    // Ex: 5000 / 159 = 31.4 barils

  // Calcule les coûts en dirhams marocains (MAD)
  const coutMaintenant = barils × prixActuel × TAUX_MAD
  // Ex: 31.4 × 97$ × 10 = 30 458 MAD

  const coutDans4Sem = barils × prixPredit × TAUX_MAD
  // Ex: 31.4 × 101$ × 10 = 31 714 MAD

  const economie = coutMaintenant - coutDans4Sem
  // Positif → économie si on achète maintenant
  // Négatif → économie si on attend
  // Ex: 30 458 - 31 714 = -1 256 MAD (on paierait 1 256 MAD de plus si on attend)
}
```

---

## Le flux complet — comment tout se connecte

```
╔══════════════════════════════════════════════════════════════════╗
║                     CHAQUE LUNDI À 8H00                         ║
╚══════════════════════════════════════════════════════════════════╝
                              │
                              ▼
                    auto_update.py se réveille
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
     1. Télécharge     2. Recrée les    3. Réentraîne
        les vrais         13 features      les 4 modèles
        prix (yfinance)   (preprocessing)  (train_models)
              │               │                │
              └───────────────┴────────────────┘
                              │
                              ▼
                  best_model.pkl mis à jour


╔══════════════════════════════════════════════════════════════════╗
║                   PENDANT LA SEMAINE                             ║
╚══════════════════════════════════════════════════════════════════╝
                              │
                              ▼
      Utilisateur ouvre http://localhost:5173 dans son navigateur
                              │
                              ▼
                Dashboard.tsx s'affiche à l'écran
                              │
                              ▼
         PredictionCard.tsx appelle GET /api/prediction
                              │
                              ▼
                  api/main.py reçoit la demande
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
     Charge la        Normalise avec    Demande au modèle
     dernière ligne   scaler.pkl        sa prédiction
     du dataset                         → 101.23$
              │               │                │
              └───────────────┴────────────────┘
                              │
                              ▼
            Retourne: { prediction: 101.23, borne_inf: 88, ... }
                              │
                              ▼
          PredictionCard.tsx affiche le prix avec animation
          (compteur qui monte de 0 → 101.23 en 0.9 secondes)
                              │
                              ▼
         Toutes les 60 secondes : le prix actuel se rafraîchit
```

---

## Les métriques d'évaluation — est-ce que l'IA est bonne ?

| Métrique | Ce que ça mesure | Notre résultat | Signification |
|---|---|---|---|
| **RMSE** | Erreur moyenne en dollars | **6.74 $/baril** | On se trompe en moyenne de ±6.74$ |
| **MAE** | Erreur absolue médiane | **4.48 $/baril** | La moitié du temps l'erreur est < 4.48$ |
| **R²** | Score global (0 = nul, 1 = parfait) | **0.49** | On capture 49% de la variabilité des prix |

> **Pourquoi R² = 0.49 et pas 0.99 ?**  
>
> Le pétrole est influencé par des guerres, des décisions politiques de l'OPEP,
> des pandémies, des crises économiques — des événements totalement imprévisibles.  
> Même les banques mondiales avec des supercalculateurs ne dépassent pas 60-70%.  
> **Notre modèle est honnête** : il dit ce qu'il peut dire, pas plus.

---

## En résumé — les 5 technologies expliquées simplement

| Technologie | Rôle dans le projet | Analogie |
|---|---|---|
| **Python** | Langage du backend et de l'IA | La langue dans laquelle le moteur est écrit |
| **FastAPI** | Serveur web qui répond aux questions | Le guichetier de la banque |
| **Scikit-learn / XGBoost** | Les algorithmes d'apprentissage automatique | Le cerveau qui apprend à prédire |
| **React / TypeScript** | L'interface visuelle dans le navigateur | Le tableau de bord de la voiture |
| **yfinance** | Connexion aux données financières réelles | Le journaliste qui lit les cours de bourse |

---

## Glossaire — les mots techniques expliqués

| Mot technique | Définition simple |
|---|---|
| **API** | Un "guichet" informatique qui répond à des questions via internet |
| **DataFrame** | Un tableau de données en Python (comme Excel mais dans du code) |
| **Feature** | Une colonne d'information donnée à l'IA pour apprendre |
| **Lag** | Valeur passée d'une variable (prix d'il y a N semaines) |
| **Modèle** | Un programme qui a appris des patterns et peut faire des prédictions |
| **RMSE** | Mesure de l'erreur moyenne d'un modèle (plus c'est petit, mieux c'est) |
| **R²** | Score de qualité d'un modèle (0 = nul, 1 = parfait) |
| **Scaler** | Outil qui remet toutes les valeurs à la même échelle |
| **Scheduler** | Un réveil programmé qui exécute du code à une heure précise |
| **CSV** | Fichier texte qui stocke un tableau (comme Excel, mais plus simple) |
| **PKL** | Format de sauvegarde Python (congèle un objet pour le réutiliser) |
| **Endpoint** | Une adresse web qui répond à une question précise |
| **Component** | Un bloc visuel réutilisable en React |
| **useState** | Mécanisme React pour mémoriser des données dans un composant |
| **useEffect** | Mécanisme React pour exécuter du code au chargement de la page |
| **SVG** | Format de dessin vectoriel dans un navigateur web |

---

*Documentation rédigée pour le projet Agent IA Prediction Gasoil*  
*Auteur : Rafaki — EMSI Ingénierie Informatique — Encadrant : Mouad Banane — 2025/2026*
