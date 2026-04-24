import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import { formatDOP, formatFecha } from './utils'

const EMPRESA = 'TMC Servicios'
const COLOR_PRIMARIO = [22, 163, 74] // verde

function encabezado(doc, titulo) {
  doc.setFontSize(16)
  doc.setTextColor(...COLOR_PRIMARIO)
  doc.text(EMPRESA, 14, 16)
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text(titulo, 14, 24)
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 30)
  doc.setDrawColor(...COLOR_PRIMARIO)
  doc.line(14, 33, 196, 33)
}

export function pdfTablaAmortizacion(prestamo, empleado, cuotas) {
  const doc = new jsPDF()
  encabezado(doc, `Tabla de Amortización — ${empleado.nombre} ${empleado.apellido}`)

  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.text(`Monto: ${formatDOP(prestamo.monto_original)}`, 14, 40)
  doc.text(`Tasa: ${(prestamo.tasa_mensual * 100).toFixed(1)}% mensual`, 80, 40)
  doc.text(`Inicio: ${formatFecha(prestamo.fecha_inicio)}`, 150, 40)

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Vencimiento', 'Capital', 'Interés', 'Cuota', 'Saldo', 'Estado']],
    body: cuotas.map((c) => [
      c.numero_cuota,
      formatFecha(c.fecha_vencimiento),
      formatDOP(c.abono_capital),
      formatDOP(c.interes),
      formatDOP(c.monto_esperado),
      formatDOP(c.saldo),
      c.estado,
    ]),
    headStyles: { fillColor: COLOR_PRIMARIO },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    styles: { fontSize: 8 },
  })

  doc.save(`amortizacion_${empleado.apellido}_${dayjs().format('YYYYMMDD')}.pdf`)
}

