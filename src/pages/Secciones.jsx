import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SeccionesList from '@/components/secciones/SeccionesList'
import SeccionForm from '@/components/secciones/SeccionForm'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function Secciones() {
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  async function fetchSecciones() {
    setLoading(true)
    const { data, error } = await supabase.from('secciones').select('*').order('nombre')
    if (error) { toast.error('Error cargando secciones'); return }
    setSecciones(data)
    setLoading(false)
  }

  useEffect(() => { fetchSecciones() }, [])

  function handleEdit(sec) { setEditando(sec); setFormOpen(true) }
  function handleClose() { setFormOpen(false); setEditando(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{secciones.length} secciones registradas</p>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva sección
        </button>
      </div>

      <SeccionesList secciones={secciones} loading={loading} onEdit={handleEdit} onRefresh={fetchSecciones} />

      {formOpen && (
        <SeccionForm seccion={editando} onClose={handleClose} onSave={fetchSecciones} />
      )}
    </div>
  )
}
