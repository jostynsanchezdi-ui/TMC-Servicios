import { Link } from 'react-router-dom'
import { Pencil, Trash2, ChevronRight, Star, Phone, Building2, CreditCard, AlertCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatDOP } from '@/lib/utils'
import { tasaSugeridaPorScore } from '@/lib/calculos'

const SCORE_META = {
  3: { label: 'Excelente pagador', color: 'text-amber-500', fill: 'fill-amber-400' },
  2: { label: 'Algunos retrasos',  color: 'text-amber-400', fill: 'fill-amber-300' },
  1: { label: 'Varios retrasos',   color: 'text-gray-400',  fill: 'fill-gray-300'  },
}

const SEC_COLORS = {
  'Cerdos': 'bg-pink-100 text-pink-700',
  'Pollos': 'bg-amber-100 text-amber-700',
  'Fábrica de Alimentos': 'bg-blue-100 text-blue-700',
  'Administración': 'bg-violet-100 text-violet-700',
}

function seccionColor(nombre) {
  if (SEC_COLORS[nombre]) return SEC_COLORS[nombre]
  let h = 0
  for (let i = 0; i < (nombre || '').length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  const palette = ['bg-rose-100 text-rose-700','bg-teal-100 text-teal-700','bg-indigo-100 text-indigo-700','bg-orange-100 text-orange-700']
  return palette[Math.abs(h) % palette.length]
}

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

function Stars({ score }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-400">Sin historial</span>
  const meta = SCORE_META[score] || SCORE_META[1]
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <Star key={i} size={13} className={i <= score ? `${meta.color} ${meta.fill}` : 'text-gray-200 fill-gray-200'} />
        ))}
      </div>
      <span className="text-xs text-gray-500">{meta.label}</span>
    </div>
  )
}

function EmpleadoCard({ emp, stats, onEdit, onDelete }) {
  const nombre = `${emp.nombre} ${emp.apellido}`
  const initials = `${emp.nombre?.[0] || ''}${emp.apellido?.[0] || ''}`.toUpperCase()
  const av = avatarColor(nombre)
  const s = stats || {}

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${av}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/empleados/${emp.id}`} className="font-semibold text-gray-900 hover:text-green-700 transition-colors leading-tight">
                {nombre}
              </Link>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${emp.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {emp.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-1">
              <Stars score={s.score} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Pencil size={14} />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Desactivar a ${nombre}?`)) return
              try { await onDelete(emp.id); toast.success('Empleado desactivado') }
              catch { toast.error('Error al desactivar') }
            }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {emp.secciones?.nombre && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${seccionColor(emp.secciones.nombre)}`}>
            <Building2 size={11} />
            {emp.secciones.nombre}
          </span>
        )}
        {emp.telefono && (
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
            <Phone size={11} />
            {emp.telefono}
          </span>
        )}
        {s.score !== null && s.score !== undefined && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Tasa sugerida: {tasaSugeridaPorScore(s.score).min}%–{tasaSugeridaPorScore(s.score).max}%
          </span>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-50">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Capital</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDOP(s.capitalActivo || 0)}</p>
        </div>
        <div className="text-center border-x border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Préstamos</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{s.prestamosActivos || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cuotas pend.</p>
          <p className={`text-sm font-bold mt-0.5 ${(s.cuotasPendientes || 0) > 3 ? 'text-red-600' : 'text-gray-900'}`}>
            {s.cuotasPendientes || 0}
          </p>
        </div>
      </div>

      {/* CTA */}
      <Link
        to={`/empleados/${emp.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 hover:border-green-200 hover:text-green-700 transition-all"
      >
        Ver perfil
        <ChevronRight size={15} />
      </Link>
    </div>
  )
}

function EmpleadoRow({ emp, stats, onEdit, onDelete }) {
  const nombre = `${emp.nombre} ${emp.apellido}`
  const initials = `${emp.nombre?.[0] || ''}${emp.apellido?.[0] || ''}`.toUpperCase()
  const av = avatarColor(nombre)
  const s = stats || {}

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${av}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/empleados/${emp.id}`} className="text-sm font-semibold text-gray-900 hover:text-green-700 transition-colors">
            {nombre}
          </Link>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${emp.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {emp.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {emp.secciones?.nombre && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${seccionColor(emp.secciones.nombre)}`}>
              {emp.secciones.nombre}
            </span>
          )}
          <Stars score={s.score} />
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6 text-right">
        <div>
          <p className="text-[10px] text-gray-400">Capital</p>
          <p className="text-sm font-semibold text-gray-800">{formatDOP(s.capitalActivo || 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Préstamos</p>
          <p className="text-sm font-semibold text-gray-800">{s.prestamosActivos || 0}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Pend.</p>
          <p className={`text-sm font-semibold ${(s.cuotasPendientes || 0) > 3 ? 'text-red-600' : 'text-gray-800'}`}>
            {s.cuotasPendientes || 0}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
          <Pencil size={14} />
        </button>
        <button
          onClick={async () => {
            if (!confirm(`¿Desactivar a ${nombre}?`)) return
            try { await onDelete(emp.id); toast.success('Empleado desactivado') }
            catch { toast.error('Error al desactivar') }
          }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
        <Link to={`/empleados/${emp.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  )
}

export default function EmpleadosList({ empleados, loading, statsMap, vista, onEdit, onDelete }) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Cargando empleados...</p>
      </div>
    </div>
  )

  if (empleados.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Building2 size={22} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">No hay empleados que coincidan</p>
      <p className="text-xs text-gray-400 mt-1">Intenta cambiar los filtros</p>
    </div>
  )

  if (vista === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {empleados.map(emp => (
          <EmpleadoRow
            key={emp.id}
            emp={emp}
            stats={statsMap[emp.id]}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {empleados.map(emp => (
        <EmpleadoCard
          key={emp.id}
          emp={emp}
          stats={statsMap[emp.id]}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
