import { useState } from 'react'
import { formatDOP } from '@/lib/utils'

const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']

export default function GraficaBarras({ prestamos, onBarClick }) {
  const [hovered, setHovered] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  const row = {}
  prestamos.forEach((p) => {
    const sec = p.empleados?.secciones?.nombre || 'Sin sección'
    row[sec] = (row[sec] || 0) + Number(p.monto_original)
  })

  const secciones = Object.entries(row).sort((a, b) => b[1] - a[1])
  const total = secciones.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Capital por Sección</h3>
          <p className="text-xs text-gray-400 mt-0.5">Click en un segmento para ver el detalle</p>
        </div>
        <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
          {formatDOP(total)}
        </span>
      </div>

      {/* Barra apilada */}
      <div className="relative flex h-11 rounded-xl overflow-hidden">
        {secciones.map(([sec, capital], i) => {
          const pct = (capital / total) * 100
          return (
            <div
              key={sec}
              style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
              className={`relative cursor-pointer transition-all duration-150 ${
                hovered && hovered !== sec ? 'brightness-75' : ''
              }`}
              onMouseEnter={(e) => {
                setHovered(sec)
                setTooltip({ sec, capital, pct, x: e.clientX })
              }}
              onMouseLeave={() => {
                setHovered(null)
                setTooltip(null)
              }}
              onClick={() => onBarClick?.(sec)}
            />
          )
        })}
      </div>

      {/* Tooltip flotante */}
      {tooltip && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-xs"
          style={{ left: tooltip.x, top: 'auto', marginTop: '-100px' }}
        >
          <p className="font-semibold text-gray-900">{tooltip.sec}</p>
          <p className="text-gray-500">{formatDOP(tooltip.capital)}</p>
          <p className="text-gray-400">{tooltip.pct.toFixed(1)}% del total</p>
        </div>
      )}

      {/* Labels debajo de cada segmento */}
      <div className="flex mt-3">
        {secciones.map(([sec, capital], i) => {
          const pct = (capital / total) * 100
          return (
            <button
              key={sec}
              style={{ width: `${pct}%` }}
              onClick={() => onBarClick?.(sec)}
              onMouseEnter={() => setHovered(sec)}
              onMouseLeave={() => setHovered(null)}
              className={`flex flex-col items-center px-0.5 transition-opacity ${
                hovered && hovered !== sec ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Conector */}
              <div
                className="w-px h-2 mb-1"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {pct >= 10 ? (
                <>
                  <span className="text-xs font-medium text-gray-700 truncate w-full text-center leading-tight">
                    {sec}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}%</span>
                </>
              ) : (
                <span
                  className="text-xs font-semibold"
                  style={{ color: COLORS[i % COLORS.length] }}
                >
                  {pct.toFixed(0)}%
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
