import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDOP, formatFecha } from '@/lib/utils'
import { generarTablaAmortizacion } from '@/lib/calculos'
import { pdfTablaAmortizacion } from '@/lib/pdf'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  ArrowLeft, TrendingUp, CreditCard, Clock, FileText,
  Building2, Phone, Star, ChevronRight, CheckCircle2, AlertTriangle, Zap,
  XCircle, Loader2,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────

const ESTADO_COLOR = {
  pagada:    '#16a34a',
  pendiente: '#d1d5db',
  parcial:   '#f59e0b',
  vencida:   '#ef4444',
}

const ESTADO_BADGE = {
  activo:     'bg-green-100 text-green-700 border border-green-200',
  completado: 'bg-blue-100 text-blue-700 border border-blue-200',
  cancelado:  'bg-gray-100 text-gray-500 border border-gray-200',
}

function avatarColor(nombre) {
  const palette = [
    'bg-violet-200 text-violet-800','bg-blue-200 text-blue-800',
    'bg-rose-200 text-rose-800','bg-amber-200 text-amber-800',
    'bg-teal-200 text-teal-800','bg-indigo-200 text-indigo-800',
    'bg-green-200 text-green-800','bg-pink-200 text-pink-800',
  ]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function splitPago(monto, tasa, meses) {
  const denom = tasa + 1 / meses
  const ratio = denom > 0 ? tasa / denom : 0.5
  return { interes: monto * ratio, capital: monto * (1 - ratio) }
}

// ── custom tooltips ──────────────────────────────────────────

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs space-y-1">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">{formatDOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs space-y-1">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-bold text-gray-900">{formatDOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold capitalize text-gray-800">{payload[0].payload.name}</p>
      <p className="text-gray-400">{payload[0].value} cuotas</p>
    </div>
  )
}

// ── stat card ────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, bg, iconColor, progress, progressColor = 'bg-green-500' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`${bg} rounded-xl p-2.5`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${progressColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

// ── confirm modal ─────────────────────────────────────────────

function CancelModal({ onConfirm, onClose, loading }) {
  const [nota, setNota] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-3">
              <XCircle size={28} className="text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 text-lg">Cancelar préstamo</h3>
            <p className="text-sm text-gray-500 mt-1.5">
              Esta acción marcará el préstamo como <strong>cancelado</strong> y todas las cuotas pendientes quedarán anuladas. No se puede deshacer.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Motivo de cancelación <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              placeholder="Ej: Empleado solicitó cancelación, acuerdo mutuo..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 text-gray-700 placeholder:text-gray-300"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              onClick={() => onConfirm(nota)}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Cancelar préstamo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────

export default function PrestamoDetalle() {
  const { id } = useParams()
  const [prestamo, setPrestamo] = useState(null)
  const [cuotas, setCuotas] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [cancelModal, setCancelModal] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    async function cargar() {
      const [{ data: p }, { data: c }, { data: pg }] = await Promise.all([
        supabase.from('prestamos').select('*, empleados(id, nombre, apellido, telefono, secciones(nombre))').eq('id', id).single(),
        supabase.from('cuotas').select('*').eq('prestamo_id', id).order('numero_cuota'),
        supabase.from('pagos').select('*').eq('prestamo_id', id).order('fecha_pago', { ascending: false }),
      ])
      if (!p) { toast.error('Préstamo no encontrado'); return }
      setPrestamo(p)
      setCuotas(c || [])
      setPagos(pg || [])
      setLoading(false)
    }
    cargar()
  }, [id])

  async function cancelarPrestamo(nota = '') {
    setCanceling(true)
    try {
      await supabase.from('prestamos').update({ estado: 'cancelado', notas: nota }).eq('id', id)
      await supabase.from('cuotas')
        .update({ estado: 'cancelada' })
        .eq('prestamo_id', id)
        .in('estado', ['pendiente', 'parcial', 'vencida'])
      setPrestamo(p => ({ ...p, estado: 'cancelado', notas: nota }))
      setCuotas(cs => cs.map(c =>
        ['pendiente', 'parcial', 'vencida'].includes(c.estado) ? { ...c, estado: 'cancelada' } : c
      ))
      toast.success('Préstamo cancelado')
      setCancelModal(false)
    } catch {
      toast.error('Error al cancelar el préstamo')
    } finally {
      setCanceling(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Cargando préstamo...</p>
      </div>
    </div>
  )

  // ── computed ─────────────────────────────────────────────────
  const meses = dayjs(prestamo.fecha_fin).diff(dayjs(prestamo.fecha_inicio), 'month') || 12
  const tasa = Number(prestamo.tasa_mensual)
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const balancePendiente = cuotas
    .filter(c => c.estado !== 'pagada')
    .reduce((s, c) => s + (Number(c.monto_esperado) - Number(c.monto_pagado || 0)), 0)
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada').length
  const progresoPct = cuotas.length > 0 ? (cuotasPagadas / cuotas.length) * 100 : 0
  const totalEsperado = cuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)

  // Donut — estado cuotas
  const cuotasByEstado = cuotas.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] || 0) + 1
    return acc
  }, {})
  const donutData = Object.entries(cuotasByEstado).map(([name, value]) => ({ name, value }))

  // Bar — interés vs capital por mes (pagos registrados)
  const monthlyMap = {}
  ;[...pagos].reverse().forEach(p => {
    const mes = dayjs(p.fecha_pago).format('MMM YY')
    const { interes, capital } = splitPago(Number(p.monto), tasa, meses)
    monthlyMap[mes] = monthlyMap[mes] || { interes: 0, capital: 0 }
    monthlyMap[mes].interes += interes
    monthlyMap[mes].capital += capital
  })
  const barData = Object.entries(monthlyMap).map(([mes, v]) => ({ mes, ...v }))

  // Area — progreso acumulado (esperado vs pagado por quincena)
  let cumEsperado = 0, cumPagado = 0
  const areaData = [...cuotas]
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
    .map(c => {
      cumEsperado += Number(c.monto_esperado)
      cumPagado += Number(c.monto_pagado || 0)
      return {
        label: `Q${c.numero_cuota}`,
        esperado: Math.round(cumEsperado),
        pagado: Math.round(cumPagado),
      }
    })
  // Show only up to today's cuota + a few ahead
  const hoy = dayjs()
  const lastPaidIdx = cuotas.findLastIndex(c => c.estado === 'pagada' || c.estado === 'parcial')
  const visibleArea = areaData.slice(0, Math.max(lastPaidIdx + 6, 12))

  const tablaCalc = generarTablaAmortizacion(prestamo.monto_original, tasa, prestamo.fecha_inicio, meses)
  const filas = cuotas.map((c, i) => ({ ...tablaCalc[i], ...c }))

  const nombreEmp = `${prestamo.empleados?.nombre || ''} ${prestamo.empleados?.apellido || ''}`.trim()
  const initials = `${prestamo.empleados?.nombre?.[0] || ''}${prestamo.empleados?.apellido?.[0] || ''}`.toUpperCase()
  const av = avatarColor(nombreEmp)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/prestamos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} />
          Volver a préstamos
        </Link>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${ESTADO_BADGE[prestamo.estado] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {prestamo.estado}
          </span>
          {prestamo.estado === 'activo' && (
            <button
              onClick={() => setCancelModal(true)}
              className="flex items-center gap-1.5 text-sm border border-red-200 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle size={14} />
              Cancelar
            </button>
          )}
          <button
            onClick={() => { try { pdfTablaAmortizacion(prestamo, prestamo.empleados, filas); toast.success('PDF generado') } catch { toast.error('Error al generar PDF') } }}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* ── TOP KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Capital original"
          value={formatDOP(prestamo.monto_original)}
          sub={`${meses} meses`}
          icon={CreditCard}
          bg="bg-green-50" iconColor="text-green-600"
        />
        <KPICard
          label="Total pagado"
          value={formatDOP(totalPagado)}
          sub={`${cuotasPagadas} de ${cuotas.length} cuotas`}
          icon={TrendingUp}
          bg="bg-blue-50" iconColor="text-blue-600"
          progress={progresoPct}
          progressColor="bg-blue-500"
        />
        <KPICard
          label="Balance pendiente"
          value={formatDOP(balancePendiente)}
          sub={`${cuotas.length - cuotasPagadas} cuotas restantes`}
          icon={Clock}
          bg="bg-amber-50" iconColor="text-amber-600"
          progress={100 - progresoPct}
          progressColor="bg-amber-400"
        />
        <KPICard
          label="Cuota quincenal"
          value={formatDOP(prestamo.cuota_quincenal)}
          sub={`${(tasa * 100).toFixed(0)}% tasa mensual`}
          icon={TrendingUp}
          bg="bg-violet-50" iconColor="text-violet-600"
        />
      </div>

      {/* ── MIDDLE ROW: donut + bar + empleado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut — estado cuotas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Estado de cuotas</h3>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3} dataKey="value">
                    {donutData.map((d, i) => <Cell key={i} fill={ESTADO_COLOR[d.name] || '#9ca3af'} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ESTADO_COLOR[d.name] || '#9ca3af' }} />
                    <span className="text-xs capitalize text-gray-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{((d.value / cuotas.length) * 100).toFixed(0)}%</span>
                    <span className="text-xs font-bold text-gray-800 w-5 text-right">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar — interés vs capital mensual */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Interés vs Capital cobrado</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /><span className="text-xs text-gray-500">Interés</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /><span className="text-xs text-gray-500">Capital</span></div>
          </div>
          {barData.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">Sin pagos registrados aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={barData} barCategoryGap="30%" barGap={3} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<BarTip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="interes" name="Interés" fill="#fbbf24" radius={[4, 4, 4, 4]} maxBarSize={16} />
                <Bar dataKey="capital" name="Capital" fill="#3b82f6" radius={[4, 4, 4, 4]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Empleado info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Empleado</p>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${av}`}>
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{nombreEmp}</p>
                {prestamo.empleados?.secciones?.nombre && (
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 size={11} />{prestamo.empleados.secciones.nombre}
                  </span>
                )}
                {prestamo.empleados?.telefono && (
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone size={11} />{prestamo.empleados.telefono}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Inicio</span>
                <span className="font-medium">{formatFecha(prestamo.fecha_inicio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vencimiento</span>
                <span className="font-medium">{formatFecha(prestamo.fecha_fin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total a pagar</span>
                <span className="font-semibold text-gray-800">{formatDOP(totalEsperado)}</span>
              </div>
            </div>

            {prestamo.notas && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Nota de cancelación</p>
                <p className="text-xs text-amber-800 leading-relaxed">{prestamo.notas}</p>
              </div>
            )}
          </div>

          <Link
            to={`/empleados/${prestamo.empleados?.id}`}
            className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 hover:border-green-200 hover:text-green-700 transition-all"
          >
            Ver perfil del empleado
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── BOTTOM ROW: area chart + upcoming cuotas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area — progreso acumulado */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Progreso de pago acumulado</h3>
              <p className="text-xs text-gray-400 mt-0.5">Esperado vs Pagado por quincena</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-300 rounded" /><span className="text-gray-400">Esperado</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 rounded" /><span className="text-gray-400">Pagado</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={visibleArea} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEsperado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e5e7eb" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPagado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<AreaTip />} />
              <Area type="monotone" dataKey="esperado" name="Esperado" stroke="#d1d5db" strokeWidth={1.5} fill="url(#gradEsperado)" dot={false} />
              <Area type="monotone" dataKey="pagado" name="Pagado" stroke="#16a34a" strokeWidth={2} fill="url(#gradPagado)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Próximas cuotas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Próximas cuotas</h3>
          <div className="space-y-2">
            {cuotas
              .filter(c => c.estado !== 'pagada')
              .slice(0, 6)
              .map(c => {
                const isVencida = c.estado === 'vencida'
                const isParcial = c.estado === 'parcial'
                return (
                  <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${isVencida ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Cuota #{c.numero_cuota}</p>
                      <p className="text-[10px] text-gray-400">{formatFecha(c.fecha_vencimiento)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${isVencida ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatDOP(Number(c.monto_esperado) - Number(c.monto_pagado || 0))}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isVencida ? 'bg-red-100 text-red-600' :
                        isParcial ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-200 text-gray-500'
                      }`}>{c.estado}</span>
                    </div>
                  </div>
                )
              })}
            {cuotas.filter(c => c.estado !== 'pagada').length === 0 && (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 size={28} className="text-green-400" />
                <p className="text-sm text-gray-400">Todas las cuotas pagadas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TABLA AMORTIZACIÓN ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Tabla de amortización</h3>
          <button
            onClick={() => { try { pdfTablaAmortizacion(prestamo, prestamo.empleados, filas); toast.success('PDF generado') } catch { toast.error('Error') } }}
            className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText size={13} />
            Descargar PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['#', 'Vencimiento', 'Capital', 'Interés', 'Cuota', 'Pagado', 'Estado'].map(h => (
                  <th key={h} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === '#' ? 'text-center' : h === 'Estado' ? 'text-center' : h === 'Vencimiento' ? 'text-left' : 'text-right'} ${h === 'Capital' || h === 'Interés' ? 'hidden sm:table-cell' : ''} ${h === 'Pagado' ? 'hidden md:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.map(f => {
                const estadoCls = {
                  pagada: 'bg-green-100 text-green-700', pendiente: 'bg-gray-100 text-gray-600',
                  parcial: 'bg-amber-100 text-amber-700', vencida: 'bg-red-100 text-red-700',
                }
                return (
                  <tr key={f.id || f.numero_cuota} className={`group transition-colors hover:bg-gray-50/50 ${f.estado === 'vencida' ? 'bg-red-50/30' : ''}`}>
                    <td className="text-center px-3 py-2.5 text-xs text-gray-400">{f.numero_cuota}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{formatFecha(f.fecha_vencimiento)}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{formatDOP(f.abono_capital)}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-amber-600 hidden sm:table-cell">{formatDOP(f.interes)}</td>
                    <td className="text-right px-3 py-2.5 text-sm font-semibold text-gray-900">{formatDOP(f.monto_esperado)}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-green-600 hidden md:table-cell">{formatDOP(f.monto_pagado || 0)}</td>
                    <td className="text-center px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoCls[f.estado] || estadoCls.pendiente}`}>
                        {f.estado}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cancelModal && (
        <CancelModal
          loading={canceling}
          onConfirm={cancelarPrestamo}
          onClose={() => setCancelModal(false)}
        />
      )}
    </div>
  )
}
