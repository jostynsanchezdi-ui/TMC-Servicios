import dayjs from 'dayjs'
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatDOP } from '@/lib/utils'

const MESES = 12

function buildRatioMap(prestamos) {
  const ratio = {}
  const cuotaQ = {}
  prestamos.forEach(p => {
    const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
    const tasa = Number(p.tasa_mensual)
    const denom = tasa + 1 / meses
    ratio[p.id] = denom > 0 ? tasa / denom : 0.5
    cuotaQ[p.id] = p.cuota_quincenal
  })
  return { ratio, cuotaQ }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2 capitalize">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-800">
            {entry.dataKey === 'capitalActivo' || entry.dataKey === 'capitalRestante'
              ? formatDOP(entry.value)
              : `${Number(entry.value).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GraficaLineas({ prestamos, cuotas, pagos }) {
  const data = useMemo(() => {
    const hoy = dayjs()
    const { ratio: ratioMap, cuotaQ: cuotaQMap } = buildRatioMap(prestamos)
    const activos = prestamos.filter(p => p.estado === 'activo')

    return Array.from({ length: MESES }, (_, i) => {
      const mes = hoy.subtract(MESES - 1 - i, 'month')
      const inicioMes = mes.startOf('month').format('YYYY-MM-DD')
      const finMes = mes.endOf('month').format('YYYY-MM-DD')

      // Loans that had already started by end of this month
      const activosEnMes = activos.filter(p => p.fecha_inicio <= finMes)
      const activosIds = new Set(activosEnMes.map(p => p.id))

      // Capital total activo
      const capitalActivo = activosEnMes.reduce((s, p) => s + Number(p.monto_original), 0)

      // Capital restante: monto original minus capital portion of payments made up to end of month
      const capitalRestante = activosEnMes.reduce((s, p) => {
        const ratio = ratioMap[p.id] ?? 0.5
        const capitalPagado = pagos
          .filter(pg => pg.prestamo_id === p.id && (pg.fecha_pago || '').slice(0, 10) <= finMes)
          .reduce((ss, pg) => ss + Number(pg.monto) * (1 - ratio), 0)
        return s + Math.max(0, Number(p.monto_original) - capitalPagado)
      }, 0)

      // Tasa promedio mensual (%)
      const tasaPromedio = activosEnMes.length
        ? (activosEnMes.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activosEnMes.length) * 100
        : 0

      // Interest generated in this month
      const interesEnMes = cuotas
        .filter(c =>
          c.fecha_vencimiento >= inicioMes &&
          c.fecha_vencimiento <= finMes &&
          c.estado !== 'cancelada' &&
          activosIds.has(c.prestamo_id)
        )
        .reduce((s, c) => s + Number(cuotaQMap[c.prestamo_id] ?? c.monto_esperado) * (ratioMap[c.prestamo_id] ?? 0.5), 0)

      // Tasa de retorno = interés del mes / capital restante (%)
      const tasaRetorno = capitalRestante > 0 ? (interesEnMes / capitalRestante) * 100 : 0

      return {
        mes: mes.format('MMM YY'),
        capitalActivo,
        capitalRestante,
        tasaPromedio: parseFloat(tasaPromedio.toFixed(3)),
        tasaRetorno: parseFloat(tasaRetorno.toFixed(3)),
      }
    })
  }, [prestamos, cuotas, pagos])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">Evolución del Portafolio</h3>
        <p className="text-xs text-gray-400 mt-0.5">Últimos 12 meses · mes a mes</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="capital"
            orientation="left"
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <YAxis
            yAxisId="tasa"
            orientation="right"
            tickFormatter={v => `${v.toFixed(1)}%`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '14px' }}
            formatter={name => <span className="text-gray-600">{name}</span>}
          />
          <Line
            yAxisId="capital"
            type="monotone"
            dataKey="capitalActivo"
            name="Capital Activo"
            stroke="#1e356f"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            yAxisId="capital"
            type="monotone"
            dataKey="capitalRestante"
            name="Capital Restante"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            yAxisId="tasa"
            type="monotone"
            dataKey="tasaPromedio"
            name="Tasa Promedio"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            yAxisId="tasa"
            type="monotone"
            dataKey="tasaRetorno"
            name="Tasa de Retorno"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
