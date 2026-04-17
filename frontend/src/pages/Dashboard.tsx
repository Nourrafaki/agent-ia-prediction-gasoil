// Dashboard.tsx — Tableau de bord principal avec navigation, alertes et animations
import React, { useEffect, useState } from 'react'
import PriceChart from '../components/PriceChart'
import PredictionCard from '../components/PredictionCard'
import Calculateur from '../components/Calculateur'
import Chatbot from '../components/Chatbot'
import About from './About'
import { fetchPrediction, fetchHistorique } from '../api/client'
import type { PredictionResponse } from '../api/client'

type Page = 'dashboard' | 'analyse' | 'apropos'

// ---------------------------------------------------------------------------
// Icone goutte de petrole SVG
// ---------------------------------------------------------------------------
const IconePetrole: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"
          fill="url(#petGrad)" stroke="#93C5FD" strokeWidth="0.4" />
    {/* Reflet */}
    <ellipse cx="9.5" cy="13" rx="1.2" ry="2.2" fill="white" fillOpacity="0.15"
             transform="rotate(-15 9.5 13)" />
    <defs>
      <linearGradient id="petGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
)

// ---------------------------------------------------------------------------
// Banniere d'alerte
// ---------------------------------------------------------------------------
const AlertBanner: React.FC<{ variation: number }> = ({ variation }) => {
  if (Math.abs(variation) <= 5) return null

  const hausse   = variation > 5
  const bg       = hausse ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'
  const bordure  = hausse ? '#EF4444' : '#10B981'
  const texte    = hausse
    ? `HAUSSE IMPORTANTE PREVUE +${variation.toFixed(1)}% — Constituez vos stocks sans attendre`
    : `BAISSE PREVUE ${variation.toFixed(1)}% — Attendez avant d'acheter pour profiter de prix plus bas`

  return (
    <div
      style={{
        background:    bg,
        borderBottom:  '1px solid ' + bordure + '40',
        borderTop:     '1px solid ' + bordure + '40',
        padding:       '10px 24px',
        display:       'flex',
        alignItems:    'center',
        gap:           '10px',
        animation:     'fadeIn 0.3s ease',
      }}
    >
      <span style={{ color: bordure, fontSize: '16px', fontWeight: 800 }}>
        {hausse ? '!' : '\u2193'}
      </span>
      <span style={{ color: bordure, fontSize: '13px', fontWeight: 600 }}>{texte}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Analyse : graphique agrandi + statistiques
// ---------------------------------------------------------------------------
const AnalysePage: React.FC = () => {
  const [stats, setStats] = useState<{
    min: number; max: number; moy: number; dernierPrix: number; volatilite: number
  } | null>(null)

  useEffect(() => {
    fetchHistorique().then((res) => {
      const vals = res.data.map((p) => p.valeur)
      if (vals.length === 0) return
      const moy  = vals.reduce((a, b) => a + b, 0) / vals.length
      // Ecart-type sur la derniere annee (52 derniers points)
      const recents = vals.slice(-52)
      const moyR    = recents.reduce((a, b) => a + b, 0) / recents.length
      const vol     = Math.sqrt(recents.reduce((s, v) => s + (v - moyR) ** 2, 0) / recents.length)
      setStats({
        min:         Math.min(...vals),
        max:         Math.max(...vals),
        moy:         moy,
        dernierPrix: vals[vals.length - 1],
        volatilite:  vol,
      })
    }).catch(() => {})
  }, [])

  const statCards = stats ? [
    { label: 'Prix min (depuis 2015)', val: `$${stats.min.toFixed(2)}`, col: '#10B981' },
    { label: 'Prix max (depuis 2015)', val: `$${stats.max.toFixed(2)}`, col: '#EF4444' },
    { label: 'Prix moyen historique',  val: `$${stats.moy.toFixed(2)}`, col: '#F1F5F9' },
    { label: 'Volatilite (52 sem.)',   val: `$${stats.volatilite.toFixed(2)}`, col: '#F59E0B' },
  ] : []

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>
          Analyse des prix
        </h2>
        <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
          Historique complet depuis 2015 — selectionnez une periode avec les boutons du graphique
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '14px', marginBottom: '20px' }}>
          {statCards.map(({ label, val, col }) => (
            <div key={label}
                 style={{ background: '#1E293B', border: '1px solid #334155',
                          borderRadius: '10px', padding: '14px 16px',
                          animation: 'slideUp 0.4s ease both' }}>
              <p style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase',
                          letterSpacing: '0.8px', margin: '0 0 6px' }}>{label}</p>
              <p style={{ color: col, fontSize: '22px', fontWeight: 800, margin: 0 }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Graphique pleine largeur */}
      <PriceChart />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contenu principal du dashboard
// ---------------------------------------------------------------------------
const DashboardContent: React.FC<{ prediction: PredictionResponse | null }> = ({ prediction }) => (
  <div style={{ animation: 'fadeIn 0.35s ease' }}>
    {/* Sous-titre */}
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>
        Tableau de bord — Prix du Brent
      </h2>
      <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
        Modele ML entraine sur donnees reelles 2015-2026 — Horizon de prediction : 4 semaines
      </p>
    </div>

    {/* Rangee superieure : Prediction + Graphique */}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr',
                  gap: '20px', marginBottom: '20px', alignItems: 'start' }}>
      <div style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
        <PredictionCard />
      </div>
      <div style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
        <PriceChart />
      </div>
    </div>

    {/* Calculateur d'economies */}
    <div style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
      <Calculateur prediction={prediction} />
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Composant racine
// ---------------------------------------------------------------------------
const Dashboard: React.FC = () => {
  const [page, setPage]             = useState<Page>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [heure]                     = useState(
    new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit',
                                         year: 'numeric', hour: '2-digit', minute: '2-digit' })
  )
  const [variation,   setVariation]   = useState<number>(0)
  const [prediction,  setPrediction]  = useState<PredictionResponse | null>(null)
  const [pageKey,     setPageKey]     = useState(0)  // force re-animation a chaque changement d'onglet

  // Charger la prediction pour la banniere et le calculateur
  useEffect(() => {
    fetchPrediction()
      .then((r) => { setVariation(r.variation_pct); setPrediction(r) })
      .catch(() => {})
  }, [refreshKey])

  const naviguer = (p: Page) => {
    setPage(p)
    setPageKey((k) => k + 1)
  }

  const ONGLETS: { id: Page; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analyse',   label: 'Analyse'   },
    { id: 'apropos',   label: 'A Propos'  },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F1F5F9',
                  fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Keyframes globaux */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) }
                             to   { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header style={{ background: '#0F172A', borderBottom: '1px solid #1E293B',
                       padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', height: '64px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo + Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36,
                          background: 'linear-gradient(135deg, #1D4ED8, #4F46E5)',
                          borderRadius: '8px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center' }}>
              <IconePetrole />
            </div>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#F1F5F9', lineHeight: 1 }}>
                Agent IA
              </h1>
              <p style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>
                Prediction Gasoil — Brent Crude
              </p>
            </div>
          </div>

          {/* Navigation centrale */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            {ONGLETS.map(({ id, label }) => {
              const actif = page === id
              return (
                <button
                  key={id}
                  onClick={() => naviguer(id)}
                  style={{
                    background:   actif ? '#1E293B' : 'transparent',
                    border:       actif ? '1px solid #334155' : '1px solid transparent',
                    borderRadius: '8px',
                    color:        actif ? '#F1F5F9' : '#64748B',
                    fontSize:     '13px',
                    fontWeight:   actif ? 600 : 400,
                    padding:      '6px 16px',
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                    position:     'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!actif) (e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1'
                  }}
                  onMouseLeave={(e) => {
                    if (!actif) (e.currentTarget as HTMLButtonElement).style.color = '#64748B'
                  }}
                >
                  {label}
                  {/* Soulignement actif */}
                  {actif && (
                    <span style={{ position: 'absolute', bottom: -1, left: '20%', right: '20%',
                                   height: 2, background: '#3B82F6', borderRadius: '999px' }} />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Statut + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981',
                            boxShadow: '0 0 6px #10B981' }} />
              <span style={{ color: '#64748B', fontSize: '11px' }}>API connectee</span>
            </div>
            <span style={{ color: '#475569', fontSize: '11px' }}>MAJ : {heure}</span>
            <button
              onClick={() => { setRefreshKey((k) => k + 1); setPageKey((k) => k + 1) }}
              style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
                       color: '#94A3B8', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
                       transition: 'all 0.15s' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#2D3F55'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#F1F5F9'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#1E293B'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'
              }}
            >
              Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Banniere d'alerte (conditionnelle)                               */}
      {/* ---------------------------------------------------------------- */}
      <AlertBanner variation={variation} />

      {/* ---------------------------------------------------------------- */}
      {/* Contenu de la page                                               */}
      {/* ---------------------------------------------------------------- */}
      <main
        key={pageKey}
        style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}
      >
        {page === 'dashboard' && <DashboardContent prediction={prediction} />}
        {page === 'analyse'   && <AnalysePage />}
        {page === 'apropos'   && <About />}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer style={{ borderTop: '1px solid #1E293B', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
          Agent IA Prediction Gasoil &copy; 2026 &mdash; Rafaki &mdash; EMSI Ingenierie Informatique
          &mdash; Encadrant : Mouad Banane
        </p>
      </footer>

      {/* ---------------------------------------------------------------- */}
      {/* Chatbot flottant                                                  */}
      {/* ---------------------------------------------------------------- */}
      <Chatbot />
    </div>
  )
}

export default Dashboard
