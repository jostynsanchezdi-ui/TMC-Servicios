import dayjs from 'dayjs'
import { Bell, CheckCircle2 } from 'lucide-react'
import { formatDOP } from '@/lib/utils'

export default function AlertasPanel({ cuotas }) {
  const hoy = dayjs()

  const vencidas = cuotas
    .filter(
      (c) =>
        (c.estado === 'pendiente' || c.estado === 'parcial') &&
        dayjs(c.fecha_vencimiento).isBefore(hoy, 'day')
    )
    .slice(0, 5)

  const proximas = cuotas
    .filter(
      (c) =>
        c.estado === 'pendiente' &&
        dayjs(c.fecha_vencimiento).diff(hoy, 'day') <= 3 &&
        dayjs(c.fecha_vencimiento).diff(hoy, 'day') >= 0
    )
    .slice(0, 5)

  const allAlertas = [
    ...vencidas.map((c) => ({ ...c, tipo: 'vencida' })),
    ...proximas.map((c) => ({ ...c, tipo: 'proxima' })),
  ].slice(0, 5)

  const totalCount = vencidas.length + proximas.length

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[200px] gap-3">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={20} className="text-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-400 mt-0.5">No hay alertas pendientes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <Bell size={15} className="text-red-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Alertas</h3>
        </div>
        <span className="text-xs font-semibold bg-red-50 text-red-600 rounded-full px-2.5 py-0.5">
          {totalCount}
        </span>
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[280px]">
        {allAlertas.map((cuota) => {
          const nombreEmpleado =
            cuota.prestamos?.empleados
              ? `${cuota.prestamos.empleados.nombre} ${cuota.prestamos.empleados.apellido}`
              : `Cuota #${cuota.numero_cuota}`
          const saldo = cuota.monto_esperado - (cuota.monto_pagado || 0)
          const esVencida = cuota.tipo === 'vencida'

          return (
            <div
              key={cuota.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  esVencida ? 'bg-red-500' : 'bg-amber-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{nombreEmpleado}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {esVencida ? 'Cuota vencida' : 'Vence pronto'} — #{cuota.numero_cuota}
                </p>
              </div>
              <span
                className={`text-xs font-semibold flex-shrink-0 ${
                  esVencida ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                {formatDOP(saldo)}
              </span>
            </div>
          )
        })}
      </div>

      {totalCount > 5 && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-50">
          +{totalCount - 5} alertas más
        </p>
      )}
    </div>
  )
}
