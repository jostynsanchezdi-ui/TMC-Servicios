import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Empleados from '@/pages/Empleados'
import EmpleadoDetalle from '@/pages/EmpleadoDetalle'
import Prestamos from '@/pages/Prestamos'
import PrestamoDetalle from '@/pages/PrestamoDetalle'
import Quincena from '@/pages/Quincena'
import Secciones from '@/pages/Secciones'
import Reportes from '@/pages/Reportes'
import Ganancias from '@/pages/Ganancias'

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  return session ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  return session ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="empleados/:id" element={<EmpleadoDetalle />} />
            <Route path="prestamos" element={<Prestamos />} />
            <Route path="prestamos/:id" element={<PrestamoDetalle />} />
            <Route path="quincena" element={<Quincena />} />
            <Route path="secciones" element={<Secciones />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="ganancias" element={<Ganancias />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
