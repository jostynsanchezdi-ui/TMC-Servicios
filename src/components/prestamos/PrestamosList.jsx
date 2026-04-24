import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDOP, formatFecha } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus, Calculator, ArrowUpDown,
  ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  ChevronUp, ChevronDown, X, CheckSquare2, TrendingUp,
  CreditCard, Clock, Percent
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────

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

const ESTADO_BADGE = {
  activo:     { cls: 'bg-green-100 text-green-700 border border-green-200',   dot: 'bg-green-500',  label: 'Activo' },
  completado: { cls: 'bg-blue-100 text-blue-700 border border-blue-200',      dot: 'bg-blue-500',   label: 'Completado' },
  cancelado:  { cls: 'bg-gray-100 text-gray-500 border border-gray-200',      dot: 'bg-gray-400',   label: 'Cancelado' },
}

const ESTADO_ORDER = { activo: 0, completado: 1, cancelado: 2 }

const COLS = [
  { key: 'empleado',  label: 'Empleado',   sortFn: (a,b) => `${a.empleados?.apellido}`.localeCompare(`${b.empleados?.apellido}`) },
  { key: 'seccion',   label: 'Sección',    sortFn: (a,b) => (a.empleados?.secciones?.nombre||'').localeCompare(b.empleados?.secciones?.nombre||'') },
  { key: 'monto',     label: 'Monto',      sortFn: (a,b) => Number(a.monto_original) - Number(b.monto_original), align: 'right' },
  { key: 'cuota',     label: 'Cuota Qnl.', sortFn: (a,b) => Number(a.cuota_quincenal) - Number(b.cuota_quincenal), align: 'right' },
  { key: 'tasa',      label: 'Tasa',       sortFn: (a,b) => Number(a.tasa_mensual) - Number(b.tasa_mensual), align: 'right' },
  { key: 'progreso',  label: 'Progreso',   sortFn: null },
  { key: 'fecha_fin', label: 'Vence',      sortFn: (a,b) => new Date(a.fecha_fin) - new Date(b.fecha_fin) },
  { key: 'estado',    label: 'Estado',     sortFn: (a,b) => (ESTADO_ORDER[a.estado] ?? 3) - (ESTADO_ORDER[b.estado] ?? 3) },
]

const PER_PAGE_OPTIONS = [10, 25, 50]

// ── sub-components ────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown size={12} className="text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-green-600" />
    : <ChevronDown size={12} className="text-green-600" />
}

