import { supabase } from './supabase'
import { getQueue, removeFromQueue } from './offlineQueue'

export async function processQueue() {
  const queue = getQueue()
  if (queue.length === 0) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0

  for (const item of queue) {
    try {
      await processItem(item)
      removeFromQueue(item.id)
      processed++
    } catch {
      errors++
    }
  }

  if (processed > 0) {
    window.dispatchEvent(new CustomEvent('tmc-sync-done'))
  }

  return { processed, errors }
}

async function processItem(item) {
  switch (item.type) {
    case 'registrar_pago': {
      const { cuotaId, montoPagadoFinal, estado, fechaPago, pago } = item.data
      const { error: e1 } = await supabase
        .from('cuotas')
        .update({ monto_pagado: montoPagadoFinal, estado, fecha_pago: fechaPago })
        .eq('id', cuotaId)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('pagos').insert(pago)
      if (e2) throw e2
      break
    }

    case 'crear_prestamo': {
      const { prestamo, cuotas, cuotasPagadas } = item.data
      const { data: p, error: e1 } = await supabase
        .from('prestamos')
        .insert(prestamo)
        .select()
        .single()
      if (e1) throw e1

      const cuotasConId = cuotas.map(c => ({ ...c, prestamo_id: p.id }))
      const { data: cuotasDB, error: e2 } = await supabase
        .from('cuotas')
        .insert(cuotasConId)
        .select()
      if (e2) throw e2

      if (cuotasPagadas > 0 && cuotasDB?.length) {
        const pagos = cuotasDB
          .filter(c => c.numero_cuota <= cuotasPagadas)
          .map(c => ({
            cuota_id: c.id,
            prestamo_id: p.id,
            empleado_id: prestamo.empleado_id,
            monto: c.monto_esperado,
            fecha_pago: c.fecha_vencimiento,
            puntualidad: 'a_tiempo',
            notas: 'Registrado al ingresar préstamo',
          }))
        const { error: e3 } = await supabase.from('pagos').insert(pagos)
        if (e3) throw e3
      }
      break
    }

    case 'crear_empleado': {
      const { error } = await supabase.from('empleados').insert(item.data)
      if (error) throw error
      break
    }

    case 'actualizar_empleado': {
      const { id, values } = item.data
      const { error } = await supabase.from('empleados').update(values).eq('id', id)
      if (error) throw error
      break
    }

    case 'actualizar_estado_prestamo': {
      const { id, estado } = item.data
      const { error } = await supabase.from('prestamos').update({ estado }).eq('id', id)
      if (error) throw error
      break
    }

    case 'desactivar_empleado': {
      const { id } = item.data
      const { error: e1 } = await supabase
        .from('empleados')
        .update({ activo: false })
        .eq('id', id)
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('prestamos')
        .update({ estado: 'cancelado' })
        .eq('empleado_id', id)
        .eq('estado', 'activo')
      if (e2) throw e2
      break
    }

    default:
      throw new Error(`Operacion desconocida: ${item.type}`)
  }
}
