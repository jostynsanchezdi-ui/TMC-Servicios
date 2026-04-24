import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

export default function SeccionesList({ secciones, loading, onEdit, onRefresh }) {
  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>
  if (secciones.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
      No hay secciones registradas.
    </div>
  )

  async function toggleActiva(sec) {
    const { error } = await supabase.from('secciones').update({ activa: !sec.activa }).eq('id', sec.id)
    if (error) { toast.error('Error'); return }
    toast.success(sec.activa ? 'Sección desactivada' : 'Sección activada')
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3">Nombre</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">Descripción</th>
            <th className="text-center px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {secciones.map((sec) => (
            <tr key={sec.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{sec.nombre}</td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{sec.descripcion || '—'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sec.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {sec.activa ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => onEdit(sec)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActiva(sec)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                    {sec.activa ? <ToggleRight size={17} className="text-green-600" /> : <ToggleLeft size={17} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
