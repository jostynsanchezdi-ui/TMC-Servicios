import { useState } from 'react'
import { formatDOP, formatFecha } from '@/lib/utils'

const LIMIT_OPTIONS = [6, 10, 15, 20]

function hashColor(str) {
  const palette = [
    ['bg-violet-100', 'text-violet-700'],
    ['bg-blue-100', 'text-blue-700'],
    ['bg-rose-100', 'text-rose-700'],
    ['bg-amber-100', 'text-amber-700'],
    ['bg-teal-100', 'text-teal-700'],
    ['bg-indigo-100', 'text-indigo-700'],
    ['bg-pink-100', 'text-pink-700'],
    ['bg-cyan-100', 'text-cyan-700'],
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

function initials(nombre, apellido) {
  return `${(nombre?.[0] || '').toUpperCase()}${(apellido?.[0] || '').toUpperCase()}`
}

const ESTADO_STYLES = {
  activo: 'bg-green-50 text-green-700',
  completado: 'bg-gray-100 text-gray-500',
  cancelado: 'bg-red-50 text-red-600',
}

const ESTADO_LABELS = {
  activo: 'Activo',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

export default function PrestamosRecientes({ prestamos }) {
  const [limit, setLimit] = useState(6)

  const recientes = [...prestamos]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Préstamos Recientes</h3>
          <p className="text-xs text-gray-400 mt-0.5">Últimos {limit} registros</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {LIMIT_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                limit === n ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {recientes.map((prestamo) => {
          const emp = prestamo.empleados || {}
          const nombre = emp.nombre || ''
          const apellido = emp.apellido || ''
          const seccion = emp.secciones?.nombre || 'Sin sección'
          const ini = initials(nombre, apellido)
          const [bgClass, textClass] = hashColor(`${nombre}${apellido}`)
          const estadoStyle = ESTADO_STYLES[prestamo.estado] || 'bg-gray-100 text-gray-500'
          const estadoLabel = ESTADO_LABELS[prestamo.estado] || prestamo.estado

          return (
            <div key={prestamo.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${bgClass} ${textClass}`}
              >
                {ini}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {nombre} {apellido}
                </p>
                <p className="text-xs text-gray-400 truncate">{seccion}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatFecha(prestamo.fecha_inicio)} · {(Number(prestamo.tasa_mensual) * 100).toFixed(1)}% mens.
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatDOP(prestamo.monto_original)}
                </p>
                <span
                  className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${estadoStyle}`}
                >
                  {estadoLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
