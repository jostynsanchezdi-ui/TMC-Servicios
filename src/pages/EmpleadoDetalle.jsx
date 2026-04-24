import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EmpleadoFicha from '@/components/empleados/EmpleadoFicha'

export default function EmpleadoDetalle() {
  const { id } = useParams()

  return (
    <div className="space-y-4">
      <Link
        to="/empleados"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} />
        Volver a empleados
      </Link>
      <EmpleadoFicha empleadoId={id} />
    </div>
  )
}
