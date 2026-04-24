import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { formatDOP } from '@/lib/utils'
import { TrendingUp, Users, CreditCard, AlertTriangle } from 'lucide-react'

const ESTADO_COLOR = {
  pagada:    '#16a34a',
  pendiente: '#d1d5db',
  parcial:   '#f59e0b',
  vencida:   '#ef4444',
}

const TASA_COLOR = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4']

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold capitalize text-gray-800">{payload[0].payload.name}</p>
      <p className="text-gray-400">{payload[0].value} cuotas</p>
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">{formatDOP(payload[0].value)}</p>
    </div>
  )
}

function hashColor(str) {
  const palette = ['bg-violet-100 text-violet-700','bg-blue-100 text-blue-700','bg-rose-100 text-rose-700','bg-amber-100 text-amber-700','bg-teal-100 text-teal-700','bg-indigo-100 text-indigo-700']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

export default function SeccionDetalle({ stats, nombre }) {
  const { prestamos, cuotas } = stats

  const secPrestamos = prestamos.filter(
    p => (p.empleados?.secciones?.nombre || 'Sin sección') === nombre
  )
  const activos = secPrestamos.filter(p => p.estado === 'activo')
  const prestamosIds = new Set(secPrestamos.map(p => p.id))
  const secCuotas = cuotas.filter(c => prestamosIds.has(c.prestamo_id))

  const capitalTotal = activos.reduce((s, p) => s + Number(p.monto_original), 0)
  const capitalPromedio = activos.length ? capitalTotal / activos.length : 0
  const tasaPromedio = activos.length
    ? activos.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activos.length
    : 0
  const empleadosUnicos = new Set(activos.map(p => p.empleado_id)).size

  // Cuotas por estado → donut
  const cuotasByEstado = secCuotas.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] || 0) + 1
    return acc
  }, {})
  const donutData = Object.entries(cuotasByEstado).map(([name, value]) => ({ name, value }))

  // Cuotas vencidas / total → tasa morosidad
  const totalCuotasPasadas = secCuotas.filter(c => c.estado !== 'pendiente').length
  const totalVencidas = cuotasByEstado['vencida'] || 0
  const morosidad = totalCuotasPasadas > 0 ? (totalVencidas / totalCuotasPasadas) * 100 : 0

  // Capital cobrado (cuotas pagadas)
  const capitalCobrado = secCuotas
    .filter(c => c.estado === 'pagada')
    .reduce((s, c) => s + Number(c.monto_esperado), 0)

  // Préstamos por tasa → bar chart
  const tasaMap = {}
  activos.forEach(p => {
    const key = `${(p.tasa_mensual * 100).toFixed(0)}%`
    tasaMap[key] = (tasaMap[key] || 0) + Number(p.monto_original)
  })
  const tasaData = Object.entries(tasaMap).map(([tasa, capital]) => ({ tasa, capital }))

  return (
    <div className="p-6 space-y-6">
      {/* Header sección */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ backgroundColor: '#14532d' }}
      >
        <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-1">Sección</p>
        <h3 className="text-2xl font-bold">{nombre}</h3>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-green-200">{activos.length} préstamos activos</span>
          <span className="text-green-300">·</span>
          <span className="text-green-200">{empleadosUnicos} empleados</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <CreditCard size={16} className="text-green-700" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Capital activo</p>
            <p className="text-sm font-bold text-gray-900">{formatDOP(capitalTotal)}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Capital cobrado</p>
            <p className="text-sm font-bold text-gray-900">{formatDOP(capitalCobrado)}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Monto promedio</p>
            <p className="text-sm font-bold text-gray-900">{formatDOP(capitalPromedio)}</p>
          </div>
        </div>
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${morosidad > 20 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${morosidad > 20 ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle size={16} className={morosidad > 20 ? 'text-red-600' : 'text-amber-600'} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Morosidad</p>
            <p className={`text-sm font-bold ${morosidad > 20 ? 'text-red-700' : 'text-gray-900'}`}>
              {morosidad.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tasa promedio pill */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-3.5">
        <span className="text-sm text-gray-600">Tasa promedio mensual</span>
        <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
          {(tasaPromedio * 100).toFixed(1)}%
        </span>
      </div>

      {/* Donut estado cuotas */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Estado de cuotas ({secCuotas.length} total)</h4>
        <div className="flex items-center gap-5">
          <div className="w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={34} outerRadius={58} paddingAngle={3} dataKey="value">
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={ESTADO_COLOR[d.name] || '#9ca3af'} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2.5">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ESTADO_COLOR[d.name] || '#9ca3af' }} />
                  <span className="text-xs capitalize text-gray-600">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {((d.value / secCuotas.length) * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs font-bold text-gray-800 w-6 text-right">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capital por tasa */}
      {tasaData.length > 1 && (
        <div className="bg-gray-50 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Capital por tasa de interés</h4>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={tasaData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="tasa" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<BarTip />} cursor={{ fill: '#f0fdf4', radius: 6 }} />
              <Bar dataKey="capital" radius={[8, 8, 8, 8]} maxBarSize={36}>
                {tasaData.map((_, i) => <Cell key={i} fill={TASA_COLOR[i % TASA_COLOR.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista de préstamos activos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Préstamos activos en esta sección</h4>
        {activos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin préstamos activos</p>
        ) : (
          <div className="space-y-2">
            {activos.map(p => {
              const emp = p.empleados || {}
              const nombre = `${emp.nombre || ''} ${emp.apellido || ''}`.trim()
              const avatarClases = hashColor(nombre)
              const initials = `${emp.nombre?.[0] || ''}${emp.apellido?.[0] || ''}`.toUpperCase()
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClases}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{nombre}</p>
                    <p className="text-xs text-gray-400">
                      {(p.tasa_mensual * 100).toFixed(0)}% · {formatDOP(p.cuota_quincenal)}/qna
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                    {formatDOP(p.monto_original)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
