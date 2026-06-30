import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/offlineQueue'
import { logActividad } from '@/lib/actividades'
import { toast } from 'sonner'

export function useEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEmpleados = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('empleados')
      .select('*, secciones(id, nombre)')
      .order('apellido')
    if (error) { toast.error('Error cargando empleados'); setLoading(false); return }
    setEmpleados(data)
    setLoading(false)
  }, [])

  function sanitizar(values) {
    return { ...values, seccion_id: values.seccion_id || null }
  }

  async function crearEmpleado(values) {
    const data = sanitizar(values)
    if (!navigator.onLine) {
      enqueue('crear_empleado', data)
      toast.info('Sin conexion — empleado guardado para sincronizar')
      return
    }
    const { error } = await supabase.from('empleados').insert(data)
    if (error) throw error
    await logActividad(
      'empleado_nuevo',
      `Nuevo empleado: ${values.nombre} ${values.apellido}`,
      { nombre: values.nombre, apellido: values.apellido }
    )
    await fetchEmpleados()
  }

  async function actualizarEmpleado(id, values) {
    const data = sanitizar(values)
    if (!navigator.onLine) {
      enqueue('actualizar_empleado', { id, values: data })
      toast.info('Sin conexion — cambios guardados para sincronizar')
      return
    }
    const { error } = await supabase.from('empleados').update(data).eq('id', id)
    if (error) throw error
    await logActividad(
      'empleado_actualizado',
      `Empleado actualizado: ${values.nombre} ${values.apellido}`,
      { empleado_id: id }
    )
    await fetchEmpleados()
  }

  async function desactivarEmpleado(id) {
    if (!navigator.onLine) {
      enqueue('desactivar_empleado', { id })
      toast.info('Sin conexion — desactivacion guardada para sincronizar')
      return
    }

    const { data: emp } = await supabase
      .from('empleados').select('nombre, apellido').eq('id', id).single()
    const empNombre = emp ? `${emp.nombre} ${emp.apellido}` : ''

    const { error: errEmp } = await supabase.from('empleados').update({ activo: false }).eq('id', id)
    if (errEmp) throw errEmp

    const { error: errPrestamos } = await supabase
      .from('prestamos')
      .update({ estado: 'cancelado' })
      .eq('empleado_id', id)
      .eq('estado', 'activo')
    if (errPrestamos) throw errPrestamos

    await logActividad(
      'empleado_desactivado',
      `Empleado desactivado: ${empNombre}`,
      { empleado_id: id }
    )
    await fetchEmpleados()
  }

  async function eliminarEmpleado(id) {
    if (!navigator.onLine) {
      toast.error('Se necesita conexion para eliminar un empleado')
      return
    }

    const { data: emp } = await supabase
      .from('empleados').select('nombre, apellido').eq('id', id).single()
    const empNombre = emp ? `${emp.nombre} ${emp.apellido}` : ''

    const { data: prestamos } = await supabase.from('prestamos').select('id').eq('empleado_id', id)
    const prestamoIds = (prestamos || []).map(p => p.id)

    if (prestamoIds.length > 0) {
      const { error: errPagos } = await supabase.from('pagos').delete().in('prestamo_id', prestamoIds)
      if (errPagos) throw errPagos

      const { error: errCuotas } = await supabase.from('cuotas').delete().in('prestamo_id', prestamoIds)
      if (errCuotas) throw errCuotas

      const { error: errPrestamos } = await supabase.from('prestamos').delete().eq('empleado_id', id)
      if (errPrestamos) throw errPrestamos
    }

    const { error: errEmp } = await supabase.from('empleados').delete().eq('id', id)
    if (errEmp) throw errEmp

    await logActividad(
      'empleado_eliminado',
      `Empleado eliminado: ${empNombre}`,
      { empleado_id: id }
    )
    await fetchEmpleados()
  }

  useEffect(() => {
    fetchEmpleados()
    window.addEventListener('tmc-sync-done', fetchEmpleados)
    return () => window.removeEventListener('tmc-sync-done', fetchEmpleados)
  }, [fetchEmpleados])

  return { empleados, loading, fetchEmpleados, crearEmpleado, actualizarEmpleado, desactivarEmpleado, eliminarEmpleado }
}
