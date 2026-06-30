import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/offlineQueue'
import { logActividad } from '@/lib/actividades'
import { generarCuotas } from '@/lib/calculos'
import { formatDOP } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'

export function usePrestamos(empleadoId = null) {
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPrestamos = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('prestamos')
      .select('*, empleados(id, nombre, apellido, secciones(nombre))')
      .order('created_at', { ascending: false })

    if (empleadoId) query = query.eq('empleado_id', empleadoId)

    const { data, error } = await query
    if (error) { toast.error('Error cargando prestamos'); setLoading(false); return }
    setPrestamos(data)
    setLoading(false)
  }, [empleadoId])

  async function crearPrestamo(values) {
    const { montoOriginal, tasaMensual, fechaInicio, empleadoId, notas, meses = 12, cuotasPagadas = 0, cuotaQuincenalOverride } = values
    const tasa = tasaMensual / 100
    const interesMensual = montoOriginal * tasa
    const abonoCapital = montoOriginal / meses
    const cuotaMensual = interesMensual + abonoCapital
    const cuotaQuincenal = cuotaQuincenalOverride ?? cuotaMensual / 2
    const fechaFin = dayjs(fechaInicio).add(meses, 'month').format('YYYY-MM-DD')

    const prestamoData = {
      empleado_id: empleadoId,
      monto_original: montoOriginal,
      tasa_mensual: tasa,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cuota_mensual: cuotaMensual,
      cuota_quincenal: cuotaQuincenal,
      notas,
    }

    const cuotas = generarCuotas(montoOriginal, tasa, fechaInicio, meses).map((c) => ({
      ...c,
      monto_esperado: parseFloat((cuotaQuincenalOverride ?? c.monto_esperado).toFixed(2)),
      ...(c.numero_cuota <= cuotasPagadas ? {
        estado: 'pagada',
        monto_pagado: c.monto_esperado,
        fecha_pago: c.fecha_vencimiento,
      } : {}),
    }))

    if (!navigator.onLine) {
      enqueue('crear_prestamo', { prestamo: prestamoData, cuotas, cuotasPagadas })
      toast.info('Sin conexion — prestamo guardado para sincronizar')
      return null
    }

    const { data: prestamo, error: errPrestamo } = await supabase
      .from('prestamos')
      .insert(prestamoData)
      .select()
      .single()

    if (errPrestamo) throw errPrestamo

    const cuotasConId = cuotas.map((c) => ({ ...c, prestamo_id: prestamo.id }))
    const { data: cuotasInsertadas, error: errCuotas } = await supabase
      .from('cuotas').insert(cuotasConId).select()
    if (errCuotas) throw errCuotas

    if (cuotasPagadas > 0 && cuotasInsertadas?.length) {
      const pagosAInsertar = cuotasInsertadas
        .filter(c => c.numero_cuota <= cuotasPagadas)
        .map(c => ({
          cuota_id: c.id,
          prestamo_id: prestamo.id,
          empleado_id: empleadoId,
          monto: c.monto_esperado,
          fecha_pago: c.fecha_vencimiento,
          puntualidad: 'a_tiempo',
          notas: 'Registrado al ingresar prestamo',
        }))
      const { error: errPagos } = await supabase.from('pagos').insert(pagosAInsertar)
      if (errPagos) throw errPagos
    }

    const { data: emp } = await supabase
      .from('empleados').select('nombre, apellido').eq('id', empleadoId).single()
    const empNombre = emp ? `${emp.nombre} ${emp.apellido}` : ''
    await logActividad(
      'prestamo_nuevo',
      `Nuevo préstamo de ${formatDOP(montoOriginal)}${empNombre ? ` — ${empNombre}` : ''} (${meses} meses)`,
      { prestamo_id: prestamo.id, empleado_id: empleadoId }
    )

    await fetchPrestamos()
    return prestamo
  }

  async function actualizarEstado(id, estado) {
    if (!navigator.onLine) {
      enqueue('actualizar_estado_prestamo', { id, estado })
      toast.info('Sin conexion — cambio guardado para sincronizar')
      return
    }
    const { error } = await supabase.from('prestamos').update({ estado }).eq('id', id)
    if (error) throw error

    const tipoLog = estado === 'cancelado' ? 'prestamo_cancelado'
      : estado === 'completado' ? 'prestamo_completado'
      : null
    if (tipoLog) {
      await logActividad(tipoLog, `Préstamo marcado como ${estado}`, { prestamo_id: id })
    }

    await fetchPrestamos()
  }

  useEffect(() => {
    fetchPrestamos()
    window.addEventListener('tmc-sync-done', fetchPrestamos)
    return () => window.removeEventListener('tmc-sync-done', fetchPrestamos)
  }, [fetchPrestamos])

  return { prestamos, loading, fetchPrestamos, crearPrestamo, actualizarEstado }
}
