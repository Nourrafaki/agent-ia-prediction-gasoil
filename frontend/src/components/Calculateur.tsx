// Calculateur.tsx — Calculateur d'economies sur l'achat de gasoil
import React, { useState } from 'react'
import type { PredictionResponse } from '../api/client'

interface Props {
  prediction: PredictionResponse | null
}

const TAUX_MAD        = 10    // 1 USD = 10 MAD
const LITRES_PAR_BARIL = 159  // 1 baril = 159 litres

const Calculateur: React.FC<Props> = ({ prediction }) => {
  const [litres, setLitres] = useState<string>('5000')

  if (!prediction) return null

  const litresNum   = Math.max(0, parseFloat(litres) || 0)
  const barils      = litresNum / LITRES_PAR_BARIL
  const prixActuel  = prediction.prix_actuel
  const prixPredit  = prediction.prediction
  const variation   = prediction.variation_pct

  // Couts en MAD
  const coutMaintenant = Math.round(barils * prixActuel * TAUX_MAD)
  const coutDans4Sem   = Math.round(barils * prixPredit * TAUX_MAD)
  const diff           = coutMaintenant - coutDans4Sem  // positif = economie si on achete maintenant

  // Recommandation selon la difference
  const economie        = Math.abs(diff)
  const acheteMaintenant = diff > 0  // acheter maintenant est moins cher
  const neutre           = Math.abs(variation) <= 3

  let couleurReco = '#F59E0B'
  let texteReco   = 'Marche stable — achetez selon vos besoins'
  let badgeLabel  = 'NEUTRE'

  if (!neutre && acheteMaintenant) {
    couleurReco = '#10B981'
    texteReco   = 'Achetez maintenant pour economiser ' + economie.toLocaleString('fr-FR') + ' MAD'
    badgeLabel  = 'ACHETER MAINTENANT'
  } else if (!neutre && !acheteMaintenant) {
    couleurReco = '#EF4444'
    texteReco   = 'Attendez 4 semaines pour economiser ' + economie.toLocaleString('fr-FR') + ' MAD'
    badgeLabel  = 'ATTENDRE'
  }

  return (
    <div
      style={{
        background:   '#1E293B',
        border:       '1px solid #334155',
        borderRadius: '12px',
        padding:      '20px',
      }}
    >
      <h2 style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
        Calculateur d'economies
      </h2>
      <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 16px' }}>
        Estimez votre strategie d'achat optimale en dirhams marocains
      </p>

      {/* Champ de saisie */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
          Consommation hebdomadaire (litres)
        </label>
        <input
          type="number"
          min="0"
          step="100"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          style={{
            background:   '#0F172A',
            border:       '1px solid #334155',
            borderRadius: '8px',
            color:        '#F1F5F9',
            fontSize:     '16px',
            fontWeight:   600,
            padding:      '10px 14px',
            width:        '100%',
            boxSizing:    'border-box',
            outline:      'none',
          }}
          placeholder="Ex : 5000"
        />
      </div>

      {/* Resultats */}
      {litresNum > 0 && (
        <>
          {/* Comparaison des couts */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:                 '12px',
              marginBottom:        '14px',
            }}
          >
            {/* Cout maintenant */}
            <div
              style={{
                background:   '#0F172A',
                border:       '1px solid #334155',
                borderRadius: '8px',
                padding:      '12px',
                textAlign:    'center',
              }}
            >
              <p style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase',
                          letterSpacing: '0.8px', margin: '0 0 6px' }}>
                Achat maintenant
              </p>
              <p style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 700, margin: '0 0 2px' }}>
                {coutMaintenant.toLocaleString('fr-FR')}
              </p>
              <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>
                MAD <span style={{ color: '#475569' }}>({litresNum.toLocaleString()} L)</span>
              </p>
            </div>

            {/* Cout dans 4 semaines */}
            <div
              style={{
                background:   '#0F172A',
                border:       '1px solid #334155',
                borderRadius: '8px',
                padding:      '12px',
                textAlign:    'center',
              }}
            >
              <p style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase',
                          letterSpacing: '0.8px', margin: '0 0 6px' }}>
                Achat dans 4 sem.
              </p>
              <p style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 700, margin: '0 0 2px' }}>
                {coutDans4Sem.toLocaleString('fr-FR')}
              </p>
              <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>
                MAD <span style={{ color: '#475569' }}>({litresNum.toLocaleString()} L)</span>
              </p>
            </div>
          </div>

          {/* Difference + recommandation */}
          <div
            style={{
              background:   '#0F172A',
              border:       '1px solid ' + couleurReco + '40',
              borderLeft:   '4px solid ' + couleurReco,
              borderRadius: '8px',
              padding:      '12px 14px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              gap:          '10px',
            }}
          >
            <div>
              <span
                style={{
                  background:   couleurReco,
                  color:        '#fff',
                  fontSize:     '9px',
                  fontWeight:   700,
                  padding:      '2px 7px',
                  borderRadius: '999px',
                  letterSpacing: '0.5px',
                  display:      'inline-block',
                  marginBottom: '4px',
                }}
              >
                {badgeLabel}
              </span>
              <p style={{ color: '#CBD5E1', fontSize: '12px', margin: 0 }}>{texteReco}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: couleurReco, fontSize: '22px', fontWeight: 800, margin: 0 }}>
                {diff >= 0 ? '-' : '+'}{economie.toLocaleString('fr-FR')}
              </p>
              <p style={{ color: '#64748B', fontSize: '10px', margin: 0 }}>MAD</p>
            </div>
          </div>

          {/* Note taux conversion */}
          <p style={{ color: '#334155', fontSize: '10px', marginTop: '8px', textAlign: 'right' }}>
            Taux utilise : 1 USD = {TAUX_MAD} MAD — 1 baril = {LITRES_PAR_BARIL} L
          </p>
        </>
      )}
    </div>
  )
}

export default Calculateur
