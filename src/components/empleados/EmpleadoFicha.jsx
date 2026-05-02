import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { formatDOP, formatFecha, formatFechaHora } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Phone, Building2, Star, CreditCard, TrendingUp, Clock,
  AlertTriangle, ChevronRight, FileText
} from 'lucide-react'

function avatarColor(nombre) {
  const palette = [
    'bg-violet-200 text-violet-800', 'bg-blue-200 text-blue-800',
    'bg-rose-200 text-rose-800',     'bg-amber-200 text-amber-800',
    'bg-teal-200 text-teal-800',     'bg-indigo-200 text-indigo-800',
    'bg-green-200 text-green-800',   'bg-pink-200 text-pink-800',
  ]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function ProgressBar({ value, max, color = 'bg-green-400' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={22}
            className={
              i <= (hover || value || 0)
                ? 'fill-amber-400 text-amber-400'
                : 'text-white/30 fill-transparent'
            }
          />
        </button>
      ))}
    </div>
  )
}

export default function EmpleadoFicha({ empleadoId }) {
  const [empleado, setEmpleado] = useState(null)
  const [prestamos, setPrestamos] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('prestamos')

  useEffect(() => {
    async function cargar() {
      const [{ data: emp }, { data: prests }, { data: pgs }] = await Promise.all([
        supabase.from('empleados').select('*, secciones(nombre)').eq('id', empleadoId).single(),
        supabase.from('prestamos').select('*').eq('empleado_id', empleadoId).order('created_at', { ascending: false }),
        supabase.from('pagos').select('*').eq('empleado_id', empleadoId).order('fecha_pago', { ascending: false }),
      ])
      if (!emp) { toast.error('Empleado no encontrado'); return }
      setEmpleado(emp)
      setPrestamos(prests || [])
      setPagos(pgs || [])

      if (prests?.length) {
        const { data: cs } = await supabase.from('cuotas').select('*').in('prestamo_id', prests.map(p => p.id))
        setCuotas(cs || [])
      }
      setLoading(false)
    }
    cargar()
  }, [empleadoId])

  async function actualizarCalificacion(nueva) {
    const { error } = await supabase.from('empleados').update({ calificacion: nueva }).eq('id', empleadoId)
    if (error) { toast.error('Error al guardar calificación'); return }
    setEmpleado(e => ({ ...e, calificacion: nueva }))
    toast.success('Calificación actualizada')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Cargando ficha...</p>
      </div>
    </div>
  )

  const nombre = `${empleado.nombre} ${empleado.apellido}`
  const initials = `${empleado.nombre?.[0] || ''}${empleado.apellido?.[0] || ''}`.toUpperCase()
  const av = avatarColor(nombre)

  const activos = prestamos.filter(p => p.estado === 'activo')
  const capitalActivo = activos.reduce((s, p) => s + Number(p.monto_original), 0)
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#14532d' }}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${av}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">{nombre}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {empleado.secciones?.nombre && (
                    <span className="flex items-center gap-1 text-green-200 text-sm">
                      <Building2 size={13} />
                      {empleado.secciones.nombre}
                    </span>
                  )}
                  {empleado.telefono && (
                    <span className="flex items-center gap-1 text-green-200 text-sm">
                      <Phone size={13} />
                      {empleado.telefono}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${empleado.activo ? 'bg-green-400/20 text-green-200' : 'bg-white/10 text-white/50'}`}>
                    {empleado.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Calificacion — 5 estrellas manuales */}
              <div className="mt-3 flex items-center gap-3">
                <StarRating value={empleado.calificacion} onChange={actualizarCalificacion} />
                <span className="text-xs text-green-300">
                  {empleado.calificacion ? `${empleado.calificacion}/5` : 'Sin calificación'}
                </span>
              </div>
            </div>
          </div>

          {empleado.notas && (
            <p className="mt-4 text-sm text-green-100 bg-white/10 rounded-xl px-4 py-3">{empleado.notas}</p>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/10">
          {[
            { label: 'Capital activo', value: formatDOP(capitalActivo), icon: CreditCard },
            { label: 'Total pagado',   value: formatDOP(totalPagado),   icon: TrendingUp },
            { label: 'Cuotas pend.',   value: cuotasPendientes,          icon: AlertTriangle },
            { label: 'Préstamos',      value: prestamos.length,          icon: FileText },
          ].map(({ label, value, icon: Icon }, i) => (
            <div key={label} className={`px-5 py-4 ${i > 0 ? 'border-l border-white/10' : ''} ${i >= 2 ? 'border-t border-white/10 sm:border-t-0' : ''}`}>
              <p className="text-green-300 text-xs font-medium">{label}</p>
              <p className="text-white text-lg font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { v: 'prestamos', label: `Préstamos (${prestamos.length})` },
          { v: 'pagos',     label: `Pagos (${pagos.length})` },
          { v: 'cuotas',    label: `Cuotas (${cuotas.length})` },
        ].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Préstamos */}
      {tab === 'prestamos' && (
        <div className="space-y-3">
          {prestamos.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Sin préstamos registrados
            </div>
          )}
          {prestamos.map(p => {
            const prestCuotas = cuotas.filter(c => c.prestamo_id === p.id)
            const pagadas = prestCuotas.filter(c => c.estado === 'pagada').length
            const total = prestCuotas.length
            const pct = total > 0 ? (pagadas / total) * 100 : 0
            const capitalPagado = prestCuotas
              .filter(c => c.estado === 'pagada')
              .reduce((s, c) => s + Number(c.monto_esperado), 0)

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{formatDOP(p.monto_original)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.estado === 'activo' ? 'bg-green-100 text-green-700' :
                        p.estado === 'completado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{p.estado}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {(p.tasa_mensual * 100).toFixed(0)}% mensual · {formatDOP(p.cuota_quincenal)}/quincenal
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFecha(p.fecha_inicio)} → {formatFecha(p.fecha_fin)}
                    </p>
                  </div>
                  <Link
                    to={`/prestamos/${p.id}`}
                    className="flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
                  >
                    Ver detalle
                    <ChevronRight size={13} />
                  </Link>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500">{pagadas}/{total} cuotas pagadas</span>
                    <span className="font-semibold text-gray-700">{pct.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pagadas} max={total} color={p.estado === 'activo' ? 'bg-green-500' : 'bg-blue-400'} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                    <span>Pagado: {formatDOP(capitalPagado)}</span>
                    <span>Restante: {formatDOP(p.monto_original - capitalPagado)}</span>
                  </div>
                </div>

                {p.estado === 'cancelado' && p.notas && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Nota de cancelación</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{p.notas}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {pagos.length === 0 ? (
            <p className="p-12 text-center text-gray-400 text-sm">Sin pagos registrados</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {pagos.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{formatFechaHora(p.fecha_pago)}</p>
                    {p.notas && <p className="text-xs text-gray-400 truncate">{p.notas}</p>}
                  </div>
                  <span className="text-sm font-bold text-green-700 flex-shrink-0">{formatDOP(p.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Cuotas */}
      {tab === 'cuotas' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {cuotas.length === 0 ? (
            <p className="p-12 text-center text-gray-400 text-sm">Sin cuotas</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...cuotas].sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)).map(c => {
                const estadoClases = {
                  pagada:    'bg-green-100 text-green-700',
                  pendiente: 'bg-gray-100 text-gray-600',
                  parcial:   'bg-amber-100 text-amber-700',
                  vencida:   'bg-red-100 text-red-700',
                }
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50">
                    <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">#{c.numero_cuota}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatFecha(c.fecha_vencimiento)}</span>
                    <div className="flex-1" />
                    {c.monto_pagado > 0 && c.estado !== 'pagada' && (
                      <span className="text-xs text-amber-600 flex-shrink-0">
                        Pagado: {formatDOP(c.monto_pagado)}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{formatDOP(c.monto_esperado)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${estadoClases[c.estado]}`}>
                      {c.estado}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
