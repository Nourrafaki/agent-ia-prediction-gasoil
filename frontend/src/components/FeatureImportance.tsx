// FeatureImportance.tsx — Barres horizontales des 5 variables les plus importantes
import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { fetchFeatures } from '../api/client'
import type { FeaturesResponse, FeatureItem } from '../api/client'
import Spinner from './Spinner'
import ErrorCard from './ErrorCard'

// Palette de couleurs degradees pour les barres
const COULEURS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#C084FC']

// Tooltip personnalise
const TooltipFeature = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item: FeatureItem = payload[0].payload
  return (
    <div
      style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 14px',
      }}
    >
      <p style={{ color: '#93C5FD', fontSize: '13px', fontWeight: 600 }}>{item.feature}</p>
      <p style={{ color: '#94A3B8', fontSize: '12px' }}>
        Importance : <span style={{ color: '#F1F5F9' }}>{(item.importance_norm * 100).toFixed(1)}%</span>
      </p>
    </div>
  )
}

const FeatureImportance: React.FC = () => {
  const [data, setData]             = useState<FeatureItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState<string | null>(null)

  const charger = async () => {
    setChargement(true)
    setErreur(null)
    try {
      const res: FeaturesResponse = await fetchFeatures()
      // Trier par importance decroissante
      const trie = [...res.data].sort((a, b) => b.importance_norm - a.importance_norm)
      setData(trie)
    } catch (e: any) {
      setErreur(e?.response?.data?.detail ?? 'Impossible de charger les features.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  if (chargement) return <Spinner message="Chargement des features..." />
  if (erreur || !data.length) return <ErrorCard message={erreur ?? 'Donnees indisponibles'} onRetry={charger} />

  return (
    <div
      style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
        Variables les plus importantes
      </h2>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: '#64748B', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="feature"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            width={80}
          />
          <Tooltip content={<TooltipFeature />} />
          <Bar dataKey="importance_norm" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COULEURS[index % COULEURS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default FeatureImportance
