import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Star } from 'lucide-react'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().optional(),
  seccion_id: z.string().uuid('Selecciona una sección').optional().or(z.literal('')),
  telefono: z.string().optional(),
  notas: z.string().optional(),
})

function StarSelector({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i === value ? null : i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={
              i <= (hover || value || 0)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-gray-300'
            }
          />
        </button>
      ))}
      {value && (
        <span className="text-xs text-gray-400 self-center ml-1">{value}/5</span>
      )}
    </div>
  )
}

export default function EmpleadoForm({ empleado, onClose, onCreate, onUpdate }) {
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [calificacion, setCalificacion] = useState(empleado?.calificacion || null)
  const isEdit = !!empleado

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: empleado || {},
  })

  useEffect(() => {
    supabase.from('secciones').select('id, nombre').eq('activa', true).order('nombre').then(({ data }) => setSecciones(data || []))
  }, [])

  async function onSubmit(data) {
    setLoading(true)
    try {
      if (isEdit) {
        await onUpdate(empleado.id, { ...data, calificacion })
        toast.success('Empleado actualizado')
      } else {
        await onCreate({ ...data, calificacion })
        toast.success('Empleado creado')
      }
      onClose()
    } catch (err) {
      console.error('Error al guardar empleado:', err)
      toast.error(`Error: ${err?.message || err?.code || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">{isEdit ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input {...register('nombre')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input {...register('apellido')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
            <select {...register('seccion_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Sin sección</option>
              {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input {...register('telefono')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="809-000-0000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
            <StarSelector value={calificacion} onChange={setCalificacion} />
            <p className="text-xs text-gray-400 mt-1">Toca una estrella para calificar. Toca la misma para quitar.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea {...register('notas')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
