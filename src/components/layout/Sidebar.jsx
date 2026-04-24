import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, CalendarDays,
  Building2, FileBarChart, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/empleados', icon: Users, label: 'Empleados' },
  { to: '/prestamos', icon: CreditCard, label: 'Préstamos' },
  { to: '/quincena', icon: CalendarDays, label: 'Quincena' },
  { to: '/ganancias', icon: TrendingUp, label: 'Ganancias' },
  { to: '/secciones', icon: Building2, label: 'Secciones' },
  { to: '/reportes', icon: FileBarChart, label: 'Reportes' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300 border-r border-gray-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <img src="/logo.png" alt="TMC Servicios" className="w-3/5 object-contain mx-auto" style={{ imageRendering: 'high-quality' }} />
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-700 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-black/10'
              )}
              style={({ isActive }) => isActive ? { backgroundColor: '#1e356f' } : {}}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
