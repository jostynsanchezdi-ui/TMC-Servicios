import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchEmpleados() {
    setLoading(true)
    const { data, error } = await supabase
      .from('empleados')
      .select('*, secciones(id, nombre)')
      .order('apellido')
    if (error) { toast.error('Error cargando empleados'); return }
    setEmpleados(data)
    setLoading(false)
  }

  function sanitizar(values) {
    return { ...values, seccion_id: values.seccion_id || null }
  }

  async function crearEmpleado(values) {
    const { error } = await supabase.from('empleados').insert(sanitizar(values))
    if (error) throw error
    await fetchEmpleados()
  }

  async function actualizarEmpleado(id, values) {
    const { error } = await supabase.from('empleados').update(sanitizar(values)).eq('id', id)
    if (error) throw error
    await fetchEmpleados()
  }

  async function desactivarEmpleado(id) {
    const { error: errEmp } = await supabase.from('empleados').update({ activo: false }).eq('id', id)
    if (errEmp) throw errEmp

    const { error: errPrestamos } = await supabase
      .from('prestamos')
      .update({ estado: 'cancelado' })
      .eq('empleado_id', id)
      .eq('estado', 'activo')
    if (errPrestamos) throw errPrestamos

    await fetchEmpleados()
  }

  async function eliminarEmpleado(id) {
    // Borrar en orden respetando las foreign keys
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

    await fetchEmpleados()
  }

  useEffect(() => { fetchEmpleados() }, [])

  return { empleados, loading, fetchEmpleados, crearEmpleado, actualizarEmpleado, desactivarEmpleado, eliminarEmpleado }
}
