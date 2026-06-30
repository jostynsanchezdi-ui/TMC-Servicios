import { WifiOff, RefreshCw, Clock } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useOnlineStatus()

  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm">
        <WifiOff size={14} className="flex-shrink-0" />
        <span className="flex-1">Sin conexion — los cambios se guardaran localmente</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 border-b border-amber-200 text-sm">
      <Clock size={14} className="flex-shrink-0" />
      <span className="flex-1">
        {pendingCount} operacion{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de sincronizar
      </span>
      <button
        onClick={syncNow}
        className="flex items-center gap-1.5 font-medium hover:opacity-75 transition-opacity"
      >
        <RefreshCw size={13} />
        Sincronizar ahora
      </button>
    </div>
  )
}
