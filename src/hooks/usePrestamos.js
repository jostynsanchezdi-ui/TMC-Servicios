import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generarCuotas } from '@/lib/calculos'
import { toast } from 'sonner'
import dayjs from 'dayjs'

export function usePrestamos(empleadoId = null) {
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchPrestamos() {
    setLoading(true)
    let query = supabase
      .from('prestamos')
      .select('*, empleados(id, nombre, apellido, secciones(nombre))')
      .order('created_at', { ascending: false })

    if (empleadoId) query = query.eq('empleado_id', empleadoId)

    const { data, error } = await query
    if (error) { toast.error('Error cargando préstamos'); return }
    setPrestamos(data)
    setLoading(false)
  }

  async function crearPrestamo(values) {
    const { montoOriginal, tasaMensual, fechaInicio, empleadoId, notas, meses = 12, cuotasPagadas = 0, cuotaQuincenalOverride } = values
    const tasa = tasaMensual / 100
    const interesMensual = montoOriginal * tasa
    const abonoCapital = montoOriginal / meses
    const cuotaMensual = interesMensual + abonoCapital
    const cuotaQuincenal = cuotaQuincenalOverride ?? cuotaMensual / 2
    const fechaFin = dayjs(fechaInicio).add(meses, 'month').format('YYYY-MM-DD')

    const { data: prestamo, error: errPrestamo } = await supabase
      .from('prestamos')
      .insert({
        empleado_id: empleadoId,
        monto_original: montoOriginal,
        tasa_mensual: tasa,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        cuota_mensual: cuotaMensual,
        cuota_quincenal: cuotaQuincenal,
        notas,
      })
      .select()
      .single()

    if (errPrestamo) throw errPrestamo

    const cuotas = generarCuotas(montoOriginal, tasa, fechaInicio, meses).map((c) => ({
      ...c,
      prestamo_id: prestamo.id,
      ...(c.numero_cuota <= cuotasPagadas ? {
        estado: 'pagada',
        monto_pagado: c.monto_esperado,
        fecha_pago: c.fecha_vencimiento,
      } : {}),
    }))

    const { data: cuotasInsertadas, error: errCuotas } = await supabase
      .from('cuotas').insert(cuotas).select()
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
          notas: 'Registrado al ingresar préstamo',
        }))
      const { error: errPagos } = await supabase.from('pagos').insert(pagosAInsertar)
      if (errPagos) throw errPagos
    }

    await fetchPrestamos()
    return prestamo
  }

  async function actualizarEstado(id, estado) {
    const { error } = await supabase.from('prestamos').update({ estado }).eq('id', id)
    if (error) throw error
    await fetchPrestamos()
  }

  useEffect(() => { fetchPrestamos() }, [empleadoId])

  return { prestamos, loading, fetchPrestamos, crearPrestamo, actualizarEstado }
}
