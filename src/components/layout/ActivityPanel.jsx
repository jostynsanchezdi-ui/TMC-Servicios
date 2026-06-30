import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, DollarSign, CreditCard, UserPlus, Pencil, UserMinus, Trash2, XCircle, RefreshCw, Activity } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

const TIPOS = {
  pago_registrado:      { label: 'Pago',               Icon: DollarSign, bg: 'bg-green-100',  text: 'text-green-600'  },
  prestamo_nuevo:       { label: 'Préstamo nuevo',      Icon: CreditCard, bg: 'bg-blue-100',   text: 'text-blue-600'   },
  prestamo_cancelado:   { label: 'Préstamo cancelado',  Icon: XCircle,    bg: 'bg-red-100',    text: 'text-red-500'    },
  prestamo_completado:  { label: 'Préstamo completado', Icon: CreditCard, bg: 'bg-teal-100',   text: 'text-teal-600'   },
  empleado_nuevo:       { label: 'Empleado nuevo',      Icon: UserPlus,   bg: 'bg-indigo-100', text: 'text-indigo-600' },
  empleado_actualizado: { label: 'Actualización',       Icon: Pencil,     bg: 'bg-amber-100',  text: 'text-amber-600'  },
  empleado_desactivado: { label: 'Desactivado',         Icon: UserMinus,  bg: 'bg-orange-100', text: 'text-orange-500' },
  empleado_eliminado:   { label: 'Eliminado',           Icon: Trash2,     bg: 'bg-red-100',    text: 'text-red-500'    },
}

function timeAgo(date) {
  const diff = dayjs().diff(dayjs(date), 'minute')
  if (diff < 1)   return 'ahora'
  if (diff < 60)  return `${diff}m`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)     return `${d}d`
  return dayjs(date).format('DD/MM')
}

function groupByDate(items) {
  const today = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')
  const weekAgo = today.subtract(7, 'day')

  const groups = [
    { label: 'Hoy',         items: [] },
    { label: 'Ayer',        items: [] },
    { label: 'Esta semana', items: [] },
    { label: 'Anterior',    items: [] },
  ]

  for (const item of items) {
    const d = dayjs(item.created_at)
    if (d.isAfter(today))     groups[0].items.push(item)
    else if (d.isAfter(yesterday)) groups[1].items.push(item)
    else if (d.isAfter(weekAgo))   groups[2].items.push(item)
    else                           groups[3].items.push(item)
  }

  return groups.filter(g => g.items.length > 0)
}

export default function ActivityPanel({ onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('actividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    window.addEventListener('tmc-sync-done', load)
    return () => window.removeEventListener('tmc-sync-done', load)
  }, [])

  const groups = groupByDate(items)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Actividad reciente</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Activity size={28} className="opacity-30" />
              <p className="text-sm">Sin actividad registrada</p>
            </div>
          ) : (
            <div className="py-2">
              {groups.map(({ label, items: groupItems }) => (
                <div key={label}>
                  <div className="px-5 py-2 sticky top-0 bg-white">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {label}
                    </span>
                  </div>
                  {groupItems.map(item => {
                    const config = TIPOS[item.tipo] || {
                      label: item.tipo,
                      Icon: Activity,
                      bg: 'bg-gray-100',
                      text: 'text-gray-500',
                    }
                    const { Icon, bg, text, label: tipoLabel } = config

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full ${bg} flex items-center justify-center mt-0.5`}>
                          <Icon size={13} className={text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">{item.descripcion}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{tipoLabel}</p>
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
