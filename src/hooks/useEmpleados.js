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

  async function crearEmpleado(values) {
    const { error } = await supabase.from('empleados').insert(values)
    if (error) throw error
    await fetchEmpleados()
  }

  async function actualizarEmpleado(id, values) {
    const { error } = await supabase.from('empleados').update(values).eq('id', id)
    if (error) throw error
    await fetchEmpleados()
  }

  async function eliminarEmpleado(id) {
    const { error } = await supabase.from('empleados').update({ activo: false }).eq('id', id)
    if (error) throw error
    await fetchEmpleados()
  }

  useEffect(() => { fetchEmpleados() }, [])

  return { empleados, loading, fetchEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado }
}
