// About.tsx — Presentation du projet Agent IA Prediction Gasoil
import React from 'react'

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

// Carte technologie
const TechCard: React.FC<{ nom: string; desc: string; couleur: string; lettre: string }> =
  ({ nom, desc, couleur, lettre }) => (
  <div
    style={{
      background:   '#0F172A',
      border:       '1px solid #1E293B',
      borderTop:    '3px solid ' + couleur,
      borderRadius: '10px',
      padding:      '16px',
      animation:    'fadeIn 0.5s ease both',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <div style={{ width: 32, height: 32, borderRadius: '8px', background: couleur + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: couleur, fontWeight: 800, fontSize: '14px' }}>
        {lettre}
      </div>
      <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '14px' }}>{nom}</span>
    </div>
    <p style={{ color: '#64748B', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{desc}</p>
  </div>
)

// Etape du pipeline
const EtapePipeline: React.FC<{ num: number; titre: string; desc: string; derniere?: boolean }> =
  ({ num, titre, desc, derniere }) => (
  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
    {/* Cercle + trait */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1D4ED8, #4F46E5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '14px' }}>
        {num}
      </div>
      {!derniere && <div style={{ width: 2, height: 36, background: '#1E293B', marginTop: 4 }} />}
    </div>
    {/* Contenu */}
    <div style={{ paddingBottom: derniere ? 0 : '8px' }}>
      <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px', margin: '6px 0 4px' }}>
        {titre}
      </p>
      <p style={{ color: '#64748B', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
)

// Carte modele ML
const ModeleCard: React.FC<{ nom: string; rmse: string; r2: string; meilleur?: boolean }> =
  ({ nom, rmse, r2, meilleur }) => (
  <div
    style={{
      background:   meilleur ? 'rgba(59,130,246,0.08)' : '#0F172A',
      border:       '1px solid ' + (meilleur ? '#3B82F6' : '#1E293B'),
      borderRadius: '8px',
      padding:      '12px 16px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
    }}
  >
    <div>
      <span style={{ color: meilleur ? '#93C5FD' : '#CBD5E1', fontWeight: meilleur ? 700 : 400,
                     fontSize: '13px' }}>{nom}</span>
      {meilleur && (
        <span style={{ marginLeft: 8, fontSize: '9px', background: '#1D4ED8',
                       color: '#BFDBFE', padding: '2px 6px', borderRadius: '4px' }}>
          MEILLEUR
        </span>
      )}
    </div>
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748B', fontSize: '9px', margin: '0 0 2px', textTransform: 'uppercase' }}>RMSE</p>
        <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '13px', margin: 0 }}>{rmse}</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748B', fontSize: '9px', margin: '0 0 2px', textTransform: 'uppercase' }}>R²</p>
        <p style={{ color: '#10B981', fontWeight: 700, fontSize: '13px', margin: 0 }}>{r2}</p>
      </div>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
const About: React.FC = () => (
  <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>

    {/* ------------------------------------------------------------------ */}
    {/* Banniere de titre                                                   */}
    {/* ------------------------------------------------------------------ */}
    <div
      style={{
        background:   'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border:       '1px solid #334155',
        borderRadius: '12px',
        padding:      '32px',
        marginBottom: '24px',
        textAlign:    'center',
      }}
    >
      {/* Icone */}
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"
                fill="url(#g2)" stroke="#93C5FD" strokeWidth="0.5" />
          <defs>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>
        Agent IA — Prediction du Prix du Gasoil
      </h1>
      <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '600px', margin: '0 auto 16px' }}>
        Application web de prediction du prix du petrole brut a 4 semaines,
        combinant un pipeline Machine Learning Python et un tableau de bord React interactif.
      </p>
      {/* Badges infos projet */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Auteur',     val: 'Rafaki' },
          { label: 'Ecole',      val: 'EMSI — Ingenierie Informatique' },
          { label: 'Encadrant',  val: 'Mouad Banane' },
          { label: 'Annee',      val: '2025 / 2026' },
        ].map(({ label, val }) => (
          <div key={label}
               style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px',
                        padding: '6px 14px' }}>
            <span style={{ color: '#475569', fontSize: '10px' }}>{label} : </span>
            <span style={{ color: '#93C5FD', fontSize: '12px', fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>

    {/* ------------------------------------------------------------------ */}
    {/* Section : Le Projet                                                 */}
    {/* ------------------------------------------------------------------ */}
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px',
                  padding: '24px', marginBottom: '20px' }}>
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        Le Projet
      </h2>
      <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.7, margin: '0 0 8px' }}>
        Ce projet vise a aider les responsables achats des entreprises de transport, logistique
        et agriculture a optimiser leurs decisions d'achat de gasoil en anticipant les
        fluctuations du prix du petrole brut (WTI/Brent).
      </p>
      <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.7, margin: '0 0 8px' }}>
        Un modele de Machine Learning est entraine sur l'historique hebdomadaire reel depuis 2015
        (source Yahoo Finance) pour predire le prix dans 4 semaines avec un intervalle de
        confiance a 95%.
      </p>
      <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
        Les donnees sont mises a jour automatiquement chaque lundi via un scheduler integre,
        et le modele est reentraine a chaque mise a jour pour rester pertinent.
      </p>
    </div>

    {/* ------------------------------------------------------------------ */}
    {/* Section : Technologies                                              */}
    {/* ------------------------------------------------------------------ */}
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
        Technologies utilisees
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px' }}>
        <TechCard nom="React 18"     lettre="R" couleur="#61DAFB" desc="Interface utilisateur, composants fonctionnels, hooks" />
        <TechCard nom="TypeScript"   lettre="T" couleur="#3178C6" desc="Typage statique, interfaces, type-safety" />
        <TechCard nom="Python 3.11"  lettre="P" couleur="#F7C948" desc="Backend, traitement des donnees, ML pipeline" />
        <TechCard nom="FastAPI"      lettre="F" couleur="#009688" desc="API REST asynchrone, endpoints JSON, CORS" />
        <TechCard nom="Scikit-learn" lettre="S" couleur="#F89939" desc="Regression lineaire, Random Forest, Gradient Boosting" />
        <TechCard nom="XGBoost"      lettre="X" couleur="#E45A2B" desc="Boosting de gradient, 200 estimateurs" />
        <TechCard nom="yfinance"     lettre="Y" couleur="#6366F1" desc="Donnees historiques reelles WTI/Brent hebdomadaires" />
        <TechCard nom="Recharts"     lettre="C" couleur="#22D3EE" desc="Graphique interactif avec selecteur de periode" />
      </div>
    </div>

    {/* ------------------------------------------------------------------ */}
    {/* Section : Modeles ML compares                                       */}
    {/* ------------------------------------------------------------------ */}
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px',
                  padding: '24px', marginBottom: '20px' }}>
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
        Modeles ML compares
      </h2>
      <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 14px' }}>
        4 algorithmes entraines sur split chronologique 80/20 — selection par RMSE minimal
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ModeleCard nom="Regression Lineaire"  rmse="6.74" r2="0.49" meilleur />
        <ModeleCard nom="Gradient Boosting"    rmse="8.74" r2="0.14" />
        <ModeleCard nom="XGBoost"              rmse="8.82" r2="0.12" />
        <ModeleCard nom="Random Forest"        rmse="9.58" r2="-0.03" />
      </div>
      <p style={{ color: '#475569', fontSize: '11px', marginTop: '12px', fontStyle: 'italic' }}>
        R² de 0.49 sur donnees reelles — predire le petrole a 4 semaines est intrinsequement difficile.
        La regression lineaire capture mieux l'inertie des series temporelles sur cet horizon.
      </p>
    </div>

    {/* ------------------------------------------------------------------ */}
    {/* Section : Pipeline de donnees                                       */}
    {/* ------------------------------------------------------------------ */}
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px',
                  padding: '24px', marginBottom: '20px' }}>
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
        Pipeline de donnees
      </h2>
      <EtapePipeline num={1} titre="Collecte des donnees"
        desc="Telechargement hebdomadaire via yfinance (BZ=F / CL=F) depuis 2015. 589 semaines de prix reels." />
      <EtapePipeline num={2} titre="Nettoyage & Feature Engineering"
        desc="Lags (1, 2, 4, 8, 12 sem.), moyennes mobiles (MA4/12/26), ecart-type glissant, variables temporelles. 13 features au total." />
      <EtapePipeline num={3} titre="Entrainement des modeles"
        desc="Split chronologique 80/20 (jamais aleatoire). StandardScaler ajuste sur le train uniquement. 4 modeles compares par RMSE." />
      <EtapePipeline num={4} titre="Prediction"
        desc="Le meilleur modele predit le prix a 4 semaines avec intervalle de confiance ±1.96 * RMSE (95%)." />
      <EtapePipeline num={5} titre="Dashboard & mise a jour automatique"
        desc="API FastAPI + frontend React. Scheduler APScheduler relance le pipeline chaque lundi a 08h00." derniere />
    </div>

  </div>
)

export default About
