// PredictionCard.tsx — Prix actuel temps reel + prediction + sparkline + compteur anime
import React, { useEffect, useRef, useState } from 'react'
import { fetchPrediction, fetchPrixActuel, fetchSparkline } from '../api/client'
import type { PredictionResponse, PrixActuelResponse } from '../api/client'
import Spinner from './Spinner'
import ErrorCard from './ErrorCard'

const REFRESH_MS = 60_000

// ---------------------------------------------------------------------------
// Hook : animation de compteur (de 0 vers la valeur cible)
// ---------------------------------------------------------------------------
function useCompteur(cible: number, duree = 900): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!cible) return
    const debut = performance.now()
    const step = (now: number) => {
      const p    = Math.min((now - debut) / duree, 1)
      const ease = 1 - Math.pow(1 - p, 3) // ease-out cubique
      setVal(parseFloat((cible * ease).toFixed(2)))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [cible, duree])
  return val
}

// ---------------------------------------------------------------------------
// Composant : sparkline SVG 100x32
// ---------------------------------------------------------------------------
const Sparkline: React.FC<{ values: number[]; couleur: string }> = ({ values, couleur }) => {
  if (values.length < 2) return null
  const min   = Math.min(...values)
  const max   = Math.max(...values)
  const range = max - min || 1
  const W = 100; const H = 32

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = `M${pts.join('L')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '32px', overflow: 'visible' }}>
      {/* Aire sous la courbe */}
      <path d={d + `L${W},${H}L0,${H}Z`} fill={couleur} fillOpacity="0.10" />
      {/* Ligne */}
      <path d={d} stroke={couleur} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Point final */}
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]}
              r="2.5" fill={couleur} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
const PredictionCard: React.FC = () => {
  const [prediction, setPrediction]   = useState<PredictionResponse | null>(null)
  const [prixActuel, setPrixActuel]   = useState<PrixActuelResponse | null>(null)
  const [sparkValues, setSparkValues] = useState<number[]>([])
  const [chargement, setChargement]   = useState(true)
  const [chargePrix, setChargePrix]   = useState(true)
  const [erreur, setErreur]           = useState<string | null>(null)
  const [erreurPrix, setErreurPrix]   = useState<string | null>(null)
  const [heureMAJ, setHeureMAJ]       = useState('')
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Compteurs animes
  const prixAnime = useCompteur(prixActuel?.prix ?? 0)
  const predAnime = useCompteur(prediction?.prediction ?? 0)

  const chargerPrediction = async () => {
    setChargement(true); setErreur(null)
    try { setPrediction(await fetchPrediction()) }
    catch (e: any) { setErreur(e?.response?.data?.detail ?? 'Erreur prediction.') }
    finally { setChargement(false) }
  }

  const chargerPrix = async () => {
    setChargePrix(true); setErreurPrix(null)
    try {
      setPrixActuel(await fetchPrixActuel())
      setHeureMAJ(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    catch (e: any) { setErreurPrix(e?.response?.data?.detail ?? 'Prix indisponible.') }
    finally { setChargePrix(false) }
  }

  const chargerSparkline = async () => {
    try {
      const res = await fetchSparkline()
      setSparkValues(res.data.map(p => p.prix))
    } catch { /* sparkline non bloquant */ }
  }

  useEffect(() => {
    chargerPrediction()
    chargerPrix()
    chargerSparkline()
    intervalRef.current = setInterval(chargerPrix, REFRESH_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  if (chargement) return <Spinner message="Calcul de la prediction..." />
  if (erreur || !prediction) return <ErrorCard message={erreur ?? 'Donnees indisponibles'} onRetry={chargerPrediction} />

  // Couleurs variation prix actuel
  const hausse         = prixActuel ? prixActuel.variation_pct > 0 : false
  const couleurActuel  = hausse ? '#10B981' : '#EF4444'
  const flecheActuel   = hausse ? '\u25B2' : '\u25BC'
  const bordureGauche  = hausse ? '#10B981' : '#EF4444'

  // Couleurs variation prediction
  const haussePred   = prediction.variation_pct > 0
  const couleurPred  = haussePred ? '#EF4444' : '#10B981'
  const flechePred   = haussePred ? '\u25B2' : '\u25BC'
  const labelPred    = haussePred ? 'Hausse prevue' : 'Baisse prevue'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ================================================================ */}
      {/* SECTION 1 : Prix actuel en temps reel                            */}
      {/* ================================================================ */}
      <div
        style={{
          background:      'linear-gradient(135deg, #0F1F35 0%, #0A1628 100%)',
          border:          '1px solid #1E3A5F',
          borderLeft:      `4px solid ${bordureGauche}`,
          borderRadius:    '12px 12px 0 0',
          padding:         '16px 20px 12px',
        }}
      >
        <p style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase',
                    letterSpacing: '1.2px', margin: '0 0 8px 0' }}>
          Prix actuel du Brent (temps reel)
        </p>

        {chargePrix ? (
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>Chargement...</p>
        ) : erreurPrix || !prixActuel ? (
          <p style={{ color: '#EF4444', fontSize: '12px', margin: 0 }}>{erreurPrix ?? 'Indisponible'}</p>
        ) : (
          <>
            {/* Prix anime */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#F8FAFC',
                             letterSpacing: '-1px', lineHeight: 1.1 }}>
                ${prixAnime.toFixed(2)}
              </span>
              <span style={{ fontSize: '14px', color: '#94A3B8' }}>/baril</span>
            </div>

            {/* Variation journaliere */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px' }}>
              <span style={{ color: couleurActuel, fontSize: '14px', fontWeight: 700 }}>
                {flecheActuel} {Math.abs(prixActuel.variation_pct).toFixed(2)}%
              </span>
              <span style={{ color: '#475569', fontSize: '11px' }}>
                vs seance precedente — {prixActuel.date}
              </span>
            </div>

            {/* Sparkline */}
            {sparkValues.length >= 2 && (
              <Sparkline values={sparkValues} couleur={couleurActuel} />
            )}

            {/* Heure MAJ */}
            <p style={{ color: '#334155', fontSize: '10px', margin: '6px 0 0', textAlign: 'right' }}>
              Mis a jour a {heureMAJ}
            </p>
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 2 : Prediction ML a 4 semaines                          */}
      {/* ================================================================ */}
      <div
        style={{
          background:   'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          border:       '1px solid #334155',
          borderTop:    'none',
          borderRadius: '0 0 12px 12px',
          padding:      '20px',
          textAlign:    'center',
        }}
      >
        {/* Badge date */}
        <div style={{ display: 'inline-block', background: '#1D4ED8', color: '#BFDBFE',
                      fontSize: '11px', padding: '3px 12px', borderRadius: '999px',
                      marginBottom: '10px', letterSpacing: '0.5px' }}>
          Prediction ML — {prediction.date_prediction}
        </div>

        {/* Prix predit anime */}
        <div style={{ marginBottom: '6px' }}>
          <span style={{ fontSize: '48px', fontWeight: 800, color: '#F1F5F9',
                         letterSpacing: '-1px', lineHeight: 1.1 }}>
            ${predAnime.toFixed(2)}
          </span>
          <span style={{ fontSize: '16px', color: '#94A3B8', marginLeft: '4px' }}>/baril</span>
        </div>

        {/* Variation prevue */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', marginBottom: '14px' }}>
          <span style={{ color: couleurPred, fontSize: '20px', fontWeight: 700 }}>{flechePred}</span>
          <span style={{ color: couleurPred, fontSize: '16px', fontWeight: 700 }}>
            {Math.abs(prediction.variation_pct).toFixed(2)}%
          </span>
          <span style={{ color: '#64748B', fontSize: '13px' }}>
            {labelPred} vs ${prediction.prix_actuel.toFixed(2)}
          </span>
        </div>

        {/* Separateur */}
        <div style={{ borderTop: '1px solid #334155', margin: '12px 0' }} />

        {/* Intervalle de confiance */}
        <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '8px' }}>
          Intervalle de confiance (95%)
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <div>
            <p style={{ color: '#94A3B8', fontSize: '10px', margin: '0 0 2px' }}>Borne inf.</p>
            <p style={{ color: '#10B981', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              ${prediction.borne_inf.toFixed(2)}
            </p>
          </div>
          <div style={{ width: '1px', background: '#334155', alignSelf: 'stretch' }} />
          <div>
            <p style={{ color: '#94A3B8', fontSize: '10px', margin: '0 0 2px' }}>Borne sup.</p>
            <p style={{ color: '#EF4444', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              ${prediction.borne_sup.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Separateur bas */}
        <div style={{ borderTop: '1px solid #334155', margin: '12px 0' }} />

        {/* Dates */}
        <p style={{ color: '#475569', fontSize: '10px', margin: '0 0 2px' }}>
          Modele entraine sur donnees au {prediction.derniere_mise_a_jour}
        </p>
        <p style={{ color: '#334155', fontSize: '10px', margin: 0, fontStyle: 'italic' }}>
          Donnees mises a jour automatiquement chaque lundi
        </p>
      </div>
    </div>
  )
}

export default PredictionCard
