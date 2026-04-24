import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDOP } from '@/lib/utils'

const ESTADO_COLOR = {
  activo:     '#16a34a',
  completado: '#3b82f6',
  cancelado:  '#f87171',
}

const ESTADO_BG = {
  activo:     'bg-green-50 text-green-700',
  completado: 'bg-blue-50 text-blue-700',
  cancelado:  'bg-red-50 text-red-600',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
      <p className="text-gray-500">{payload[0].value} préstamos</p>
    </div>
  )
}

export default function PrestamosDetalle({ stats }) {
  const { prestamos } = stats

  const countByEstado = prestamos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(countByEstado).map(([name, value]) => ({ name, value }))

  const activos = prestamos.filter(p => p.estado === 'activo')
  const montoPromedio = activos.length
    ? activos.reduce((s, p) => s + Number(p.monto_original), 0) / activos.length
    : 0
  const tasaPromedio = activos.length
    ? activos.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activos.length
    : 0

  // Por sección
  const secMap = {}
  activos.forEach(p => {
    const sec = p.empleados?.secciones?.nombre || 'Sin sección'
    if (!secMap[sec]) secMap[sec] = { nombre: sec, count: 0, capital: 0 }
    secMap[sec].count++
    secMap[sec].capital += Number(p.monto_original)
  })
  const secciones = Object.values(secMap).sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...secciones.map(s => s.count), 1)

  return (
    <div className="p-6 space-y-6">
      {/* Conteos por estado */}
      <div className="grid grid-cols-3 gap-3">
        {['activo', 'completado', 'cancelado'].map(estado => (
          <div key={estado} className={`rounded-2xl p-4 ${ESTADO_BG[estado].split(' ')[0]}`}>
            <p className={`text-xs font-medium capitalize ${ESTADO_BG[estado].split(' ')[1]}`}>{estado}</p>
            <p className={`text-2xl font-bold mt-1 ${ESTADO_BG[estado].split(' ')[1]}`}>
              {countByEstado[estado] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Donut */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Distribución por estado</h4>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={58}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={ESTADO_COLOR[d.name] || '#9ca3af'} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ESTADO_COLOR[d.name] || '#9ca3af' }} />
                  <span className="text-xs capitalize text-gray-600">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas de activos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium">Monto promedio</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatDOP(montoPromedio)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium">Tasa promedio</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{(tasaPromedio * 100).toFixed(1)}% <span className="text-xs font-normal text-gray-400">mensual</span></p>
        </div>
      </div>

      {/* Por sección */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Préstamos activos por sección</h4>
        <div className="space-y-3">
          {secciones.map(sec => (
            <div key={sec.nombre}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{sec.nombre}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDOP(sec.capital)}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    {sec.count}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(sec.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
