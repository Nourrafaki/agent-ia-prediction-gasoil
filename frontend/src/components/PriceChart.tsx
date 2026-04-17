// PriceChart.tsx — Graphique des prix historiques avec sélecteur de période
import React, { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { fetchHistorique, fetchPrediction } from '../api/client'
import type { PrixHistorique } from '../api/client'
import Spinner from './Spinner'
import ErrorCard from './ErrorCard'

interface DataPoint {
  date: string
  historique?: number
  prediction?: number
}

type Periode = '6m' | '1a' | '3a' | 'tout'

const OPTIONS_PERIODE: { label: string; valeur: Periode }[] = [
  { label: '6 mois', valeur: '6m'   },
  { label: '1 an',   valeur: '1a'   },
  { label: '3 ans',  valeur: '3a'   },
  { label: 'Tout',   valeur: 'tout' },
]

/** Retourne la date ISO minimale correspondant a la periode choisie. */
function dateMin(periode: Periode): string | null {
  const now = new Date()
  if (periode === '6m') {
    now.setMonth(now.getMonth() - 6)
  } else if (periode === '1a') {
    now.setFullYear(now.getFullYear() - 1)
  } else if (periode === '3a') {
    now.setFullYear(now.getFullYear() - 3)
  } else {
    return null  // pas de filtre
  }
  return now.toISOString().slice(0, 10)
}

const TooltipPersonnalise = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 14px',
      }}
    >
      <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: '13px', fontWeight: 600 }}>
          {entry.name === 'historique' ? 'Historique' : 'Prediction'} :{' '}
          <span style={{ color: '#F1F5F9' }}>{entry.value?.toFixed(2)} $/baril</span>
        </p>
      ))}
    </div>
  )
}

const PriceChart: React.FC = () => {
  const [tousLesDonnees, setTousLesDonnees] = useState<DataPoint[]>([])
  const [chargement, setChargement]         = useState(true)
  const [erreur, setErreur]                 = useState<string | null>(null)
  const [periode, setPeriode]               = useState<Periode>('tout')

  const charger = async () => {
    setChargement(true)
    setErreur(null)
    try {
      const [histRes, predRes] = await Promise.all([
        fetchHistorique(),
        fetchPrediction().catch(() => null),
      ])

      const points: DataPoint[] = histRes.data.map((p: PrixHistorique) => ({
        date: p.date,
        historique: p.valeur,
      }))

      if (predRes) {
        points.push({ date: predRes.date_prediction, prediction: predRes.prediction })
      }

      setTousLesDonnees(points)
    } catch (e: any) {
      setErreur(e?.response?.data?.detail ?? 'Impossible de charger les donnees graphique.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [])

  // Filtrage cote client selon la periode selectionnee
  const donnees = useMemo(() => {
    const min = dateMin(periode)
    if (!min) return tousLesDonnees
    return tousLesDonnees.filter((p) => p.date >= min)
  }, [tousLesDonnees, periode])

  if (chargement) return <Spinner message="Chargement du graphique..." />
  if (erreur)     return <ErrorCard message={erreur} onRetry={charger} />

  // Intervalle d'affichage des ticks selon le volume de points
  const tickInterval = donnees.length > 200
    ? Math.floor(donnees.length / 10)
    : donnees.length > 50
      ? Math.floor(donnees.length / 8)
      : 'preserveStartEnd'

  return (
    <div
      style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* En-tete : titre + sélecteur de periode */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, margin: 0 }}>
          Prix historiques du Brent &amp; prediction
        </h2>

        {/* Boutons de periode */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {OPTIONS_PERIODE.map(({ label, valeur }) => {
            const actif = periode === valeur
            return (
              <button
                key={valeur}
                onClick={() => setPeriode(valeur)}
                style={{
                  background:   actif ? '#3B82F6' : '#0F172A',
                  color:        actif ? '#FFFFFF' : '#64748B',
                  border:       actif ? '1px solid #3B82F6' : '1px solid #334155',
                  borderRadius: '6px',
                  padding:      '4px 12px',
                  fontSize:     '12px',
                  fontWeight:   actif ? 600 : 400,
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Compteur de points affiches */}
      <p style={{ color: '#475569', fontSize: '11px', margin: '0 0 12px 0' }}>
        {donnees.filter((d) => d.historique !== undefined).length} semaines affichees
        {donnees[0] ? ' — de ' + donnees[0].date.slice(0, 7) + ' a ' + donnees[donnees.length - 1].date.slice(0, 7) : ''}
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={donnees} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={(v) => v.slice(0, 7)}
            interval={tickInterval as any}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<TooltipPersonnalise />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>
                {value === 'historique' ? 'Prix historique' : 'Prediction 4 sem.'}
              </span>
            )}
          />

          {/* Ligne de separation historique / prediction */}
          {donnees.length > 1 && (
            <ReferenceLine
              x={donnees[donnees.length - 2]?.date}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: "Aujourd'hui", fill: '#64748B', fontSize: 10 }}
            />
          )}

          <Line
            type="monotone"
            dataKey="historique"
            stroke="#3B82F6"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: '#3B82F6' }}
          />
          <Line
            type="monotone"
            dataKey="prediction"
            stroke="#F97316"
            strokeWidth={2.5}
            strokeDasharray="6 3"
            dot={{ fill: '#F97316', r: 5 }}
            activeDot={{ r: 6, fill: '#F97316' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PriceChart
