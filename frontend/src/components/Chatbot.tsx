// Chatbot.tsx — Conseiller IA achat gasoil, bulle flottante
import React, { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Recommandation = 'ACHETER MAINTENANT' | 'ATTENDRE' | 'NEUTRE' | null

interface Message {
  role: 'user' | 'assistant'
  contenu: string
  recommandation?: Recommandation
}

interface ContexteMarche {
  prix_actuel: number | string
  prix_predit: number | string
  variation:   number
}

// La couleur vient directement du backend — pas besoin de regex
const COULEUR_BADGE: Record<string, string> = {
  'ACHETER MAINTENANT': '#10B981',
  'ATTENDRE':           '#EF4444',
  'NEUTRE':             '#F59E0B',
}

const QUESTIONS_RAPIDES = [
  'Dois-je acheter maintenant ?',
  'Quelle est la tendance ?',
  'Quel risque si j\'attends ?',
]

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------
const BulleMessage: React.FC<{ msg: Message }> = ({ msg }) => {
  const estUser = msg.role === 'user'
  return (
    <div
      style={{
        display:       'flex',
        justifyContent: estUser ? 'flex-end' : 'flex-start',
        marginBottom:  '12px',
      }}
    >
      <div style={{ maxWidth: '80%' }}>
        {/* Badge recommandation */}
        {msg.recommandation && (
          <div
            style={{
              display:      'inline-block',
              background:   COULEUR_BADGE[msg.recommandation],
              color:        '#fff',
              fontSize:     '10px',
              fontWeight:   700,
              padding:      '2px 8px',
              borderRadius: '999px',
              marginBottom: '4px',
              letterSpacing: '0.5px',
            }}
          >
            {msg.recommandation}
          </div>
        )}
        {/* Bulle */}
        <div
          style={{
            background:   estUser ? '#1D4ED8' : '#1E293B',
            color:        '#F1F5F9',
            borderRadius: estUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding:      '10px 14px',
            fontSize:     '13px',
            lineHeight:   1.5,
            border:       estUser ? 'none' : '1px solid #334155',
            whiteSpace:   'pre-wrap',
          }}
        >
          {msg.contenu}
        </div>
      </div>
    </div>
  )
}

const AnimationFrappe: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
    <div
      style={{
        background:   '#1E293B',
        border:       '1px solid #334155',
        borderRadius: '12px 12px 12px 2px',
        padding:      '12px 16px',
        display:      'flex',
        gap:          '5px',
        alignItems:   'center',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width:            '7px',
            height:           '7px',
            borderRadius:     '50%',
            background:       '#64748B',
            animation:        `frappe 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
const Chatbot: React.FC = () => {
  const [ouvert, setOuvert]           = useState(false)
  const [messages, setMessages]       = useState<Message[]>([])
  const [saisie, setSaisie]           = useState('')
  const [chargement, setChargement]   = useState(false)
  const [contexte, setContexte]       = useState<ContexteMarche | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [initialise, setInitialise]   = useState(false)
  const basRef                        = useRef<HTMLDivElement>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)

  // Scroll automatique vers le bas
  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chargement])

  // Focus sur l'input a l'ouverture
  useEffect(() => {
    if (ouvert && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100)
  }, [ouvert])

  // Message de bienvenue au premier chargement
  useEffect(() => {
    if (ouvert && !initialise) {
      setInitialise(true)
      chargerContexteEtBienvenue()
    }
  }, [ouvert])

  const chargerContexteEtBienvenue = async () => {
    setChargement(true)
    try {
      const [prixRes, predRes] = await Promise.allSettled([
        apiClient.get('/api/prix_actuel'),
        apiClient.get('/api/prediction'),
      ])

      const prix = prixRes.status === 'fulfilled' ? prixRes.value.data.prix       : 'N/A'
      const pred = predRes.status === 'fulfilled' ? predRes.value.data.prediction  : 'N/A'
      const vari = predRes.status === 'fulfilled' ? predRes.value.data.variation_pct : 0

      setContexte({ prix_actuel: prix, prix_predit: pred, variation: vari })

      const bienvenue: Message = {
        role:    'assistant',
        contenu: `Bonjour ! Je suis votre conseiller achat gasoil.\nPrix actuel : $${prix} | Prediction 4 sem. : $${pred}\nQue puis-je faire pour vous ?`,
        recommandation: null,
      }
      setMessages([bienvenue])
    } catch {
      setMessages([{
        role:           'assistant',
        contenu:        'Bonjour ! Je suis votre conseiller achat gasoil. Posez-moi vos questions.',
        recommandation: null,
      }])
    } finally {
      setChargement(false)
    }
  }

  const envoyerMessage = async (texte: string) => {
    const texteNettoye = texte.trim()
    if (!texteNettoye || chargement) return

    const msgUser: Message = { role: 'user', contenu: texteNettoye }
    setMessages((prev) => [...prev, msgUser])
    setSaisie('')
    setChargement(true)

    try {
      const res = await apiClient.post('/api/chat', { message: texteNettoye })
      const reponse: string         = res.data.reponse
      const reco:    Recommandation = res.data.recommandation ?? null

      // Mettre a jour le contexte avec les donnees fraiches du backend
      setContexte({
        prix_actuel: res.data.prix_actuel,
        prix_predit: res.data.prix_predit,
        variation:   res.data.variation,
      })

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', contenu: reponse, recommandation: reco },
      ])
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? 'Erreur de connexion au conseiller.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', contenu: detail, recommandation: null },
      ])
    } finally {
      setChargement(false)
    }
  }

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyerMessage(saisie)
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Keyframes pour l'animation des points */}
      <style>{`
        @keyframes frappe {
          0%, 60%, 100% { transform: translateY(0);  opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1;   }
        }
        @keyframes popIn {
          from { transform: scale(0.85) translateY(12px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Fenetre de chat                                                      */}
      {/* ------------------------------------------------------------------ */}
      {ouvert && (
        <div
          style={{
            position:     'fixed',
            bottom:       '88px',
            right:        '24px',
            width:        '400px',
            height:       '500px',
            background:   '#0F172A',
            border:       '1px solid #334155',
            borderRadius: '16px',
            boxShadow:    '0 24px 60px rgba(0,0,0,0.6)',
            display:      'flex',
            flexDirection: 'column',
            zIndex:       1000,
            animation:    'popIn 0.2s ease-out',
            overflow:     'hidden',
          }}
        >
          {/* En-tete */}
          <div
            style={{
              background:    'linear-gradient(135deg, #1D4ED8, #4F46E5)',
              padding:       '14px 16px',
              display:       'flex',
              alignItems:    'center',
              justifyContent: 'space-between',
              flexShrink:    0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px' }}>&#x1F916;</div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>
                  Conseiller Achat Gasoil
                </p>
                <p style={{ color: '#BFDBFE', fontSize: '11px', margin: 0 }}>
                  {contexte
                    ? `Actuel $${contexte.prix_actuel} — Predit $${contexte.prix_predit} (${contexte.variation > 0 ? '+' : ''}${contexte.variation}%)`
                    : 'Chargement du marche...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOuvert(false)}
              style={{
                background: 'transparent',
                border:     'none',
                color:      '#BFDBFE',
                fontSize:   '18px',
                cursor:     'pointer',
                lineHeight: 1,
                padding:    '2px 6px',
              }}
              aria-label="Fermer"
            >
              &times;
            </button>
          </div>

          {/* Zone de messages */}
          <div
            style={{
              flex:       1,
              overflowY:  'auto',
              padding:    '16px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#334155 transparent',
            }}
          >
            {messages.map((msg, i) => <BulleMessage key={i} msg={msg} />)}
            {chargement && <AnimationFrappe />}
            <div ref={basRef} />
          </div>

          {/* Questions rapides */}
          <div
            style={{
              padding:    '8px 12px',
              display:    'flex',
              gap:        '6px',
              flexWrap:   'wrap',
              borderTop:  '1px solid #1E293B',
              flexShrink: 0,
            }}
          >
            {QUESTIONS_RAPIDES.map((q) => (
              <button
                key={q}
                onClick={() => envoyerMessage(q)}
                disabled={chargement}
                style={{
                  background:   '#1E293B',
                  border:       '1px solid #334155',
                  borderRadius: '999px',
                  color:        '#94A3B8',
                  fontSize:     '11px',
                  padding:      '4px 10px',
                  cursor:       chargement ? 'not-allowed' : 'pointer',
                  whiteSpace:   'nowrap',
                  opacity:      chargement ? 0.5 : 1,
                  transition:   'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!chargement) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#2D3F55'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#F1F5F9'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#1E293B'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Champ de saisie */}
          <form
            onSubmit={soumettre}
            style={{
              display:    'flex',
              gap:        '8px',
              padding:    '10px 12px',
              borderTop:  '1px solid #1E293B',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Posez votre question..."
              disabled={chargement}
              style={{
                flex:         1,
                background:   '#1E293B',
                border:       '1px solid #334155',
                borderRadius: '8px',
                color:        '#F1F5F9',
                fontSize:     '13px',
                padding:      '8px 12px',
                outline:      'none',
              }}
            />
            <button
              type="submit"
              disabled={chargement || !saisie.trim()}
              style={{
                background:   saisie.trim() && !chargement ? '#1D4ED8' : '#1E293B',
                border:       '1px solid #334155',
                borderRadius: '8px',
                color:        saisie.trim() && !chargement ? '#fff' : '#475569',
                padding:      '8px 14px',
                cursor:       saisie.trim() && !chargement ? 'pointer' : 'not-allowed',
                fontSize:     '13px',
                fontWeight:   600,
                transition:   'all 0.15s',
              }}
            >
              Envoyer
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Bulle flottante (bouton d'ouverture)                                */}
      {/* ------------------------------------------------------------------ */}
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label="Ouvrir le conseiller achat"
        style={{
          position:     'fixed',
          bottom:       '24px',
          right:        '24px',
          width:        '56px',
          height:       '56px',
          borderRadius: '50%',
          background:   ouvert
            ? 'linear-gradient(135deg, #4F46E5, #1D4ED8)'
            : 'linear-gradient(135deg, #1D4ED8, #4F46E5)',
          border:       'none',
          boxShadow:    '0 8px 24px rgba(29,78,216,0.5)',
          cursor:       'pointer',
          fontSize:     '24px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          zIndex:       1001,
          transition:   'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(29,78,216,0.7)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(29,78,216,0.5)'
        }}
      >
        {ouvert ? '\u2715' : '\u{1F916}'}
      </button>
    </>
  )
}

export default Chatbot
