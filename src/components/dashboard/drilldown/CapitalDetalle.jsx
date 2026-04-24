import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDOP } from '@/lib/utils'

const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']

function StatMini({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900">{d.name}</p>
      <p className="text-gray-500">{formatDOP(d.value)}</p>
    </div>
  )
}

export default function CapitalDetalle({ stats }) {
  const activos = stats.prestamos.filter(p => p.estado === 'activo')

  const capitalTotal = activos.reduce((s, p) => s + Number(p.monto_original), 0)
  const capitalPromedio = activos.length ? capitalTotal / activos.length : 0
  const tasaPromedio = activos.length
    ? activos.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activos.length
    : 0

  // Capital por sección
  const seccMap = {}
  activos.forEach(p => {
    const sec = p.empleados?.secciones?.nombre || 'Sin sección'
    seccMap[sec] = (seccMap[sec] || 0) + Number(p.monto_original)
  })
  const pieData = Object.entries(seccMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Top 5 préstamos
  const top5 = [...activos]
    .sort((a, b) => Number(b.monto_original) - Number(a.monto_original))
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatMini label="Capital activo" value={formatDOP(capitalTotal)} />
        <StatMini label="Promedio por préstamo" value={formatDOP(capitalPromedio)} />
        <StatMini label="Tasa promedio" value={`${(tasaPromedio * 100).toFixed(1)}%`} sub="mensual" />
      </div>

      {/* Donut por sección */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Distribución por sección</h4>
        <div className="flex items-center gap-4">
          <div className="w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600 truncate">{d.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 flex-shrink-0">
                  {((d.value / capitalTotal) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 préstamos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Top préstamos por monto</h4>
        <div className="space-y-2">
          {top5.map((p, i) => {
            const emp = p.empleados || {}
            const pct = (Number(p.monto_original) / top5[0].monto_original) * 100
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {emp.nombre} {emp.apellido}
                    </span>
                    <span className="text-xs font-bold text-gray-900 flex-shrink-0 ml-2">
                      {formatDOP(p.monto_original)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
