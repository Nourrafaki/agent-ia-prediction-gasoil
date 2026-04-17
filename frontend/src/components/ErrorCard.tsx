// ErrorCard.tsx — Carte d'affichage des erreurs API
import React from 'react'

interface ErrorCardProps {
  message: string
  onRetry?: () => void
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center gap-3 py-8 px-4">
      {/* Icone d'erreur */}
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-2xl">
        !
      </div>
      <p className="text-red-400 text-sm text-center max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Reessayer
        </button>
      )}
    </div>
  )
}

export default ErrorCard
