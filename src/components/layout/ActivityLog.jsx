import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDOP } from '@/lib/utils'
import dayjs from 'dayjs'
import { DollarSign, CreditCard, Activity } from 'lucide-react'

function timeAgo(date) {
  const diff = dayjs().diff(dayjs(date), 'minute')
  if (diff < 1) return 'ahora'
  if (diff < 60) return `${diff}m`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return dayjs(date).format('DD/MM')
}

export default function ActivityLog() {
  const [items, setItems] = useState([])

  async function load() {
    const [{ data: pagos }, { data: prestamos }] = await Promise.all([
      supabase
        .from('pagos')
        .select('id, monto, created_at, empleados(nombre, apellido)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('prestamos')
        .select('id, monto_original, created_at, empleados(nombre, apellido)')
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    const feed = [
      ...(pagos || []).map(p => ({
        id: `pago-${p.id}`,
        type: 'pago',
        name: p.empleados ? `${p.empleados.nombre} ${p.empleados.apellido}` : '—',
        amount: p.monto,
        date: p.created_at,
      })),
      ...(prestamos || []).map(p => ({
        id: `prestamo-${p.id}`,
        type: 'prestamo',
        name: p.empleados ? `${p.empleados.nombre} ${p.empleados.apellido}` : '—',
        amount: p.monto_original,
        date: p.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6)

    setItems(feed)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    window.addEventListener('tmc-sync-done', load)
    return () => {
      clearInterval(interval)
      window.removeEventListener('tmc-sync-done', load)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="border-t border-gray-200 px-3 py-3">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Activity size={12} className="text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actividad reciente</span>
      </div>

      <div className="space-y-0.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              item.type === 'pago' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {item.type === 'pago'
                ? <DollarSign size={11} className="text-green-600" />
                : <CreditCard size={11} className="text-blue-600" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 truncate leading-tight font-medium">
                {item.name}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {item.type === 'pago' ? 'Pago' : 'Préstamo'} · {formatDOP(item.amount)}
              </p>
            </div>

            <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(item.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
