import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatDOP } from '@/lib/utils'
import { X, Loader2, AlertCircle, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react'

const PUNTUALIDAD = [
  {
    value: 'prematuro',
    label: 'Prematuro',
    desc: 'Pagó antes de la fecha',
    icon: Zap,
    colors: 'border-blue-300 bg-blue-50 text-blue-700',
    active: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
    dot: 'bg-blue-500',
  },
  {
    value: 'a_tiempo',
    label: 'A tiempo',
    desc: 'Pagó en la fecha indicada',
    icon: CheckCircle2,
    colors: 'border-green-300 bg-green-50 text-green-700',
    active: 'border-green-500 bg-green-100 ring-2 ring-green-300',
    dot: 'bg-green-500',
  },
  {
    value: 'tardio',
    label: 'Tardío',
    desc: 'Pagó después de la fecha',
    icon: Clock,
    colors: 'border-amber-300 bg-amber-50 text-amber-700',
    active: 'border-amber-500 bg-amber-100 ring-2 ring-amber-300',
    dot: 'bg-amber-500',
  },
]

const schema = z.object({
  monto: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  notas: z.string().optional(),
})

export default function RegistroPago({ cuota, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [puntualidad, setPuntualidad] = useState('a_tiempo')

  const esperado = Number(cuota.monto_esperado)
  const yaPagado = Number(cuota.monto_pagado || 0)
  const pendiente = esperado - yaPagado

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { monto: pendiente > 0 ? pendiente : esperado },
  })

  const montoIngresado = Number(watch('monto') || 0)
  const nuevoPagado = yaPagado + montoIngresado
  const exceso = nuevoPagado - esperado
  const estaCompleta = nuevoPagado >= esperado

  async function onSubmit(data) {
    setLoading(true)
    try {
      const nuevoPagadoFinal = yaPagado + data.monto
      const esPagada = nuevoPagadoFinal >= esperado
      const nuevoEstado = esPagada ? 'pagada' : 'parcial'

      const hoy = new Date().toISOString().slice(0, 10)

      await supabase.from('cuotas').update({
        monto_pagado: nuevoPagadoFinal,
        estado: nuevoEstado,
        fecha_pago: esPagada ? hoy : null,
      }).eq('id', cuota.id)

      await supabase.from('pagos').insert({
        cuota_id: cuota.id,
        prestamo_id: cuota.prestamo_id,
        empleado_id: cuota.prestamos?.empleado_id,
        monto: data.monto,
        fecha_pago: hoy,
        puntualidad,
        notas: data.notas || null,
      })

      const labels = { prematuro: 'Pago prematuro registrado', a_tiempo: 'Cuota pagada a tiempo ✓', tardio: 'Pago tardío registrado' }
      toast.success(esPagada ? labels[puntualidad] : 'Pago parcial registrado')
      onSuccess()
    } catch {
      toast.error('Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Registrar Pago</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Info cuota */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">
              {cuota.prestamos?.empleados?.nombre} {cuota.prestamos?.empleados?.apellido}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Cuota #{cuota.numero_cuota}</span>
              <span>Esperado: <strong className="text-gray-800">{formatDOP(esperado)}</strong></span>
            </div>
            {yaPagado > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Ya pagado:</span>
                <span className="font-medium text-green-700">{formatDOP(yaPagado)}</span>
              </div>
            )}
            {pendiente > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pendiente:</span>
                <span className="font-medium text-amber-700">{formatDOP(pendiente)}</span>
              </div>
            )}
          </div>

          {/* Selector puntualidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Puntualidad del pago</label>
            <div className="grid grid-cols-3 gap-2">
              {PUNTUALIDAD.map(({ value, label, desc, icon: Icon, colors, active, dot }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPuntualidad(value)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all duration-150 ${
                    puntualidad === value ? active : `${colors} opacity-70 hover:opacity-100`
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className="text-[10px] leading-tight opacity-75">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto a pagar (RD$)</label>
            <input
              {...register('monto')}
              type="number"
              step="0.01"
              min="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setValue('monto', pendiente > 0 ? pendiente : esperado)}
                className="text-xs text-green-600 hover:underline">
                Monto pendiente ({formatDOP(pendiente > 0 ? pendiente : esperado)})
              </button>
              <span className="text-gray-300">·</span>
              <button type="button" onClick={() => setValue('monto', esperado)}
                className="text-xs text-gray-500 hover:underline">
                Cuota completa ({formatDOP(esperado)})
              </button>
            </div>
            {errors.monto && <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>}
          </div>

          {/* Preview resultado */}
          {montoIngresado > 0 && (
            <div className={`rounded-xl px-4 py-3 flex items-start gap-3 text-xs ${
              estaCompleta ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              {estaCompleta
                ? <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              }
              <div className="space-y-0.5">
                {estaCompleta ? (
                  <>
                    <p className="font-semibold text-green-800">Cuota saldada</p>
                    {exceso > 0.01 && (
                      <p className="text-green-700">
                        Exceso de <strong>{formatDOP(exceso)}</strong> — se registra como pago adicional
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-800">Pago parcial</p>
                    <p className="text-amber-700">
                      Quedarán <strong>{formatDOP(esperado - nuevoPagado)}</strong> pendientes en esta cuota
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
            <input
              {...register('notas')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder='ej: "avisó que pagaba el 16"'
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 font-medium">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirmar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
