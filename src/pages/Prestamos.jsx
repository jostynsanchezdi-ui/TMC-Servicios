import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePrestamos } from '@/hooks/usePrestamos'
import PrestamosList from '@/components/prestamos/PrestamosList'
import PrestamoForm from '@/components/prestamos/PrestamoForm'
import CalculadoraPrevia from '@/components/prestamos/CalculadoraPrevia'

export default function Prestamos() {
  const { prestamos, loading, crearPrestamo, actualizarEstado } = usePrestamos()
  const [cuotasMap, setCuotasMap] = useState({})
  const [formOpen, setFormOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)

  useEffect(() => {
    async function cargarCuotas() {
      const { data } = await supabase.from('cuotas').select('prestamo_id, estado, monto_esperado, monto_pagado')
      if (!data) return
      const map = {}
      data.forEach(c => {
        map[c.prestamo_id] = map[c.prestamo_id] || []
        map[c.prestamo_id].push(c)
      })
      setCuotasMap(map)
    }
    cargarCuotas()
  }, [prestamos])

  return (
    <>
      <PrestamosList
        prestamos={prestamos}
        cuotasMap={cuotasMap}
        loading={loading}
        onCambiarEstado={actualizarEstado}
        onNuevo={() => setFormOpen(true)}
        onCalculadora={() => setCalcOpen(true)}
      />

      {formOpen && (
        <PrestamoForm
          onClose={() => setFormOpen(false)}
          onCreate={crearPrestamo}
        />
      )}

      {calcOpen && (
        <CalculadoraPrevia
          onClose={() => setCalcOpen(false)}
          onRegistrar={() => { setCalcOpen(false); setFormOpen(true) }}
        />
      )}
    </>
  )
}
