import { formatDOP, formatFecha } from '@/lib/utils'
import { pdfTablaAmortizacion } from '@/lib/pdf'
import { generarTablaAmortizacion } from '@/lib/calculos'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'

const estadoClases = {
  pendiente: 'bg-gray-100 text-gray-600',
  pagada: 'bg-green-100 text-green-700',
  parcial: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
}

export default function TablaAmortizacion({ cuotas, prestamo }) {
  const tablaCalc = prestamo
    ? generarTablaAmortizacion(prestamo.monto_original, prestamo.tasa_mensual, prestamo.fecha_inicio)
    : []

  const filas = cuotas.map((c, i) => ({
    ...tablaCalc[i],
    ...c,
  }))

  function descargarPDF() {
    try {
      pdfTablaAmortizacion(prestamo, prestamo.empleados, filas)
      toast.success('PDF generado')
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Tabla de Amortización</h3>
        <button onClick={descargarPDF} className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-green-300">
          <FileText size={14} />
          PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-center px-3 py-3">#</th>
              <th className="text-left px-3 py-3">Vencimiento</th>
              <th className="text-right px-3 py-3 hidden sm:table-cell">Capital</th>
              <th className="text-right px-3 py-3 hidden sm:table-cell">Interés</th>
              <th className="text-right px-3 py-3">Cuota</th>
              <th className="text-right px-3 py-3 hidden md:table-cell">Pagado</th>
              <th className="text-center px-3 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.id || f.numero_cuota} className="hover:bg-gray-50">
                <td className="text-center px-3 py-3 text-gray-500">{f.numero_cuota}</td>
                <td className="px-3 py-3">{formatFecha(f.fecha_vencimiento)}</td>
                <td className="text-right px-3 py-3 text-gray-500 hidden sm:table-cell">{formatDOP(f.abono_capital)}</td>
                <td className="text-right px-3 py-3 text-amber-600 hidden sm:table-cell">{formatDOP(f.interes)}</td>
                <td className="text-right px-3 py-3 font-medium">{formatDOP(f.monto_esperado)}</td>
                <td className="text-right px-3 py-3 text-green-600 hidden md:table-cell">{formatDOP(f.monto_pagado)}</td>
                <td className="text-center px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoClases[f.estado] || estadoClases.pendiente}`}>
                    {f.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
