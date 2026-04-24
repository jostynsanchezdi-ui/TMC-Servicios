import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDOP } from '@/lib/utils'
import dayjs from 'dayjs'
import {
  ComposedChart, AreaChart, Area, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  TrendingUp, DollarSign, Clock, Percent,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import QuincenaSelector, { quincenaDates, quincenaLabel, defaultQuincena } from '@/components/common/QuincenaSelector'

const SEC_COLORS = ['#16a34a','#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#ec4899','#f97316','#14b8a6']

const DIST_COLORS = {
  cobrado:   '#16a34a',
  pendiente: '#3b82f6',
  vencido:   '#ef4444',
}

// ── helpers ──────────────────────────────────────────────────

function interesRatio(tasa, meses) {
  const denom = tasa + 1 / meses
  return denom > 0 ? tasa / denom : 0.5
}

function avatarColor(nombre) {
  const palette = [
    'bg-violet-200 text-violet-800','bg-blue-200 text-blue-800',
    'bg-rose-200 text-rose-800','bg-amber-200 text-amber-800',
    'bg-teal-200 text-teal-800','bg-indigo-200 text-indigo-800',
  ]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

// ── tooltips ─────────────────────────────────────────────────

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs space-y-1.5">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke || p.fill }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">
            {p.dataKey === 'tasaRetorno' ? `${p.value}%` : formatDOP(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs space-y-1.5">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-bold text-gray-900">{formatDOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold capitalize text-gray-800">{d.name}</p>
      <p className="text-gray-500">{formatDOP(d.value)}</p>
      <p className="text-gray-400">{d.payload.pct?.toFixed(1)}% del total</p>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, bg, iconColor, delta, deltaLabel, month, half, onQuincenaChange, showFullMonth = false }) {
  const positive = delta >= 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className={`${bg} rounded-xl p-2.5`}>
          <Icon size={17} className={iconColor} />
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      {deltaLabel && <p className="text-xs text-gray-400 mt-0.5">{deltaLabel}</p>}
      {onQuincenaChange && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 capitalize mb-1">{quincenaLabel(month, half)}</p>
          <QuincenaSelector month={month} half={half} onChange={onQuincenaChange} showFullMonth={showFullMonth} />
        </div>
      )}
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────

export default function Ganancias() {
  const [prestamos, setPrestamos]   = useState([])
  const [cuotas, setCuotas]         = useState([])
  const [pagos, setPagos]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtroSeccion, setFiltroSeccion] = useState('todas')
  const dq = defaultQuincena()
  const [qCobrado,    setQCobrado]    = useState(dq)
  const [qPendiente,  setQPendiente]  = useState(dq)
  const [qProyeccion, setQProyeccion] = useState(dq)
  const [sortBy, setSortBy]         = useState('interes_cobrado')
  const [sortDir, setSortDir]       = useState('desc')

  useEffect(() => {
    async function cargar() {
      const [{ data: ps }, { data: cs }, { data: pgs }] = await Promise.all([
        supabase.from('prestamos').select('*, empleados(id, nombre, apellido, secciones(nombre))'),
        supabase.from('cuotas').select('*'),
        supabase.from('pagos').select('*').order('fecha_pago'),
      ])
      setPrestamos(ps || [])
      setCuotas(cs || [])
      setPagos(pgs || [])
      setLoading(false)
    }
    cargar()
  }, [])

  // ── compute per-prestamo stats ─────────────────────────────
  const prestamoStats = useMemo(() => {
    const cuotasByP = {}
    cuotas.forEach(c => { cuotasByP[c.prestamo_id] = cuotasByP[c.prestamo_id] || []; cuotasByP[c.prestamo_id].push(c) })

    const pagosByP = {}
    pagos.forEach(p => { pagosByP[p.prestamo_id] = pagosByP[p.prestamo_id] || []; pagosByP[p.prestamo_id].push(p) })

    return prestamos.map(p => {
      const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
      const tasa = Number(p.tasa_mensual)
      const ratio = interesRatio(tasa, meses)
      const interesTotalProyectado = Number(p.monto_original) * tasa * meses

      const allPagos = pagosByP[p.id] || []
      const interesCobrado = allPagos.reduce((s, pg) => s + Number(pg.monto) * ratio, 0)

      const prestCuotas = cuotasByP[p.id] || []
      const interesPendiente = prestCuotas
        .filter(c => c.estado === 'pendiente' || c.estado === 'parcial')
        .reduce((s, c) => {
          const pendMonto = Number(c.monto_esperado) - Number(c.monto_pagado || 0)
          return s + pendMonto * ratio
        }, 0)

      const interesVencido = prestCuotas
        .filter(c => c.estado === 'vencida')
        .reduce((s, c) => s + Number(c.monto_esperado) * ratio, 0)

      const rendimiento = Number(p.monto_original) > 0
        ? (interesCobrado / Number(p.monto_original)) * 100
        : 0

      return {
        ...p,
        meses,
        ratio,
        interesTotalProyectado,
        interesCobrado,
        interesPendiente,
        interesVencido,
        rendimiento,
        pctCobrado: interesTotalProyectado > 0 ? (interesCobrado / interesTotalProyectado) * 100 : 0,
      }
    })
  }, [prestamos, cuotas, pagos])

  // ── filters ───────────────────────────────────────────────
  const secciones = [...new Set(prestamos.map(p => p.empleados?.secciones?.nombre).filter(Boolean))]

  const filtrados = useMemo(() => {
    let list = prestamoStats.filter(p => p.estado === 'activo' || p.estado === 'completado')
    if (filtroSeccion !== 'todas') list = list.filter(p => p.empleados?.secciones?.nombre === filtroSeccion)
    return [...list].sort((a, b) => {
      const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [prestamoStats, filtroSeccion, sortBy, sortDir])

  // ── aggregate KPIs ────────────────────────────────────────
  const kpis = useMemo(() => {
    const base = prestamoStats.filter(p => filtroSeccion === 'todas' || p.empleados?.secciones?.nombre === filtroSeccion)

    const pagosByP = {}
    pagos.forEach(pg => { pagosByP[pg.prestamo_id] = pagosByP[pg.prestamo_id] || []; pagosByP[pg.prestamo_id].push(pg) })
    const cuotasByP = {}
    cuotas.forEach(c => { cuotasByP[c.prestamo_id] = cuotasByP[c.prestamo_id] || []; cuotasByP[c.prestamo_id].push(c) })

    const { desde: dC, hasta: hC } = quincenaDates(qCobrado.month, qCobrado.half)
    const interesCobrado = base.reduce((s, p) => {
      const ps = (pagosByP[p.id] || []).filter(pg => {
        const f = (pg.fecha_pago || '').slice(0, 10)
        return f >= dC && f <= hC
      })
      return s + ps.reduce((ss, pg) => ss + Number(pg.monto) * p.ratio, 0)
    }, 0)

    const { desde: dP, hasta: hP } = quincenaDates(qPendiente.month, qPendiente.half)
    const interesPendiente = base.reduce((s, p) => {
      return s + (cuotasByP[p.id] || [])
        .filter(c => (c.estado === 'pendiente' || c.estado === 'parcial') && c.fecha_vencimiento >= dP && c.fecha_vencimiento <= hP)
        .reduce((ss, c) => ss + (Number(c.monto_esperado) - Number(c.monto_pagado || 0)) * p.ratio, 0)
    }, 0)

    const { desde: dR, hasta: hR } = quincenaDates(qProyeccion.month, qProyeccion.half)
    const proyectado = base.reduce((s, p) => {
      const pagosPeriodo = (pagosByP[p.id] || []).filter(pg => {
        const f = (pg.fecha_pago || '').slice(0, 10)
        return f >= dR && f <= hR
      })
      const cobradoPeriodo = pagosPeriodo.reduce((ss, pg) => ss + Number(pg.monto), 0)
      if (cobradoPeriodo > 0) return s + cobradoPeriodo
      return s + (cuotasByP[p.id] || [])
        .filter(c => (c.estado === 'pendiente' || c.estado === 'parcial') && c.fecha_vencimiento >= dR && c.fecha_vencimiento <= hR)
        .reduce((ss, c) => ss + Number(c.monto_esperado) - Number(c.monto_pagado || 0), 0)
    }, 0)

    return {
      interesCobrado,
      interesTotalCobrado: base.reduce((s, p) => s + p.interesCobrado, 0),
      interesPendiente,
      interesVencido:  base.reduce((s, p) => s + p.interesVencido, 0),
      proyectado,
      capitalActivo:   base.filter(p => p.estado === 'activo').reduce((s, p) => s + Number(p.monto_original), 0),
      rendimientoPromedio: base.length ? base.reduce((s, p) => s + p.rendimiento, 0) / base.length : 0,
    }
  }, [prestamoStats, filtroSeccion, pagos, cuotas, qCobrado, qPendiente, qProyeccion])

  // ── monthly area chart (last 12 months) ──────────────────
  const monthlyData = useMemo(() => {
    const map = {}
    for (let i = 11; i >= 0; i--) {
      const key = dayjs().subtract(i, 'month').format('MMM YY')
      map[key] = { mes: key, cobrado: 0, proyectado: 0 }
    }
    pagos.forEach(pg => {
      const p = prestamoStats.find(ps => ps.id === pg.prestamo_id)
      if (!p) return
      if (filtroSeccion !== 'todas' && p.empleados?.secciones?.nombre !== filtroSeccion) return
      const key = dayjs(pg.fecha_pago).format('MMM YY')
      if (key in map) map[key].cobrado += Number(pg.monto) * p.ratio
    })
    // Proyectado = average monthly interest expected per active loan
    prestamoStats.filter(p => p.estado === 'activo').forEach(p => {
      if (filtroSeccion !== 'todas' && p.empleados?.secciones?.nombre !== filtroSeccion) return
      const mensualEsperado = Number(p.monto_original) * Number(p.tasa_mensual)
      Object.keys(map).forEach(key => {
        map[key].proyectado += mensualEsperado
      })
    })

    const pagosPorPrestamo = {}
    pagos.forEach(pg => {
      pagosPorPrestamo[pg.prestamo_id] = pagosPorPrestamo[pg.prestamo_id] || []
      pagosPorPrestamo[pg.prestamo_id].push(pg)
    })

    // Capital restante = capital original menos la parte de capital ya pagada
    const capitalRestante = prestamoStats
      .filter(p => p.estado === 'activo' && (filtroSeccion === 'todas' || p.empleados?.secciones?.nombre === filtroSeccion))
      .reduce((s, p) => {
        const capitalPagado = (pagosPorPrestamo[p.id] || [])
          .reduce((ss, pg) => ss + Number(pg.monto) * (1 - p.ratio), 0)
        return s + Math.max(0, Number(p.monto_original) - capitalPagado)
      }, 0)

    // Interés esperado por mes = cuotas × ratio (mismo cálculo que Tasa de Retorno del Dashboard)
    const interesEsperadoPorMes = {}
    cuotas.forEach(c => {
      if (c.estado === 'cancelada') return
      const p = prestamoStats.find(ps => ps.id === c.prestamo_id)
      if (!p || p.estado !== 'activo') return
      if (filtroSeccion !== 'todas' && p.empleados?.secciones?.nombre !== filtroSeccion) return
      const key = dayjs(c.fecha_vencimiento).format('MMM YY')
      if (!(key in map)) return
      interesEsperadoPorMes[key] = (interesEsperadoPorMes[key] || 0) + Number(c.monto_esperado) * p.ratio
    })

    return Object.values(map).map(m => ({
      ...m,
      tasaRetorno: capitalRestante > 0
        ? parseFloat(((interesEsperadoPorMes[m.mes] || 0) / capitalRestante * 100).toFixed(2))
        : 0,
    }))
  }, [pagos, cuotas, prestamoStats, filtroSeccion])

  // ── by section bar chart ──────────────────────────────────
  const seccionData = useMemo(() => {
    const map = {}
    prestamoStats.forEach(p => {
      const sec = p.empleados?.secciones?.nombre || 'Sin sección'
      map[sec] = map[sec] || { seccion: sec, cobrado: 0, pendiente: 0, vencido: 0 }
      map[sec].cobrado   += p.interesCobrado
      map[sec].pendiente += p.interesPendiente
      map[sec].vencido   += p.interesVencido
    })
    return Object.values(map).sort((a, b) => (b.cobrado + b.pendiente) - (a.cobrado + a.pendiente))
  }, [prestamoStats])

  // ── distribution donut ────────────────────────────────────
  const distTotal = kpis.interesTotalCobrado + kpis.interesPendiente + kpis.interesVencido
  const distData = [
    { name: 'cobrado',   value: Math.round(kpis.interesTotalCobrado), pct: distTotal > 0 ? kpis.interesTotalCobrado / distTotal * 100 : 0 },
    { name: 'pendiente', value: Math.round(kpis.interesPendiente),    pct: distTotal > 0 ? kpis.interesPendiente / distTotal * 100 : 0 },
    { name: 'vencido',   value: Math.round(kpis.interesVencido),      pct: distTotal > 0 ? kpis.interesVencido / distTotal * 100 : 0 },
  ].filter(d => d.value > 0)

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const TABLE_COLS = [
    { key: 'empleado',              label: 'Empleado' },
    { key: 'monto_original',        label: 'Capital',         align: 'right' },
    { key: 'interesTotalProyectado',label: 'Interés total',   align: 'right' },
    { key: 'interesCobrado',        label: 'Cobrado',         align: 'right' },
    { key: 'interesPendiente',      label: 'Pendiente',       align: 'right' },
    { key: 'rendimiento',           label: 'Rendimiento',     align: 'right' },
    { key: 'pctCobrado',            label: 'Progreso' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Calculando ganancias...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ganancias</h1>
          <p className="text-sm text-gray-400 mt-0.5">Análisis de intereses cobrados y proyecciones</p>
        </div>

        <select
          value={filtroSeccion}
          onChange={e => setFiltroSeccion(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
        >
          <option value="todas">Todas las secciones</option>
          {secciones.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Interés cobrado"
          value={formatDOP(kpis.interesCobrado)}
          icon={DollarSign}
          bg="bg-green-50" iconColor="text-green-600"
          month={qCobrado.month} half={qCobrado.half}
          onQuincenaChange={(m, h) => setQCobrado({ month: m, half: h })}
          showFullMonth
        />
        <KPICard
          label="Interés pendiente"
          value={formatDOP(kpis.interesPendiente)}
          icon={Clock}
          bg="bg-blue-50" iconColor="text-blue-600"
          month={qPendiente.month} half={qPendiente.half}
          onQuincenaChange={(m, h) => setQPendiente({ month: m, half: h })}
          showFullMonth
        />
        <KPICard
          label="Retorno Capital"
          value={formatDOP(kpis.proyectado)}
          icon={TrendingUp}
          bg="bg-violet-50" iconColor="text-violet-600"
          month={qProyeccion.month} half={qProyeccion.half}
          onQuincenaChange={(m, h) => setQProyeccion({ month: m, half: h })}
          showFullMonth
        />
        <KPICard
          label="Rendimiento promedio"
          value={`${kpis.rendimientoPromedio.toFixed(1)}%`}
          sub={`Capital activo: ${formatDOP(kpis.capitalActivo)}`}
          icon={Percent}
          bg="bg-amber-50" iconColor="text-amber-600"
          delta={kpis.rendimientoPromedio - 5}
          deltaLabel="vs. 5% benchmark"
        />
      </div>

      {/* ── Row 2: area + donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — monthly trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Interés cobrado mensualmente</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 12 meses — interés cobrado y tasa de retorno</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 rounded" /><span className="text-gray-400">Cobrado</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400 rounded" style={{ borderTop: '2px dashed #a78bfa', height: 0 }} /><span className="text-gray-400">Retorno %</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 28, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gCobrado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#a78bfa' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<AreaTip />} />
              <Area yAxisId="left" type="monotone" dataKey="cobrado" name="Cobrado" stroke="#16a34a" strokeWidth={2} fill="url(#gCobrado)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="tasaRetorno" name="Retorno %" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — distribución */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Distribución de interés</h3>
          <div className="text-center mb-2">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatDOP(distTotal)}</p>
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distData} cx="50%" cy="50%" innerRadius={40} outerRadius={66} paddingAngle={3} dataKey="value">
                    {distData.map((d, i) => <Cell key={i} fill={DIST_COLORS[d.name] || '#9ca3af'} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2.5">
            {distData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DIST_COLORS[d.name] }} />
                  <span className="text-xs capitalize text-gray-600">{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{d.pct.toFixed(1)}%</span>
                  <span className="text-xs font-bold text-gray-800">{formatDOP(d.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Detalle por préstamo</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filtrados.length} préstamos</p>
          </div>
          {/* Sort selector */}
          <select
            value={`${sortBy}_${sortDir}`}
            onChange={e => {
              const [col, dir] = e.target.value.split('_')
              setSortBy(col); setSortDir(dir)
            }}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white text-gray-600"
          >
            <option value="interesCobrado_desc">Mayor interés cobrado</option>
            <option value="interesCobrado_asc">Menor interés cobrado</option>
            <option value="interesPendiente_desc">Mayor pendiente</option>
            <option value="rendimiento_desc">Mayor rendimiento</option>
            <option value="monto_original_desc">Mayor capital</option>
            <option value="interesTotalProyectado_desc">Mayor interés proyectado</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Sección</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Capital</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Interés total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cobrado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pendiente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Rendim.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => {
                const nombre = `${p.empleados?.nombre || ''} ${p.empleados?.apellido || ''}`.trim()
                const initials = `${p.empleados?.nombre?.[0] || ''}${p.empleados?.apellido?.[0] || ''}`.toUpperCase()
                const av = avatarColor(nombre)
                const pct = Math.min(p.pctCobrado, 100)
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${av}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{nombre}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            p.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>{p.estado}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {p.empleados?.secciones?.nombre || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 hidden md:table-cell">
                      {formatDOP(p.monto_original)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 hidden lg:table-cell">
                      {formatDOP(p.interesTotalProyectado)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-green-700">{formatDOP(p.interesCobrado)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600 hidden md:table-cell">
                      {formatDOP(p.interesPendiente)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.rendimiento >= 50 ? 'bg-green-100 text-green-700' :
                        p.rendimiento >= 25 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {p.rendimiento.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-blue-400' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">Totales de {filtrados.length} préstamos</p>
          <div className="flex flex-wrap gap-6 text-xs">
            <div>
              <span className="text-gray-400">Capital total: </span>
              <span className="font-semibold text-gray-800">{formatDOP(filtrados.reduce((s, p) => s + Number(p.monto_original), 0))}</span>
            </div>
            <div>
              <span className="text-gray-400">Interés cobrado: </span>
              <span className="font-semibold text-green-700">{formatDOP(filtrados.reduce((s, p) => s + p.interesCobrado, 0))}</span>
            </div>
            <div>
              <span className="text-gray-400">Pendiente: </span>
              <span className="font-semibold text-blue-600">{formatDOP(filtrados.reduce((s, p) => s + p.interesPendiente, 0))}</span>
            </div>
            <div>
              <span className="text-gray-400">Proyectado total: </span>
              <span className="font-semibold text-gray-800">{formatDOP(filtrados.reduce((s, p) => s + p.interesTotalProyectado, 0))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
