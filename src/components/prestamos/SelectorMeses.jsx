import { useState } from 'react'
import { cn } from '@/lib/utils'

const OPCIONES_RAPIDAS = [3, 6, 9, 12, 18, 24]

export default function SelectorMeses({ value, onChange }) {
  const [custom, setCustom] = useState(!OPCIONES_RAPIDAS.includes(value))

  function handleRapida(m) {
    setCustom(false)
    onChange(m)
  }

  function handleCustom(e) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v) && v > 0) onChange(v)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {OPCIONES_RAPIDAS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleRapida(m)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              !custom && value === m
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
            )}
          >
            {m} {m === 1 ? 'mes' : 'meses'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
            custom
              ? 'bg-green-600 text-white border-green-600'
              : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
          )}
        >
          Personalizado
        </button>
      </div>

      {custom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            defaultValue={value}
            onChange={handleCustom}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Meses"
          />
          <span className="text-sm text-gray-500">meses ({value * 2} cuotas quincenales)</span>
        </div>
      )}

      {!custom && (
        <p className="text-xs text-gray-400">{value} meses = {value * 2} cuotas quincenales</p>
      )}
    </div>
  )
}
