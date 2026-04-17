// Spinner.tsx — Indicateur de chargement anime
import React from 'react'

interface SpinnerProps {
  message?: string
}

const Spinner: React.FC<SpinnerProps> = ({ message = 'Chargement...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      {/* Cercle anime */}
      <div
        className="w-10 h-10 rounded-full border-4 border-slate-600 border-t-blue-500 animate-spin"
      />
      <span className="text-slate-400 text-sm">{message}</span>
    </div>
  )
}

export default Spinner
