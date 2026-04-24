import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calcularPrestamo, generarTablaAmortizacion } from '@/lib/calculos'
import { formatDOP, formatFecha } from '@/lib/utils'
import SelectorMeses from './SelectorMeses'
import { X } from 'lucide-react'
import dayjs from 'dayjs'

const schema = z.object({
  monto: z.coerce.number().min(1, 'Requerido'),
  tasa: z.coerce.number().min(3).max(8, 'Entre 3% y 8%'),
  fecha_inicio: z.string().min(1, 'Requerido'),
})

export default function CalculadoraPrevia({ onClose, onRegistrar }) {
  const [resultado, setResultado] = useState(null)
  const [tabla, setTabla] = useState([])
  const [meses, setMeses] = useState(12)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_inicio: dayjs().format('YYYY-MM-DD') },
  })

  function onSubmit(data) {
    const tasa = data.tasa / 100
    const r = calcularPrestamo(data.monto, tasa, data.fecha_inicio, meses)
    setResultado(r)
    setTabla(generarTablaAmortizacion(data.monto, tasa, data.fecha_inicio, meses))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-800">Calculadora de Préstamo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (RD$)</label>
                <input
                  {...register('monto')}
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="50000"
                />
                {errors.monto && <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tasa mensual (%)</label>
                <input
                  {...register('tasa')}
                  type="number"
                  step="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="5"
                />
                {errors.tasa && <p className="text-red-500 text-xs mt-1">{errors.tasa.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                <input
                  {...register('fecha_inicio')}
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración del préstamo</label>
              <SelectorMeses value={meses} onChange={setMeses} />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium"
            >
              Calcular
            </button>
          </form>

          {resultado && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Cuota quincenal', formatDOP(resultado.cuotaQuincenal), 'text-green-700'],
                  ['Cuota mensual', formatDOP(resultado.cuotaMensual), 'text-gray-800'],
                  ['Total intereses', formatDOP(resultado.totalIntereses), 'text-amber-700'],
                  ['Total a pagar', formatDOP(resultado.totalPagar), 'text-gray-800'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`font-bold mt-0.5 ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2">
                <span>Plazo: <strong className="text-gray-700">{resultado.meses} meses</strong></span>
                <span>·</span>
                <span>Cuotas: <strong className="text-gray-700">{resultado.totalCuotas} pagos quincenales</strong></span>
                <span>·</span>
                <span>Fin estimado: <strong className="text-gray-700">{formatFecha(tabla[tabla.length - 1]?.fecha_vencimiento)}</strong></span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-center px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Vencimiento</th>
                      <th className="text-right px-3 py-2">Capital</th>
                      <th className="text-right px-3 py-2">Interés</th>
                      <th className="text-right px-3 py-2">Cuota</th>
                      <th className="text-right px-3 py-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tabla.map((r) => (
                      <tr key={r.numero_cuota} className="hover:bg-gray-50">
                        <td className="text-center px-3 py-2 text-gray-500">{r.numero_cuota}</td>
                        <td className="px-3 py-2">{formatFecha(r.fecha_vencimiento)}</td>
                        <td className="text-right px-3 py-2">{formatDOP(r.abono_capital)}</td>
                        <td className="text-right px-3 py-2 text-amber-600">{formatDOP(r.interes)}</td>
                        <td className="text-right px-3 py-2 font-medium">{formatDOP(r.cuota)}</td>
                        <td className="text-right px-3 py-2 text-gray-500">{formatDOP(r.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={onRegistrar}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Registrar este préstamo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
