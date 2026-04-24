import { calcularScore, tasaSugeridaPorScore } from '@/lib/calculos'
import { Star } from 'lucide-react'

export default function ScoreConfiabilidad({ cuotas }) {
  const score = calcularScore(cuotas)
  if (score === null) return <span className="text-sm text-gray-400">Sin historial</span>

  const rango = tasaSugeridaPorScore(score)
  const labels = { 3: 'Excelente pagador', 2: 'Algunos retrasos', 1: 'Varios retrasos' }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            size={16}
            className={i <= score ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">{labels[score]}</span>
      <span className="text-xs text-gray-400">Tasa sugerida: {rango.min}%–{rango.max}%</span>
    </div>
  )
}
