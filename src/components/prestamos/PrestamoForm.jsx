import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { calcularPrestamo } from '@/lib/calculos'
import { formatDOP } from '@/lib/utils'
import SelectorMeses from './SelectorMeses'
import { X, Loader2 } from 'lucide-react'
import dayjs from 'dayjs'
import QuincenaSelector, { quincenaDates, defaultQuincena } from '@/components/common/QuincenaSelector'

const schema = z.object({
  empleadoId: z.string().uuid('Selecciona un empleado'),
  montoOriginal: z.coerce.number().min(1, 'Requerido'),
  tasaMensual: z.coerce.number().min(0.01, 'Requerido'),
  fechaInicio: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
})

function tasaDesdeCuota(cuotaQuincenal, capital, meses) {
  if (!capital || !meses) return 0
  return ((2 * cuotaQuincenal / capital) - (1 / meses)) * 100
}

export default function PrestamoForm({ onClose, onCreate }) {
  const [empleados, setEmpleados]       = useState([])
  const [loading, setLoading]           = useState(false)
  const [meses, setMeses]               = useState(12)
  const [cuotasPagadas, setCuotasPagadas] = useState(0)
  const [modoEntrada, setModoEntrada]   = useState('tasa') // 'tasa' | 'cuota'
  const [cuotaInput, setCuotaInput]     = useState('')
  const [preview, setPreview]           = useState(null)
  const [confirmData, setConfirmData]   = useState(null)

  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf]   = useState(dq.half)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fechaInicio: quincenaDates(dq.month, dq.half).hasta, tasaMensual: 5 },
  })

  const [monto, tasa, fechaInicio] = watch(['montoOriginal', 'tasaMensual', 'fechaInicio'])

  useEffect(() => {
    supabase.from('empleados').select('id, nombre, apellido').eq('activo', true).order('apellido')
      .then(({ data }) => setEmpleados(data || []))
  }, [])

  useEffect(() => {
    if (monto > 0 && tasa >= 3 && tasa <= 8) {
      const p = calcularPrestamo(Number(monto), Number(tasa) / 100, fechaInicio || dayjs().format('YYYY-MM-DD'), meses)
      setPreview(p)
      if (modoEntrada === 'tasa') setCuotaInput(p.cuotaQuincenal.toFixed(2))
    } else {
      setPreview(null)
    }
  }, [monto, tasa, meses, fechaInicio, modoEntrada])

  function handleCuotaChange(val) {
    setCuotaInput(val)
    const cuota = parseFloat(val)
    if (!cuota || !monto || monto <= 0) return
    const tasaCalculada = tasaDesdeCuota(cuota, Number(monto), meses)
    const tasaRedondeada = parseFloat(tasaCalculada.toFixed(2))
    setValue('tasaMensual', tasaRedondeada, { shouldValidate: true })
  }

  function onSubmit(data) {
    setConfirmData({ ...data, meses, cuotasPagadas })
  }

  async function confirmarCreacion() {
    if (!confirmData) return
    setLoading(true)
    try {
      await onCreate(confirmData)
      const msg = confirmData.cuotasPagadas > 0
        ? `Préstamo creado — ${confirmData.cuotasPagadas} de ${confirmData.meses * 2} cuotas marcadas como pagadas`
        : `Préstamo creado — ${confirmData.meses * 2} cuotas generadas`
      toast.success(msg)
      onClose()
    } catch {
      toast.error('Error al crear préstamo')
    } finally {
      setLoading(false)
    }
  }

  const fechaFin = preview && fechaInicio
    ? dayjs(fechaInicio).add(meses, 'month').format('DD/MM/YYYY')
    : null

  const tasaCalculadaDesdeCuota = cuotaInput && monto > 0
    ? tasaDesdeCuota(parseFloat(cuotaInput), Number(monto), meses)
    : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-800">Nuevo Préstamo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto">
          {/* Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select
              {...register('empleadoId')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Seleccionar...</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>
              ))}
            </select>
            {errors.empleadoId && <p className="text-red-500 text-xs mt-1">{errors.empleadoId.message}</p>}
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto (RD$)</label>
            <input
              {...register('montoOriginal')}
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="50000"
            />
            {errors.montoOriginal && <p className="text-red-500 text-xs mt-1">{errors.montoOriginal.message}</p>}
          </div>

          {/* Tasa / Cuota — modo dual */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Tasa y cuota quincenal</label>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setModoEntrada('tasa')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    modoEntrada === 'tasa' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Ingresar tasa
                </button>
                <button
                  type="button"
                  onClick={() => setModoEntrada('cuota')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    modoEntrada === 'cuota' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Ingresar cuota
                </button>
              </div>
            </div>

            {modoEntrada === 'tasa' ? (
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    {...register('tasaMensual')}
                    type="number"
                    step="0.5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="5"
                  />
                  {errors.tasaMensual && <p className="text-red-500 text-xs mt-1">{errors.tasaMensual.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">% mensual</p>
                </div>
                {preview && (
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-gray-400">Cuota quincenal</p>
                    <p className="text-sm font-bold text-green-700 mt-0.5">{formatDOP(preview.cuotaQuincenal)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    value={cuotaInput}
                    onChange={e => handleCuotaChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="2500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Monto a pagar cada quincena</p>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-gray-400">Tasa mensual</p>
                  {tasaCalculadaDesdeCuota !== null ? (
                    <p className="text-sm font-bold mt-0.5 text-green-700">
                      {tasaCalculadaDesdeCuota.toFixed(2)}%
                    </p>
                  ) : (
                    <p className="text-sm text-gray-300 mt-0.5">—</p>
                  )}
                  {errors.tasaMensual && (
                    <p className="text-red-500 text-[10px] mt-0.5">{errors.tasaMensual.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fecha de inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <div className="border border-gray-300 rounded-lg px-3 py-2">
              <QuincenaSelector
                month={month}
                half={half}
                onChange={(m, h) => {
                  setMonth(m)
                  setHalf(h)
                  setValue('fechaInicio', quincenaDates(m, h).hasta, { shouldValidate: true })
                }}
              />
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duración del préstamo</label>
            <SelectorMeses value={meses} onChange={v => { setMeses(v); setCuotasPagadas(0) }} />
          </div>

          {/* Cuotas ya pagadas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuotas ya pagadas
              <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional — para préstamos con historial)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={meses * 2 - 1}
                value={cuotasPagadas}
                onChange={e => setCuotasPagadas(Math.min(Math.max(0, Number(e.target.value)), meses * 2 - 1))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {cuotasPagadas > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  {cuotasPagadas} de {meses * 2} cuotas se marcarán como pagadas
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Cuota quincenal</p>
                  <p className="font-bold text-green-700 text-sm">{formatDOP(preview.cuotaQuincenal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total intereses</p>
                  <p className="font-bold text-amber-700 text-sm">{formatDOP(preview.totalIntereses)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total a pagar</p>
                  <p className="font-bold text-gray-800 text-sm">{formatDOP(preview.totalPagar)}</p>
                </div>
              </div>
              {fechaFin && (
                <p className="text-xs text-center text-gray-500">
                  Fecha de finalización estimada: <strong className="text-gray-700">{fechaFin}</strong>
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              {...register('notas')}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
              Revisar y confirmar
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación */}
      {confirmData && preview && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">Confirmar préstamo</h3>
              <p className="text-xs text-gray-500 mt-0.5">Revisa los datos antes de registrar</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Empleado</span>
                  <span className="font-medium text-gray-800">
                    {empleados.find(e => e.id === confirmData.empleadoId)
                      ? `${empleados.find(e => e.id === confirmData.empleadoId).apellido}, ${empleados.find(e => e.id === confirmData.empleadoId).nombre}`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-medium text-gray-800">{formatDOP(confirmData.montoOriginal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tasa mensual</span>
                  <span className="font-medium text-gray-800">{confirmData.tasaMensual}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duración</span>
                  <span className="font-medium text-gray-800">{confirmData.meses} meses ({confirmData.meses * 2} cuotas)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cuota quincenal</span>
                  <span className="font-bold text-green-700">{formatDOP(preview.cuotaQuincenal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total intereses</span>
                  <span className="font-medium text-amber-700">{formatDOP(preview.totalIntereses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="text-gray-600 font-medium">Total a pagar</span>
                  <span className="font-bold text-gray-800">{formatDOP(preview.totalPagar)}</span>
                </div>
              </div>
              {confirmData.cuotasPagadas > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {confirmData.cuotasPagadas} cuotas se marcarán como ya pagadas
                </p>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setConfirmData(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarCreacion}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
