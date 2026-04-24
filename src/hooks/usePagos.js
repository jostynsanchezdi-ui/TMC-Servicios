import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function usePagos(prestamoId = null) {
  const [cuotas, setCuotas] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchCuotas() {
    setLoading(true)
    let query = supabase
      .from('cuotas')
      .select('*, prestamos(id, monto_original, empleados(id, nombre, apellido, secciones(nombre)))')
      .order('fecha_vencimiento')

    if (prestamoId) query = query.eq('prestamo_id', prestamoId)

    const { data, error } = await query
    if (error) { toast.error('Error cargando cuotas'); return }
    setCuotas(data)
    setLoading(false)
  }

  async function fetchPagos() {
    let query = supabase
      .from('pagos')
      .select('*')
      .order('fecha_pago', { ascending: false })

    if (prestamoId) query = query.eq('prestamo_id', prestamoId)

    const { data, error } = await query
    if (error) return
    setPagos(data)
  }

  async function registrarPago(cuotaId, montoPagado, prestamoIdPago, empleadoId, notas = '') {
    const cuota = cuotas.find((c) => c.id === cuotaId)
    if (!cuota) throw new Error('Cuota no encontrada')

    const nuevoMontoPagado = (cuota.monto_pagado || 0) + montoPagado
    const estaCompleta = nuevoMontoPagado >= cuota.monto_esperado
    const nuevoEstado = estaCompleta ? 'pagada' : 'parcial'

    const { error: errCuota } = await supabase
      .from('cuotas')
      .update({
        monto_pagado: nuevoMontoPagado,
        estado: nuevoEstado,
        fecha_pago: estaCompleta ? new Date().toISOString() : null,
      })
      .eq('id', cuotaId)

    if (errCuota) throw errCuota

    const { error: errPago } = await supabase.from('pagos').insert({
      cuota_id: cuotaId,
      prestamo_id: prestamoIdPago,
      empleado_id: empleadoId,
      monto: montoPagado,
      notas,
    })

    if (errPago) throw errPago

    await fetchCuotas()
    await fetchPagos()
  }

  async function cuotasQuincena(fechaCorte) {
    const { data, error } = await supabase
      .from('cuotas')
      .select('*, prestamos(id, monto_original, empleados(id, nombre, apellido, secciones(nombre)))')
      .eq('fecha_vencimiento', fechaCorte)
      .order('fecha_vencimiento')

    if (error) throw error
    return data
  }

  useEffect(() => {
    fetchCuotas()
    fetchPagos()
  }, [prestamoId])

  return { cuotas, pagos, loading, fetchCuotas, registrarPago, cuotasQuincena }
}
