import { formatDOP } from '@/lib/utils'

export default function ResumenSecciones({ prestamos }) {
  const map = {}

  prestamos.forEach((p) => {
    const nombre = p.empleados?.secciones?.nombre || 'Sin sección'
    if (!map[nombre]) {
      map[nombre] = { nombre, activos: 0, capital: 0, totalCapital: 0 }
    }
    map[nombre].totalCapital += Number(p.monto_original)
    if (p.estado === 'activo') {
      map[nombre].activos += 1
      map[nombre].capital += Number(p.monto_original)
    }
  })

  const secciones = Object.values(map).sort((a, b) => b.totalCapital - a.totalCapital)
  const maxCapital = Math.max(...secciones.map((s) => s.totalCapital), 1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">Resumen por Sección</h3>
        <p className="text-xs text-gray-400 mt-0.5">Capital y actividad por área</p>
      </div>

      <div className="space-y-5">
        {secciones.map((sec) => {
          const pct = Math.round((sec.totalCapital / maxCapital) * 100)
          return (
            <div key={sec.nombre}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{sec.nombre}</span>
                  <span className="text-xs bg-green-50 text-green-700 font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {sec.activos} activo{sec.activos !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-600 flex-shrink-0 ml-2">
                  {formatDOP(sec.capital)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
