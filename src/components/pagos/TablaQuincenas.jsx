import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'
import { formatDOP } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// 4 meses atrás + mes actual + 12 adelante = 17 meses en total
const MESES_ATRAS = 4
const MESES_TOTAL = 17
const AZUL = '#1e356f'

function generarColumnas(startMonth, numMeses) {
  const cols = []
  for (let i = 0; i < numMeses; i++) {
    const mes = startMonth.add(i, 'month')
    const ultimoDia = mes.endOf('month').date()
    cols.push({
      fecha: mes.format('YYYY-MM-15'),
      label: '15',
      mesLabel: mes.format('MMM YY'),
      esInicio: true,
      mes,
    })
    cols.push({
      fecha: mes.endOf('month').format('YYYY-MM-DD'),
      label: ultimoDia.toString(),
      mesLabel: '',
      esInicio: false,
      mes,
    })
  }
  return cols
}

export default function TablaQuincenas() {
  const startMonth = useMemo(() => dayjs().subtract(MESES_ATRAS, 'month').startOf('month'), [])
  const [prestamos, setPrestamos] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [loading, setLoading] = useState(true)

  const columnas = useMemo(() => generarColumnas(startMonth, MESES_TOTAL), [startMonth])

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const fechaInicio = columnas[0].fecha
      const fechaFin = columnas[columnas.length - 1].fecha

      const [{ data: prests }, { data: cuotasData }] = await Promise.all([
        supabase
          .from('prestamos')
          .select('id, cuota_quincenal, empleado_id, empleados(id, nombre, apellido, secciones(nombre))')
          .eq('estado', 'activo')
          .order('empleado_id'),
        supabase
          .from('cuotas')
          .select('id, prestamo_id, fecha_vencimiento, monto_esperado, monto_pagado, estado, numero_cuota')
          .gte('fecha_vencimiento', fechaInicio)
          .lte('fecha_vencimiento', fechaFin),
      ])

      if (!prests) { toast.error('Error cargando datos'); setLoading(false); return }
      setPrestamos(prests)
      setCuotas(cuotasData || [])
      setLoading(false)
    }
    cargar()
  }, [startMonth])

  const { secciones, cuotaMap } = useMemo(() => {
    // Map: prestamo_id → fecha → cuota
    const map = {}
    cuotas.forEach(c => {
      if (!map[c.prestamo_id]) map[c.prestamo_id] = {}
      map[c.prestamo_id][c.fecha_vencimiento] = c
    })

    // Group by section
    const secMap = {}
    prestamos.forEach((p, idx) => {
      const sec = p.empleados?.secciones?.nombre || 'Sin Sección'
      if (!secMap[sec]) secMap[sec] = []
      secMap[sec].push({ ...p, rowNum: idx + 1 })
    })

    return { secciones: secMap, cuotaMap: map }
  }, [prestamos, cuotas])

  function montoReal(prestamo, cuota) {
    if (!cuota) return null
    return parseFloat(Number(prestamo.cuota_quincenal ?? cuota.monto_esperado).toFixed(2))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const hoy = dayjs().format('YYYY-MM')
  const totalPorColumna = columnas.map(col => {
    let total = 0
    prestamos.forEach(p => {
      const c = cuotaMap[p.id]?.[col.fecha]
      if (c) total += montoReal(p, c)
    })
    return total
  })

  return (
    <div className="space-y-3">
      {/* Tabla deslizable */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="text-xs border-collapse" style={{ minWidth: `${200 + columnas.length * 72}px` }}>
          <thead>
            {/* Fila de meses */}
            <tr>
              <th
                className="sticky left-0 z-20 text-left px-3 py-2 text-white text-xs font-semibold"
                style={{ backgroundColor: AZUL, width: 200, minWidth: 200 }}
              >
                Empleado
              </th>
              {columnas.map((col) => (
                col.esInicio ? (
                  <th
                    key={col.fecha}
                    colSpan={2}
                    className="text-center text-white font-semibold py-2 px-1 border-l border-white/20 uppercase tracking-wide"
                    style={{
                      backgroundColor: col.mes.format('YYYY-MM') === hoy ? '#2563eb' : AZUL,
                    }}
                  >
                    {col.mes.format('MMM YY')}
                  </th>
                ) : null
              ))}
            </tr>
            {/* Fila de días */}
            <tr>
              <th className="sticky left-0 z-20" style={{ backgroundColor: AZUL }} />
              {columnas.map(col => (
                <th
                  key={col.fecha}
                  className="text-center text-white/80 font-medium py-1.5 px-1 border-l border-white/10"
                  style={{ backgroundColor: AZUL, width: 72, minWidth: 72 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Object.entries(secciones).map(([seccion, filas]) => {
              const totalSecPorCol = columnas.map(col => {
                let t = 0
                filas.forEach(p => {
                  const c = cuotaMap[p.id]?.[col.fecha]
                  if (c) t += montoReal(p, c)
                })
                return t
              })

              return [
                /* Cabecera de sección */
                <tr key={`sec-${seccion}`}>
                  <td
                    colSpan={columnas.length + 1}
                    className="sticky left-0 px-3 py-1.5 font-semibold text-white text-[11px] tracking-wide"
                    style={{ backgroundColor: '#2d4a8a' }}
                  >
                    {seccion}
                  </td>
                </tr>,

                /* Filas de empleados */
                ...filas.map((p, rowIdx) => {
                  const nombre = [p.empleados?.nombre, p.empleados?.apellido].filter(Boolean).join(' ')
                  return (
                    <tr key={p.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td
                        className="sticky left-0 z-10 px-3 py-1.5 border-r border-gray-100 font-medium text-gray-700 truncate max-w-[200px]"
                        style={{ backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb' }}
                      >
                        <span className="text-gray-400 mr-1.5 text-[10px]">{p.rowNum}</span>
                        {nombre}
                      </td>
                      {columnas.map(col => {
                        const cuota = cuotaMap[p.id]?.[col.fecha]
                        const monto = montoReal(p, cuota)

                        if (!cuota) {
                          return (
                            <td key={col.fecha} className="border border-gray-100 text-center text-gray-200 py-1.5 px-1">
                              —
                            </td>
                          )
                        }

                        const hoyDate = dayjs().format('YYYY-MM-DD')
                        const esExceso   = cuota.estado === 'pagada' && Number(cuota.monto_pagado) > monto + 0.01
                        const esPagada   = cuota.estado === 'pagada' && !esExceso
                        const esParcial  = cuota.estado === 'parcial'
                        const esVencida  = cuota.estado === 'vencida' || (cuota.estado === 'pendiente' && col.fecha < hoyDate)
                        // pendiente futuro: sin color de alerta

                        const bgColor   = esExceso  ? '#ede9fe'
                                        : esPagada  ? '#dcfce7'
                                        : esParcial ? '#fef9c3'
                                        : esVencida ? '#fee2e2'
                                        : 'transparent'
                        const textColor = esExceso  ? '#5b21b6'
                                        : esPagada  ? '#166534'
                                        : esParcial ? '#92400e'
                                        : esVencida ? '#991b1b'
                                        : '#6b7280'

                        return (
                          <td
                            key={col.fecha}
                            className="border border-gray-100 text-center py-1.5 px-1"
                            style={{ backgroundColor: bgColor }}
                          >
                            {esPagada || esExceso ? (
                              <span className="flex items-center justify-center gap-0.5" style={{ color: textColor }}>
                                <CheckCircle2 size={11} />
                                <span className="text-[10px] font-medium">{formatDOP(monto).replace('RD$', '').trim()}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium" style={{ color: textColor }}>
                                {formatDOP(monto).replace('RD$', '').trim()}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                }),

                /* Subtotal de sección */
                <tr key={`subtotal-${seccion}`} className="border-t-2 border-gray-200">
                  <td
                    className="sticky left-0 z-10 px-3 py-1.5 font-bold text-[11px] border-r border-gray-200"
                    style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
                  >
                    Total {seccion}
                  </td>
                  {totalSecPorCol.map((t, i) => (
                    <td
                      key={i}
                      className="text-center py-1.5 px-1 font-bold border border-gray-100"
                      style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
                    >
                      {t > 0 ? formatDOP(t).replace('RD$', '').trim() : ''}
                    </td>
                  ))}
                </tr>,
              ]
            })}

            {/* Gran total */}
            <tr className="border-t-2 border-gray-300">
              <td
                className="sticky left-0 z-10 px-3 py-2 font-bold text-white text-[11px] border-r border-white/20"
                style={{ backgroundColor: AZUL }}
              >
                TOTAL GENERAL
              </td>
              {totalPorColumna.map((t, i) => (
                <td
                  key={i}
                  className="text-center py-2 px-1 font-bold text-white border border-white/10"
                  style={{ backgroundColor: AZUL }}
                >
                  {t > 0 ? formatDOP(t).replace('RD$', '').trim() : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
