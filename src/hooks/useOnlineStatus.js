import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { processQueue } from '@/lib/syncQueue'
import { getPendingCount } from '@/lib/offlineQueue'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(getPendingCount)

  const syncNow = useCallback(async () => {
    const count = getPendingCount()
    if (count === 0) return

    const toastId = 'tmc-sync'
    toast.loading(`Sincronizando ${count} operacion(es)...`, { id: toastId })
    const { processed, errors } = await processQueue()

    if (errors === 0) {
      toast.success(`${processed} operacion(es) sincronizadas correctamente`, { id: toastId })
    } else {
      toast.warning(`${processed} sincronizadas, ${errors} con error`, { id: toastId })
    }
    setPendingCount(getPendingCount())
  }, [])

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
      toast.info('Conexion restaurada', { duration: 2000 })
      syncNow()
    }
    function onOffline() {
      setIsOnline(false)
      toast.warning('Sin conexion — los cambios se guardaran localmente', { duration: 4000 })
    }
    function onQueueChanged(e) {
      setPendingCount(e.detail.count)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('tmc-queue-changed', onQueueChanged)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('tmc-queue-changed', onQueueChanged)
    }
  }, [syncNow])

  return { isOnline, pendingCount, syncNow }
}
