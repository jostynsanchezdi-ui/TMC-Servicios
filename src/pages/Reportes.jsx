import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { pdfResumenGeneral } from '@/lib/pdf'
import { formatDOP } from '@/lib/utils'
import { FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

export default function Reportes() {
  const [prestamos, setPrestamos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: p }, { data: pg }, { data: cq }] = await Promise.all([
        supabase.from('prestamos').select('*, empleados(nombre, apellido, secciones(nombre))'),
        supabase.from('pagos').select('*, empleados(nombre, apellido)').order('fecha_pago', { ascending: false }),
        supabase.from('cuotas').select('prestamo_id, estado'),
      ])
      setPrestamos(p || [])
      setPagos(pg || [])
      setCuotas(cq || [])
      setLoading(false)
    }
    cargar()
  }, [])

  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(
      prestamos.map((p) => ({
        Empleado: `${p.empleados?.nombre} ${p.empleados?.apellido}`,
        Sección: p.empleados?.secciones?.nombre || '—',
        Monto: p.monto_original,
        Tasa: `${(p.tasa_mensual * 100).toFixed(1)}%`,
        'Cuota Quincenal': p.cuota_quincenal,
        Estado: p.estado,
        Inicio: p.fecha_inicio,
        Fin: p.fecha_fin,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Préstamos')
    XLSX.writeFile(wb, `prestamos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel exportado')
  }

  function exportarPDF() {
    const kpis = {
      capitalActivo: prestamos.filter((p) => p.estado === 'activo').reduce((s, p) => s + Number(p.monto_original), 0),
      totalCobrado: pagos.reduce((s, p) => s + Number(p.monto), 0),
      interesesGenerados: prestamos.reduce((s, p) => s + Number(p.monto_original) * Number(p.tasa_mensual) * 12, 0),
      prestamosActivos: prestamos.filter((p) => p.estado === 'activo').length,
    }
    pdfResumenGeneral(kpis, prestamos, cuotas)
    toast.success('PDF generado')
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={exportarPDF}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-sm transition-all text-left"
        >
          <div className="bg-red-100 text-red-600 rounded-lg p-2.5"><FileText size={22} /></div>
          <div>
            <p className="font-semibold text-gray-800">Resumen General PDF</p>
            <p className="text-sm text-gray-500">KPIs + listado de todos los préstamos</p>
          </div>
        </button>

        <button
          onClick={exportarExcel}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-sm transition-all text-left"
        >
          <div className="bg-green-100 text-green-600 rounded-lg p-2.5"><Download size={22} /></div>
          <div>
            <p className="font-semibold text-gray-800">Exportar a Excel</p>
            <p className="text-sm text-gray-500">Reporte completo de préstamos (.xlsx)</p>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Rentabilidad por Sección</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Sección</th>
                <th className="text-right px-4 py-3">Capital Prestado</th>
                <th className="text-right px-4 py-3">Intereses Est.</th>
                <th className="text-right px-4 py-3">Préstamos Activos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const map = {}
                prestamos.filter((p) => p.estado === 'activo').forEach((p) => {
                  const sec = p.empleados?.secciones?.nombre || 'Sin sección'
                  if (!map[sec]) map[sec] = { capital: 0, intereses: 0, count: 0 }
                  map[sec].capital += Number(p.monto_original)
                  map[sec].intereses += Number(p.monto_original) * Number(p.tasa_mensual) * 12
                  map[sec].count++
                })
                return Object.entries(map).map(([sec, d]) => (
                  <tr key={sec} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sec}</td>
                    <td className="px-4 py-3 text-right">{formatDOP(d.capital)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatDOP(d.intereses)}</td>
                    <td className="px-4 py-3 text-right">{d.count}</td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
