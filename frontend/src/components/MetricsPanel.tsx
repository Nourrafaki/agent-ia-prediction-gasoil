// MetricsPanel.tsx — Tableau des metriques de performance des modeles
import React, { useEffect, useState } from 'react'
import { fetchMetriques } from '../api/client'
import type { MetriquesResponse, MetriqueModele } from '../api/client'
import Spinner from './Spinner'
import ErrorCard from './ErrorCard'

// Couleur semantique pour le R2 (plus c'est haut, mieux c'est)
function couleurR2(r2: number): string {
  if (r2 >= 0.7) return '#10B981'  // vert — bon
  if (r2 >= 0.5) return '#F59E0B'  // orange — moyen
  return '#EF4444'                  // rouge — faible
}

// Couleur semantique pour le RMSE (plus c'est bas, mieux c'est)
function couleurRMSE(rmse: number): string {
  if (rmse <= 4) return '#10B981'
  if (rmse <= 6) return '#F59E0B'
  return '#EF4444'
}

const MetricsPanel: React.FC = () => {
  const [data, setData]             = useState<MetriquesResponse | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState<string | null>(null)

  const charger = async () => {
    setChargement(true)
    setErreur(null)
    try {
      const res = await fetchMetriques()
      setData(res)
    } catch (e: any) {
      setErreur(e?.response?.data?.detail ?? 'Impossible de charger les metriques.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  if (chargement) return <Spinner message="Chargement des metriques..." />
  if (erreur || !data) return <ErrorCard message={erreur ?? 'Donnees indisponibles'} onRetry={charger} />

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
        Performances des modeles
      </h2>

      {/* Tableau des modeles */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Modele', 'RMSE', 'MAE', 'R²'].map((col) => (
                <th
                  key={col}
                  style={{
                    color: '#64748B',
                    fontSize: '12px',
                    fontWeight: 500,
                    textAlign: col === 'Modele' ? 'left' : 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid #334155',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((m: MetriqueModele) => (
              <tr
                key={m.modele}
                style={{
                  background: m.meilleur ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  borderLeft: m.meilleur ? '3px solid #3B82F6' : '3px solid transparent',
                }}
              >
                {/* Nom du modele */}
                <td
                  style={{
                    color: m.meilleur ? '#93C5FD' : '#CBD5E1',
                    fontSize: '14px',
                    padding: '10px 12px',
                    borderBottom: '1px solid #1E2D3D',
                    fontWeight: m.meilleur ? 600 : 400,
                  }}
                >
                  {m.modele}
                  {m.meilleur && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        background: '#1D4ED8',
                        color: '#BFDBFE',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      BEST
                    </span>
                  )}
                </td>

                {/* RMSE */}
                <td
                  style={{
                    color: couleurRMSE(m.RMSE),
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '10px 12px',
                    borderBottom: '1px solid #1E2D3D',
                  }}
                >
                  {m.RMSE.toFixed(4)}
                </td>

                {/* MAE */}
                <td
                  style={{
                    color: '#94A3B8',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '10px 12px',
                    borderBottom: '1px solid #1E2D3D',
                  }}
                >
                  {m.MAE.toFixed(4)}
                </td>

                {/* R2 */}
                <td
                  style={{
                    color: couleurR2(m.R2),
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '10px 12px',
                    borderBottom: '1px solid #1E2D3D',
                  }}
                >
                  {m.R2.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legende des couleurs */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { couleur: '#10B981', label: 'Bon' },
          { couleur: '#F59E0B', label: 'Moyen' },
          { couleur: '#EF4444', label: 'Faible' },
        ].map(({ couleur, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: couleur }} />
            <span style={{ color: '#64748B', fontSize: '11px' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MetricsPanel
