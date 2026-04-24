import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpleados } from '@/hooks/useEmpleados'
import EmpleadosList from '@/components/empleados/EmpleadosList'
import EmpleadoForm from '@/components/empleados/EmpleadoForm'
import { calcularScore } from '@/lib/calculos'
import { formatDOP } from '@/lib/utils'
import { Plus, Search, LayoutGrid, List, Users, TrendingUp, CreditCard, AlertCircle } from 'lucide-react'

export default function Empleados() {
  const { empleados, loading, crearEmpleado, actualizarEmpleado, desactivarEmpleado, eliminarEmpleado } = useEmpleados()
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [vista, setVista] = useState('grid')
  const [statsMap, setStatsMap] = useState({})

  useEffect(() => {
    async function cargarStats() {
      const [{ data: prestamos }, { data: cuotas }] = await Promise.all([
        supabase.from('prestamos').select('id, empleado_id, monto_original, estado'),
        supabase.from('cuotas').select('prestamo_id, estado, monto_esperado, monto_pagado'),
      ])

      const prestamosMap = {}
      ;(prestamos || []).forEach(p => { prestamosMap[p.id] = p })

      const cuotasByEmp = {}
      ;(cuotas || []).forEach(c => {
        const p = prestamosMap[c.prestamo_id]
        if (!p) return
        cuotasByEmp[p.empleado_id] = cuotasByEmp[p.empleado_id] || []
        cuotasByEmp[p.empleado_id].push(c)
      })

      const map = {}
      ;(prestamos || []).forEach(p => {
        if (!map[p.empleado_id]) map[p.empleado_id] = { prestamosActivos: 0, capitalActivo: 0, cuotasPendientes: 0 }
        if (p.estado === 'activo') {
          map[p.empleado_id].prestamosActivos++
          map[p.empleado_id].capitalActivo += Number(p.monto_original)
        }
      })
      ;(cuotas || []).forEach(c => {
        const p = prestamosMap[c.prestamo_id]
        if (!p) return
        if (c.estado === 'pendiente' || c.estado === 'parcial') {
          if (!map[p.empleado_id]) map[p.empleado_id] = { prestamosActivos: 0, capitalActivo: 0, cuotasPendientes: 0 }
          map[p.empleado_id].cuotasPendientes++
        }
      })

      Object.keys(map).forEach(empId => {
        map[empId].score = calcularScore(cuotasByEmp[empId] || [])
      })

      setStatsMap(map)
    }
    cargarStats()
  }, [empleados])

  function handleEdit(emp) { setEditando(emp); setFormOpen(true) }
  function handleClose() { setFormOpen(false); setEditando(null) }

  const secciones = [...new Set(empleados.map(e => e.secciones?.nombre).filter(Boolean))]

  const filtrados = empleados.filter(e => {
    const nombre = `${e.nombre} ${e.apellido}`.toLowerCase()
    if (search && !nombre.includes(search.toLowerCase()) && !(e.secciones?.nombre || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filtroSeccion !== 'todas' && e.secciones?.nombre !== filtroSeccion) return false
    if (filtroEstado === 'activos' && !e.activo) return false
    if (filtroEstado === 'inactivos' && e.activo) return false
    if (filtroEstado === 'con_prestamo' && !(statsMap[e.id]?.prestamosActivos > 0)) return false
    if (filtroEstado === 'sin_prestamo' && (statsMap[e.id]?.prestamosActivos > 0)) return false
    return true
  })

  const totalActivos = empleados.filter(e => e.activo).length
  const conPrestamo = empleados.filter(e => statsMap[e.id]?.prestamosActivos > 0).length
  const capitalTotal = Object.values(statsMap).reduce((s, st) => s + (st.capitalActivo || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión del personal y sus préstamos</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nuevo empleado
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total empleados', value: empleados.length, icon: Users, bg: 'bg-violet-50', color: 'text-violet-600' },
          { label: 'Activos', value: totalActivos, icon: Users, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'Con préstamo activo', value: conPrestamo, icon: CreditCard, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Capital en circulación', value: formatDOP(capitalTotal), icon: TrendingUp, bg: 'bg-amber-50', color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`${bg} rounded-xl p-2.5 flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empleado o sección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>

        {/* Sección filter */}
        <select
          value={filtroSeccion}
          onChange={e => setFiltroSeccion(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
        >
          <option value="todas">Todas las secciones</option>
          {secciones.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Estado tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 text-xs font-medium">
          {[
            { v: 'todos', label: 'Todos' },
            { v: 'activos', label: 'Activos' },
            { v: 'con_prestamo', label: 'Con préstamo' },
            { v: 'sin_prestamo', label: 'Sin préstamo' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setFiltroEstado(v)}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Vista toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          <button onClick={() => setVista('grid')} className={`p-2 rounded-lg transition-all ${vista === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setVista('list')} className={`p-2 rounded-lg transition-all ${vista === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Resultados */}
      <p className="text-xs text-gray-400 -mt-2">{filtrados.length} empleado{filtrados.length !== 1 ? 's' : ''}</p>

      <EmpleadosList
        empleados={filtrados}
        loading={loading}
        statsMap={statsMap}
        vista={vista}
        onEdit={handleEdit}
        onDesactivar={desactivarEmpleado}
        onDelete={eliminarEmpleado}
      />

      {formOpen && (
        <EmpleadoForm
          empleado={editando}
          onClose={handleClose}
          onCreate={crearEmpleado}
          onUpdate={actualizarEmpleado}
        />
      )}
    </div>
  )
}
