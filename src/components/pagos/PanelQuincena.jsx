import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDOP } from '@/lib/utils'
import RegistroPago from './RegistroPago'
import { pdfQuincena } from '@/lib/pdf'
import { toast } from 'sonner'
import {
  FileText, RefreshCw, CheckSquare, Square, X, Loader2,
  CheckCircle2, Clock, Zap,
} from 'lucide-react'
import QuincenaSelector, { quincenaDates, defaultQuincena, quincenaLabel } from '@/components/common/QuincenaSelector'

const PUNTUALIDAD = [
  { value: 'prematuro', label: 'Prematuro', icon: Zap, colors: 'border-blue-300 bg-blue-50 text-blue-700', active: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' },
  { value: 'a_tiempo', label: 'A tiempo', icon: CheckCircle2, colors: 'border-green-300 bg-green-50 text-green-700', active: 'border-green-500 bg-green-100 ring-2 ring-green-300' },
  { value: 'tardio', label: 'Tardío', icon: Clock, colors: 'border-amber-300 bg-amber-50 text-amber-700', active: 'border-amber-500 bg-amber-100 ring-2 ring-amber-300' },
]

const estadoClases = {
  pendiente: 'bg-gray-100 text-gray-600',
  pagada: 'bg-green-100 text-green-700',
  parcial: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
}

function BulkPagoModal({ cuotas, onClose, onSuccess }) {
  const [puntualidad, setPuntualidad] = useState('a_tiempo')
  const [loading, setLoading] = useState(false)

  const total = cuotas.reduce((s, c) => s + (Number(c.monto_esperado) - Number(c.monto_pagado || 0)), 0)

  async function confirmar() {
    setLoading(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)

      await Promise.all(cuotas.map(async (c) => {
        const pendiente = Number(c.monto_esperado) - Number(c.monto_pagado || 0)

        await supabase.from('cuotas').update({
          monto_pagado: Number(c.monto_esperado),
          estado: 'pagada',
          fecha_pago: hoy,
        }).eq('id', c.id)

        await supabase.from('pagos').insert({
          cuota_id: c.id,
          prestamo_id: c.prestamo_id,
          empleado_id: c.prestamos?.empleado_id,
          monto: pendiente,
          fecha_pago: hoy,
          puntualidad,
          notas: null,
        })
      }))
      toast.success(`${cuotas.length} pago${cuotas.length !== 1 ? 's' : ''} registrado${cuotas.length !== 1 ? 's' : ''}`)
      onSuccess()
    } catch {
      toast.error('Error al registrar pagos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Registrar {cuotas.length} pago{cuotas.length !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {cuotas.map(c => {
              const pendiente = Number(c.monto_esperado) - Number(c.monto_pagado || 0)
              return (
                <div key={c.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-800">
                      {c.prestamos?.empleados?.nombre} {c.prestamos?.empleados?.apellido}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">cuota #{c.numero_cuota}</span>
                  </div>
                  <span className="text-green-700 font-medium">{formatDOP(pendiente)}</span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-xl">
            <span className="text-sm font-medium text-green-800">Total a cobrar</span>
            <span className="font-bold text-green-700">{formatDOP(total)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Puntualidad del pago</label>
            <div className="grid grid-cols-3 gap-2">
              {PUNTUALIDAD.map(({ value, label, icon: Icon, colors, active }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPuntualidad(value)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all duration-150 ${
                    puntualidad === value ? active : `${colors} opacity-70 hover:opacity-100`
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={confirmar} disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 font-medium">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirmar {cuotas.length} pago{cuotas.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PanelQuincena() {
  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf]   = useState(dq.half)
  const fechaCorte = quincenaDates(month, half).hasta
  const [cuotas, setCuotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagoModal, setPagoModal] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkModal, setBulkModal] = useState(false)

  async function cargar(fecha) {
    setLoading(true)
    setSelected(new Set())
    const { data, error } = await supabase
      .from('cuotas')
      .select('*, prestamos(id, monto_original, empleado_id, empleados(id, nombre, apellido, secciones(nombre)))')
      .eq('fecha_vencimiento', fecha)
      .order('estado')

    if (error) { toast.error('Error cargando quincena'); return }
    setCuotas(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar(fechaCorte) }, [month, half])

  const porSeccion = useMemo(() => {
    const groups = {}
    cuotas.forEach(c => {
      const sec = c.prestamos?.empleados?.secciones?.nombre || 'Sin Sección'
      if (!groups[sec]) groups[sec] = []
      groups[sec].push(c)
    })
    return groups
  }, [cuotas])

  const totalEsperado = cuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)
  const totalCobrado = cuotas.reduce((s, c) => s + Number(c.monto_pagado || 0), 0)
  const pagadas = cuotas.filter(c => c.estado === 'pagada').length
  const pendientesCuotas = cuotas.filter(c => c.estado !== 'pagada')
  const selectedCuotas = cuotas.filter(c => selected.has(c.id))

  function toggleCuota(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSeccion(secCuotas) {
    const unpaid = secCuotas.filter(c => c.estado !== 'pagada')
    const allSelected = unpaid.every(c => selected.has(c.id))
    setSelected(prev => {
      const next = new Set(prev)
      unpaid.forEach(c => allSelected ? next.delete(c.id) : next.add(c.id))
      return next
    })
  }

  function toggleAll() {
    const allPending = cuotas.filter(c => c.estado !== 'pagada')
    const allSelected = allPending.length > 0 && allPending.every(c => selected.has(c.id))
    setSelected(allSelected ? new Set() : new Set(allPending.map(c => c.id)))
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 min-w-[180px]">
          <p className="text-[10px] text-gray-400 mb-0.5 capitalize">{quincenaLabel(month, half)}</p>
          <QuincenaSelector
            month={month}
            half={half}
            onChange={(m, h) => { setMonth(m); setHalf(h) }}
          />
        </div>
        <button onClick={() => cargar(fechaCorte)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">
          <RefreshCw size={14} />
          Actualizar
        </button>
        <button
          onClick={() => { pdfQuincena(cuotas, fechaCorte); toast.success('PDF generado') }}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-600 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          <FileText size={14} />
          PDF quincena
        </button>
        {pendientesCuotas.length > 0 && (
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 border border-green-200 bg-green-50 rounded-lg px-3 py-1.5">
            <CheckSquare size={14} />
            {selected.size === pendientesCuotas.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total esperado</p>
          <p className="font-bold text-gray-800 mt-0.5">{formatDOP(totalEsperado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Total cobrado</p>
          <p className="font-bold text-green-600 mt-0.5">{formatDOP(totalCobrado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Pagadas</p>
          <p className="font-bold text-gray-800 mt-0.5">{pagadas}/{cuotas.length}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : cuotas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No hay cuotas para esta fecha. Selecciona un día 15 o 30.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porSeccion).map(([seccion, secCuotas]) => {
            const unpaid = secCuotas.filter(c => c.estado !== 'pagada')
            const allSecSelected = unpaid.length > 0 && unpaid.every(c => selected.has(c.id))
            const someSecSelected = !allSecSelected && unpaid.some(c => selected.has(c.id))
            const secTotal = secCuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)
            const secPagadas = secCuotas.filter(c => c.estado === 'pagada').length

            return (
              <div key={seccion} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  {unpaid.length > 0 ? (
                    <button
                      onClick={() => toggleSeccion(secCuotas)}
                      className="flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      {allSecSelected
                        ? <CheckSquare size={16} className="text-green-600" />
                        : someSecSelected
                        ? <CheckSquare size={16} className="text-green-400" />
                        : <Square size={16} />
                      }
                    </button>
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0" />
                  )}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm">{seccion}</h3>
                    <span className="text-xs text-gray-400">{secPagadas}/{secCuotas.length} pagadas</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-shrink-0">{formatDOP(secTotal)}</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-50">
                  {secCuotas.map(c => {
                    const isPaid = c.estado === 'pagada'
                    const isSelected = selected.has(c.id)
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {!isPaid ? (
                          <button
                            onClick={() => toggleCuota(c.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                          >
                            {isSelected
                              ? <CheckSquare size={15} className="text-green-600" />
                              : <Square size={15} />
                            }
                          </button>
                        ) : (
                          <div className="w-4 h-4 flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {c.prestamos?.empleados?.nombre} {c.prestamos?.empleados?.apellido}
                          </p>
                          <p className="text-xs text-gray-400">Cuota #{c.numero_cuota}</p>
                        </div>

                        <div className="text-right hidden sm:block flex-shrink-0">
                          <p className="text-sm font-medium text-gray-700">{formatDOP(c.monto_esperado)}</p>
                          {c.monto_pagado > 0 && (
                            <p className="text-xs text-green-600">pagado {formatDOP(c.monto_pagado)}</p>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${estadoClases[c.estado]}`}>
                          {c.estado}
                        </span>

                        {!isPaid && (
                          <button
                            onClick={() => setPagoModal(c)}
                            className="text-xs text-gray-500 hover:text-green-700 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                          >
                            Registrar
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagoModal && (
        <RegistroPago
          cuota={pagoModal}
          onClose={() => setPagoModal(null)}
          onSuccess={() => { setPagoModal(null); cargar(fechaCorte) }}
        />
      )}

      {bulkModal && (
        <BulkPagoModal
          cuotas={selectedCuotas}
          onClose={() => setBulkModal(false)}
          onSuccess={() => { setBulkModal(false); setSelected(new Set()); cargar(fechaCorte) }}
        />
      )}

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-medium">
            {selected.size} cuota{selected.size !== 1 ? 's' : ''} seleccionada{selected.size !== 1 ? 's' : ''}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-sm text-green-400 font-medium">
            {formatDOP(selectedCuotas.reduce((s, c) => s + Number(c.monto_esperado) - Number(c.monto_pagado || 0), 0))}
          </span>
          <button
            onClick={() => setBulkModal(true)}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors"
          >
            Registrar pagos
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-gray-400 hover:text-white ml-1"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
