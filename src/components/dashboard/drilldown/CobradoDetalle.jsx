import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import dayjs from 'dayjs'
import { formatDOP, formatFechaHora } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2.5 text-xs space-y-1">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-bold text-gray-900">{formatDOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function splitPago(pago, prestamosMap) {
  const prestamo = prestamosMap[pago.prestamo_id]
  if (!prestamo) return { interes: Number(pago.monto), capital: 0 }

  const tasa = Number(prestamo.tasa_mensual)
  const meses = dayjs(prestamo.fecha_fin).diff(dayjs(prestamo.fecha_inicio), 'month') || 12
  const denom = tasa + 1 / meses
  const interesRatio = denom > 0 ? tasa / denom : 0.5
  const monto = Number(pago.monto)
  return {
    interes: monto * interesRatio,
    capital: monto * (1 - interesRatio),
  }
}

export default function CobradoDetalle({ stats }) {
  const { pagos, cuotas, prestamos } = stats

  const prestamosMap = Object.fromEntries((prestamos || []).map(p => [p.id, p]))

  const totalCobrado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const totalEsperado = cuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)
  const tasaRecuperacion = totalEsperado > 0 ? (totalCobrado / totalEsperado) * 100 : 0

  // Cobros por mes (últimos 8 meses) — split interest/capital
  const mesesMap = {}
  for (let i = 7; i >= 0; i--) {
    const key = dayjs().subtract(i, 'month').format('MMM YY')
    mesesMap[key] = { interes: 0, capital: 0 }
  }
  pagos.forEach(p => {
    const key = dayjs(p.fecha_pago).format('MMM YY')
    if (key in mesesMap) {
      const { interes, capital } = splitPago(p, prestamosMap)
      mesesMap[key].interes += interes
      mesesMap[key].capital += capital
    }
  })
  const barData = Object.entries(mesesMap).map(([mes, v]) => ({ mes, ...v }))

  const mesActual = dayjs().format('MMM YY')
  const cobradoEsteMes = (mesesMap[mesActual]?.interes || 0) + (mesesMap[mesActual]?.capital || 0)

  // Últimos 5 pagos
  const ultimos = [...pagos]
    .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago))
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-blue-400 font-medium">Total cobrado</p>
          <p className="text-lg font-bold text-blue-900 mt-1">{formatDOP(totalCobrado)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium">Este mes</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatDOP(cobradoEsteMes)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-500 font-medium">Recuperación</p>
          <p className="text-lg font-bold text-green-800 mt-1">{tasaRecuperacion.toFixed(1)}%</p>
        </div>
      </div>

      {/* Barra de recuperación global */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Capital recuperado vs esperado</span>
          <span className="text-xs font-bold text-green-700">{tasaRecuperacion.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(tasaRecuperacion, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{formatDOP(totalCobrado)} cobrado</span>
          <span>{formatDOP(totalEsperado)} esperado</span>
        </div>
      </div>

      {/* Barras dobles por mes */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Cobros por mes</h4>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">Interés</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0" />
            <span className="text-xs text-gray-500">Capital</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} barCategoryGap="30%" barGap={3} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
            <Bar dataKey="interes" name="Interés" fill="#fbbf24" radius={[6, 6, 6, 6]} maxBarSize={20} />
            <Bar dataKey="capital" name="Capital" fill="#3b82f6" radius={[6, 6, 6, 6]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos pagos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Últimos pagos registrados</h4>
        <div className="space-y-1">
          {ultimos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin pagos registrados</p>
          )}
          {ultimos.map((p, i) => {
            const { interes, capital } = splitPago(p, prestamosMap)
            return (
              <div key={p.id || i} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={13} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{formatFechaHora(p.fecha_pago)}</p>
                    <p className="text-xs text-gray-400">
                      <span className="text-amber-500">{formatDOP(interes)} int</span>
                      {' · '}
                      <span className="text-blue-500">{formatDOP(capital)} cap</span>
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-800">{formatDOP(p.monto)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
