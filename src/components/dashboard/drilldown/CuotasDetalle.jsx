import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import { formatDOP, formatFecha } from '@/lib/utils'
import { AlertTriangle, Clock, Circle } from 'lucide-react'

const ESTADO_META = {
  pendiente: { color: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-600', icon: Circle },
  parcial:   { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  vencida:   { color: '#ef4444', bg: 'bg-red-50',   text: 'text-red-600',   icon: AlertTriangle },
  pagada:    { color: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', icon: Circle },
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900 capitalize">{payload[0].payload.name}</p>
      <p className="text-gray-500">{payload[0].value} cuotas</p>
    </div>
  )
}

export default function CuotasDetalle({ stats }) {
  const { cuotas } = stats
  const hoy = dayjs()

  const countByEstado = cuotas.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] || 0) + 1
    return acc
  }, {})

  const vencidas = cuotas.filter(c => c.estado === 'vencida')
  const parciales = cuotas.filter(c => c.estado === 'parcial')
  const pendientes = cuotas.filter(c => c.estado === 'pendiente')

  const montoVencido = vencidas.reduce((s, c) => s + Number(c.monto_esperado) - Number(c.monto_pagado || 0), 0)
  const montoParcial = parciales.reduce((s, c) => s + Number(c.monto_esperado) - Number(c.monto_pagado || 0), 0)
  const totalEnRiesgo = montoVencido + montoParcial

  // Próximas cuotas (pendientes, ordenadas por vencimiento)
  const proximas = [...pendientes]
    .filter(c => dayjs(c.fecha_vencimiento).isAfter(hoy.subtract(1, 'day')))
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
    .slice(0, 6)

  const pieData = ['pendiente', 'parcial', 'vencida', 'pagada']
    .filter(e => countByEstado[e])
    .map(e => ({ name: e, value: countByEstado[e] }))

  const diasParaVencer = c => dayjs(c.fecha_vencimiento).diff(hoy, 'day')

  return (
    <div className="p-6 space-y-6">
      {/* Stats en riesgo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-400 font-medium">Vencidas</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{vencidas.length}</p>
          <p className="text-xs text-red-400 mt-0.5">{formatDOP(montoVencido)}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-xs text-amber-500 font-medium">Parciales</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{parciales.length}</p>
          <p className="text-xs text-amber-400 mt-0.5">{formatDOP(montoParcial)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pendientes.length}</p>
        </div>
      </div>

      {/* Total en riesgo */}
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total en riesgo (vencido + parcial)</p>
            <p className="text-lg font-bold text-red-700">{formatDOP(totalEnRiesgo)}</p>
          </div>
        </div>
      </div>

      {/* Donut */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Estado de cuotas</h4>
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={52}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={ESTADO_META[d.name]?.color || '#9ca3af'} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2.5">
            {pieData.map(d => {
              const meta = ESTADO_META[d.name] || {}
              const pct = ((d.value / cuotas.length) * 100).toFixed(0)
              return (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs capitalize text-gray-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct}%</span>
                    <span className="text-xs font-bold text-gray-800 w-6 text-right">{d.value}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Próximas cuotas */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Próximas a vencer</h4>
        <div className="space-y-1">
          {proximas.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin cuotas próximas</p>
          )}
          {proximas.map(c => {
            const dias = diasParaVencer(c)
            const urgente = dias <= 3
            const nombre = c.prestamos?.empleados
              ? `${c.prestamos.empleados.nombre} ${c.prestamos.empleados.apellido}`
              : `Cuota #${c.numero_cuota}`
            return (
              <div key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${urgente ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgente ? 'bg-amber-400' : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{nombre}</p>
                  <p className="text-xs text-gray-400">
                    {formatFecha(c.fecha_vencimiento)} ·{' '}
                    <span className={urgente ? 'text-amber-600 font-medium' : ''}>
                      {dias === 0 ? 'Hoy' : `en ${dias} día${dias !== 1 ? 's' : ''}`}
                    </span>
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
                  {formatDOP(c.monto_esperado)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
