import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const titles = {
  '/': 'Dashboard',
  '/empleados': 'Empleados',
  '/prestamos': 'Préstamos',
  '/quincena': 'Panel de Quincena',
  '/secciones': 'Secciones',
  '/reportes': 'Reportes',
}

export default function Header({ onMenuClick }) {
  const { signOut, session } = useAuth()
  const location = useLocation()
  const title = titles[location.pathname] || ''

  async function handleLogout() {
    try {
      await signOut()
      toast.success('Sesión cerrada')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <header className="h-12 flex items-center justify-end px-4 gap-3 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md hover:bg-white/60 text-gray-600"
      >
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <User size={14} />
          <span>{session?.user?.email}</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-gray-200" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