export function pdfResumenGeneral(kpis, prestamos, cuotas = []) {
  const doc = new jsPDF()
  encabezado(doc, 'Resumen General del Negocio')

  // KPI strip
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  const kpiTexts = [
    `Capital activo: ${formatDOP(kpis.capitalActivo)}`,
    `Total cobrado: ${formatDOP(kpis.totalCobrado)}`,
    `Intereses generados: ${formatDOP(kpis.interesesGenerados)}`,
    `Préstamos activos: ${kpis.prestamosActivos}`,
  ]
  kpiTexts.forEach((t, i) => doc.text(t, 14, 40 + i * 7))

  // Build cuotas map: prestamo_id → { total, pagadas }
  const cuotasMap = {}
  cuotas.forEach(c => {
    if (!cuotasMap[c.prestamo_id]) cuotasMap[c.prestamo_id] = { total: 0, pagadas: 0 }
    cuotasMap[c.prestamo_id].total++
    if (c.estado === 'pagada') cuotasMap[c.prestamo_id].pagadas++
  })

  // Group prestamos by section
  const porSeccion = {}
  prestamos.forEach(p => {
    const sec = p.empleados?.secciones?.nombre || 'Sin Sección'
    if (!porSeccion[sec]) porSeccion[sec] = []
    porSeccion[sec].push(p)
  })

  const dataRow = (p) => {
    const cm = cuotasMap[p.id] || { total: 0, pagadas: 0 }
    return [
      '',
      `${p.empleados?.nombre} ${p.empleados?.apellido}`,
      formatDOP(p.monto_original),
      `${(p.tasa_mensual * 100).toFixed(1)}%`,
      formatFecha(p.fecha_inicio),
      formatFecha(p.fecha_fin),
      p.estado,
      `${cm.pagadas}/${cm.total}`,
    ]
  }

  const TABLE_OPTS = (body, nonDataRows) => ({
    head: [['', 'Empleado', 'Monto', 'Tasa', 'Inicio', 'Fin', 'Estado', 'Cuotas']],
    body,
    headStyles: { fillColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    styles: { fontSize: 10, overflow: 'ellipsize' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && !nonDataRows.has(data.row.index)) {
        const x = data.cell.x + (data.cell.width - 4) / 2
        const y = data.cell.y + (data.cell.height - 4) / 2
        doc.setDrawColor(130, 130, 130)
        doc.setLineWidth(0.35)
        doc.rect(x, y, 4, 4)
      }
    },
  })

  // ── Página 1: Activos ──────────────────────────────────────────────────────
  const bodyActivos = []
  const nonDataActivos = new Set()

  Object.entries(porSeccion).forEach(([seccion, secPrestamos]) => {
    const activos = secPrestamos.filter(p => p.estado === 'activo')
    if (activos.length === 0) return

    nonDataActivos.add(bodyActivos.length)
    bodyActivos.push([{
      content: seccion.toUpperCase(),
      colSpan: 8,
      styles: { fillColor: COLOR_PRIMARIO, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    }])

    activos.forEach(p => bodyActivos.push(dataRow(p)))

    const capital = activos.reduce((s, p) => s + Number(p.monto_original), 0)
    nonDataActivos.add(bodyActivos.length)
    bodyActivos.push([
      { content: `Subtotal ${seccion}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45] } },
      { content: formatDOP(capital), styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45], halign: 'right' } },
      { content: '', colSpan: 4, styles: { fillColor: [236, 253, 245] } },
      { content: `${activos.length} préstamo${activos.length !== 1 ? 's' : ''}`, styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45], halign: 'center' } },
    ])
  })

  if (bodyActivos.length > 0) {
    autoTable(doc, { startY: 72, ...TABLE_OPTS(bodyActivos, nonDataActivos) })
  }

  // ── Página 2: Finalizados ──────────────────────────────────────────────────
  const bodyFinalizados = []
  const nonDataFinalizados = new Set()

  Object.entries(porSeccion).forEach(([seccion, secPrestamos]) => {
    const finalizados = secPrestamos.filter(p => p.estado !== 'activo')
    if (finalizados.length === 0) return

    nonDataFinalizados.add(bodyFinalizados.length)
    bodyFinalizados.push([{
      content: seccion.toUpperCase(),
      colSpan: 8,
      styles: { fillColor: [75, 85, 99], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    }])

    finalizados.forEach(p => bodyFinalizados.push(dataRow(p)))

    const capital = finalizados.reduce((s, p) => s + Number(p.monto_original), 0)
    nonDataFinalizados.add(bodyFinalizados.length)
    bodyFinalizados.push([
      { content: `Subtotal ${seccion}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [75, 85, 99] } },
      { content: formatDOP(capital), styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [75, 85, 99], halign: 'right' } },
      { content: '', colSpan: 4, styles: { fillColor: [249, 250, 251] } },
      { content: `${finalizados.length} préstamo${finalizados.length !== 1 ? 's' : ''}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [75, 85, 99], halign: 'center' } },
    ])
  })

  if (bodyFinalizados.length > 0) {
    doc.addPage()
    encabezado(doc, 'Resumen General del Negocio — Préstamos Finalizados')
    autoTable(doc, { startY: 38, ...TABLE_OPTS(bodyFinalizados, nonDataFinalizados) })
  }

  doc.save(`resumen_general_${dayjs().format('YYYYMMDD_HHmm')}.pdf`)
}

export function pdfQuincena(cuotas, fechaCorte) {
  const doc = new jsPDF()
  encabezado(doc, `Panel de Quincena — ${formatFecha(fechaCorte)}`)

  // Group by section
  const porSeccion = {}
  cuotas.forEach(c => {
    const sec = c.prestamos?.empleados?.secciones?.nombre || 'Sin Sección'
    if (!porSeccion[sec]) porSeccion[sec] = []
    porSeccion[sec].push(c)
  })

  const body = []
  const nonDataRows = new Set() // section headers + totals — no checkbox drawn here

  Object.entries(porSeccion).forEach(([seccion, secCuotas]) => {
    // Section header
    nonDataRows.add(body.length)
    body.push([{
      content: seccion.toUpperCase(),
      colSpan: 6,
      styles: { fillColor: COLOR_PRIMARIO, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    }])

    secCuotas.forEach(c => {
      body.push([
        '',
        `${c.prestamos?.empleados?.nombre} ${c.prestamos?.empleados?.apellido}`,
        formatDOP(c.prestamos?.monto_original),
        formatDOP(c.monto_esperado),
        formatDOP(c.monto_pagado || 0),
        c.estado,
      ])
    })

    // Section subtotal
    const secEsperado = secCuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)
    const secCobrado = secCuotas.reduce((s, c) => s + Number(c.monto_pagado || 0), 0)
    nonDataRows.add(body.length)
    body.push([
      { content: `Subtotal ${seccion}`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45] } },
      { content: formatDOP(secEsperado), styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45] } },
      { content: formatDOP(secCobrado), styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45] } },
      { content: `${secCuotas.filter(c => c.estado === 'pagada').length}/${secCuotas.length}`, styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [20, 83, 45] } },
    ])
  })

  autoTable(doc, {
    startY: 38,
    head: [['', 'Empleado', 'Préstamo', 'Cuota Esperada', 'Pagado', 'Estado']],
    body,
    headStyles: { fillColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    styles: { fontSize: 10, overflow: 'ellipsize', cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && !nonDataRows.has(data.row.index)) {
        const x = data.cell.x + (data.cell.width - 4) / 2
        const y = data.cell.y + (data.cell.height - 4) / 2
        doc.setDrawColor(130, 130, 130)
        doc.setLineWidth(0.35)
        doc.rect(x, y, 4, 4)
      }
    },
  })

  // Grand total
  const totalEsperado = cuotas.reduce((s, c) => s + Number(c.monto_esperado), 0)
  const totalCobrado = cuotas.reduce((s, c) => s + Number(c.monto_pagado || 0), 0)
  const finalY = (doc.lastAutoTable?.finalY || 38) + 6
  doc.setFontSize(9)
  doc.setTextColor(40, 40, 40)
  doc.setFont(undefined, 'bold')
  doc.text(`Total esperado: ${formatDOP(totalEsperado)}     Total cobrado: ${formatDOP(totalCobrado)}     Cuotas: ${cuotas.length}`, 14, finalY)

  doc.save(`quincena_${dayjs(fechaCorte).format('YYYYMMDD')}.pdf`)
}