function ProgressBar({ cuotas }) {
  if (!cuotas || cuotas.length === 0) return <span className="text-xs text-gray-300">—</span>
  const pagadas = cuotas.filter(c => c.estado === 'pagada').length
  const total = cuotas.length
  const pct = Math.round((pagadas / total) * 100)
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-blue-400' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, bg, color, sub }) {
  return (
    <div className="flex items-center gap-3 py-4 px-5">
      <div className={`${bg} rounded-xl p-2 flex-shrink-0`}>
        <Icon size={16} className={color} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────

export default function PrestamosList({ prestamos, cuotasMap, loading, onCambiarEstado, onNuevo, onCalculadora }) {
  const [showStats, setShowStats] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [sortCol, setSortCol] = useState('fecha_fin')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  // ── filtering + sorting ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...prestamos]
    if (filtroEstado !== 'todos') list = list.filter(p => p.estado === filtroEstado)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        `${p.empleados?.nombre} ${p.empleados?.apellido}`.toLowerCase().includes(q) ||
        (p.empleados?.secciones?.nombre || '').toLowerCase().includes(q)
      )
    }
    const col = COLS.find(c => c.key === sortCol)
    list.sort((a, b) => {
      const estadoDiff = (ESTADO_ORDER[a.estado] ?? 3) - (ESTADO_ORDER[b.estado] ?? 3)
      if (estadoDiff !== 0) return estadoDiff
      if (col?.sortFn) return sortDir === 'asc' ? col.sortFn(a, b) : col.sortFn(b, a)
      return 0
    })
    return list
  }, [prestamos, filtroEstado, search, sortCol, sortDir])

  // ── pagination ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageStart = (page - 1) * perPage
  const paged = filtered.slice(pageStart, pageStart + perPage)

  function handleSort(col) {
    if (!COLS.find(c => c.key === col)?.sortFn) return
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // ── stats ───────────────────────────────────────────────────
  const capitalActivo = prestamos.filter(p => p.estado === 'activo').reduce((s, p) => s + Number(p.monto_original), 0)
  const cuotasPendientes = Object.values(cuotasMap).flat().filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length
  const activosList = prestamos.filter(p => p.estado === 'activo')
  const tasaPromedio = activosList.length
    ? activosList.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activosList.length
    : 0

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Cargando préstamos...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-0">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900 mr-2">Préstamos</h1>

          {/* Filter tabs */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 text-xs font-medium">
            {[
              { v: 'todos',      label: 'Todos',       count: prestamos.length },
              { v: 'activo',     label: 'Activos',     count: prestamos.filter(p => p.estado === 'activo').length },
              { v: 'completado', label: 'Completados', count: prestamos.filter(p => p.estado === 'completado').length },
              { v: 'cancelado',  label: 'Cancelados',  count: prestamos.filter(p => p.estado === 'cancelado').length },
            ].map(({ v, label, count }) => (
              <button
                key={v}
                onClick={() => { setFiltroEstado(v); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filtroEstado === v ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show Statistics toggle */}
          <div className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-xl px-3 py-2">
            <span>Estadísticas</span>
            <button
              onClick={() => setShowStats(v => !v)}
              className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${showStats ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showStats ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <button
            onClick={onCalculadora}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Calculator size={14} />
            Calculadora
          </button>

          <button
            onClick={onNuevo}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} />
            Nuevo préstamo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* ── Stats strip ── */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 border-b border-gray-100">
            <StatCard label="Total préstamos"  value={prestamos.length}           icon={CreditCard}   bg="bg-violet-50" color="text-violet-600" sub={`${activosList.length} activos`} />
            <StatCard label="Capital activo"   value={formatDOP(capitalActivo)}   icon={TrendingUp}   bg="bg-green-50"  color="text-green-600" />
            <StatCard label="Cuotas pendientes" value={cuotasPendientes}          icon={Clock}        bg="bg-amber-50"  color="text-amber-600" />
            <StatCard label="Tasa promedio"    value={`${(tasaPromedio*100).toFixed(1)}%`} icon={Percent} bg="bg-blue-50" color="text-blue-600" sub="mensual" />
          </div>
        )}

        {/* ── Search + column headers ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Buscar empleado o sección..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} resultados</span>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.sortFn ? 'cursor-pointer hover:text-gray-800 select-none' : ''}
                      ${col.key === 'seccion' ? 'hidden sm:table-cell' : ''}
                      ${col.key === 'cuota' || col.key === 'tasa' ? 'hidden md:table-cell' : ''}
                      ${col.key === 'progreso' ? 'hidden lg:table-cell' : ''}
                      ${col.key === 'fecha_fin' ? 'hidden lg:table-cell' : ''}
                    `}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortFn && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 2} className="text-center py-16 text-gray-400 text-sm">
                    No hay préstamos que coincidan
                  </td>
                </tr>
              )}
              {paged.map(p => {
                const nombre = `${p.empleados?.nombre || ''} ${p.empleados?.apellido || ''}`.trim()
                const initials = `${p.empleados?.nombre?.[0] || ''}${p.empleados?.apellido?.[0] || ''}`.toUpperCase()
                const av = avatarColor(nombre)
                const cuotas = cuotasMap[p.id] || []
                const badge = ESTADO_BADGE[p.estado] || ESTADO_BADGE.cancelado

                return (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-gray-50/60"
                  >
                    {/* Empleado */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${av}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{nombre}</p>
                        </div>
                      </div>
                    </td>

                    {/* Sección */}
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {p.empleados?.secciones?.nombre || '—'}
                      </span>
                    </td>

                    {/* Monto */}
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold text-gray-900">{formatDOP(p.monto_original)}</span>
                    </td>

                    {/* Cuota */}
                    <td className="px-3 py-3 text-right hidden md:table-cell text-gray-600">
                      {formatDOP(p.cuota_quincenal)}
                    </td>

                    {/* Tasa */}
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {(p.tasa_mensual * 100).toFixed(2)}%
                      </span>
                    </td>

                    {/* Progreso */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <ProgressBar cuotas={cuotas} />
                    </td>

                    {/* Fecha fin */}
                    <td className="px-3 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {formatFecha(p.fecha_fin)}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Ver */}
                    <td className="px-3 py-3">
                      <Link
                        to={`/prestamos/${p.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 inline-flex opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Filas por página:</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="ml-2">
              {pageStart + 1}–{Math.min(pageStart + perPage, filtered.length)} de {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500">
              <ChevronsLeft size={14} />
            </button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500">
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${page === p ? 'bg-green-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    {p}
                  </button>
                )
              )}

            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500">
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
