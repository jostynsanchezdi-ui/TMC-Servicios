import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'
import { RefreshCw } from 'lucide-react'
import KPICards from '@/components/dashboard/KPICards'
import GraficaBarras from '@/components/dashboard/GraficaBarras'
import AlertasPanel from '@/components/dashboard/AlertasPanel'
import PrestamosRecientes from '@/components/dashboard/PrestamosRecientes'
import ResumenSecciones from '@/components/dashboard/ResumenSecciones'
import DrilldownPanel from '@/components/dashboard/DrilldownPanel'

function getQuincenaDates() {
  const hoy = dayjs()
  const dia = hoy.date()
  const finMes = hoy.endOf('month').date()
  const ultimoDia = finMes

  let proxima, anterior

  if (dia < 15) {
    proxima = hoy.date(15).format('YYYY-MM-DD')
    const mesAnt = hoy.subtract(1, 'month')
    anterior = mesAnt.endOf('month').format('YYYY-MM-DD')
  } else if (dia < ultimoDia) {
    proxima = hoy.date(ultimoDia).format('YYYY-MM-DD')
    anterior = hoy.date(15).format('YYYY-MM-DD')
  } else {
    proxima = hoy.add(1, 'month').date(15).format('YYYY-MM-DD')
    anterior = hoy.date(ultimoDia).format('YYYY-MM-DD')
  }

  return { proxima, anterior }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [drilldown, setDrilldown] = useState(null)

  const cargarStats = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setRefreshing(true)
    try {
      const [{ data: prestamos }, { data: cuotas }, { data: pagos }] = await Promise.all([
        supabase.from('prestamos').select('*, empleados(secciones(nombre), nombre, apellido)'),
        supabase.from('cuotas').select('*'),
        supabase.from('pagos').select('monto, fecha_pago, prestamo_id'),
      ])

      const activos = prestamos?.filter(p => p.estado === 'activo') || []
      const allCuotas = cuotas || []
      const allPagos = pagos || []

      // existing
      const capitalActivo = activos.reduce((s, p) => s + Number(p.monto_original), 0)
      const totalCobrado = allPagos.reduce((s, p) => s + Number(p.monto), 0)
      const cuotasPendientes = allCuotas.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length

      // quincena dates
      const { proxima, anterior } = getQuincenaDates()

      const totalProximaQuincena = allCuotas
        .filter(c => c.fecha_vencimiento === proxima && (c.estado === 'pendiente' || c.estado === 'parcial'))
        .reduce((s, c) => s + Number(c.monto_esperado) - Number(c.monto_pagado || 0), 0)

      const totalQuincenaAnterior = allCuotas
        .filter(c => c.fecha_vencimiento === anterior)
        .reduce((s, c) => s + Number(c.monto_esperado), 0)

      // tasa promedio mensual de préstamos activos
      const tasaPromedio = activos.length
        ? activos.reduce((s, p) => s + Number(p.tasa_mensual), 0) / activos.length
        : 0

      // ratio de interés por préstamo = tasa / (tasa + 1/meses)
      const ratioMap = {}
      ;(prestamos || []).forEach(p => {
        const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
        const tasa = Number(p.tasa_mensual)
        const denom = tasa + 1 / meses
        ratioMap[p.id] = denom > 0 ? tasa / denom : 0.5
      })

      // capital restante: capital original menos lo abonado a capital en cada préstamo activo
      const capitalRestante = activos.reduce((s, p) => {
        const ratio = ratioMap[p.id] ?? 0.5
        const capitalPagado = allPagos
          .filter(pg => pg.prestamo_id === p.id)
          .reduce((ss, pg) => ss + Number(pg.monto) * (1 - ratio), 0)
        return s + Math.max(0, Number(p.monto_original) - capitalPagado)
      }, 0)

      const hoy = dayjs()
      const inicioMesActual = hoy.startOf('month').format('YYYY-MM-DD')
      const finMesActual = hoy.endOf('month').format('YYYY-MM-DD')
      const inicioMesPasado = hoy.subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
      const finMesPasado = hoy.subtract(1, 'month').endOf('month').format('YYYY-MM-DD')

      // interés esperado: cuotas que vencen en el mes × ratio de interés (solo préstamos activos)
      const activosIds = new Set(activos.map(p => p.id))
      const calcInterésEsperado = (desde, hasta) =>
        allCuotas
          .filter(c =>
            c.fecha_vencimiento >= desde &&
            c.fecha_vencimiento <= hasta &&
            c.estado !== 'cancelada' &&
            activosIds.has(c.prestamo_id)
          )
          .reduce((s, c) => s + Number(c.monto_esperado) * (ratioMap[c.prestamo_id] ?? 0), 0)

      const interésMesActual = calcInterésEsperado(inicioMesActual, finMesActual)
      const interésMesPasado = calcInterésEsperado(inicioMesPasado, finMesPasado)

      // tasa de retorno: interés esperado este mes / capital restante
      const tasaRetorno = capitalRestante > 0 ? (interésMesActual / capitalRestante) * 100 : 0
      const tasaRetornoMesPasado = capitalRestante > 0 ? (interésMesPasado / capitalRestante) * 100 : 0
      const deltaRetorno = tasaRetornoMesPasado > 0 ? tasaRetorno - tasaRetornoMesPasado : null

      // total capital + interés esperado = suma de todas las cuotas de préstamos activos
      const totalCapitalInteres = allCuotas
        .filter(c => activosIds.has(c.prestamo_id))
        .reduce((s, c) => s + Number(c.monto_esperado), 0)

      setStats({
        capitalActivo,
        totalProximaQuincena,
        totalQuincenaAnterior,
        prestamosActivos: activos.length,
        cuotasPendientes,
        tasaPromedio,
        capitalRestante,
        tasaRetorno,
        interésMesActual,
        deltaRetorno,
        totalCapitalInteres,
        totalCobrado,
        fechaProxima: proxima,
        fechaAnterior: anterior,
        prestamos: prestamos || [],
        cuotas: allCuotas,
        pagos: allPagos,
      })
      if (!silencioso) setLoading(false)
      else setRefreshing(false)
    } catch {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { cargarStats() }, [cargarStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Resumen general del portafolio de préstamos</p>
        </div>
        <button
          onClick={() => cargarStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <KPICards stats={stats} onCardClick={(type) => setDrilldown({ type })} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GraficaBarras
            prestamos={stats.prestamos}
            onBarClick={(nombre) => setDrilldown({ type: 'seccion', nombre })}
          />
        </div>
        <div className="lg:col-span-1">
          <AlertasPanel cuotas={stats.cuotas} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PrestamosRecientes prestamos={stats.prestamos} />
        </div>
        <div className="lg:col-span-1">
          <ResumenSecciones prestamos={stats.prestamos} />
        </div>
      </div>

      {drilldown && (
        <DrilldownPanel
          type={drilldown.type}
          nombre={drilldown.nombre}
          stats={stats}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  )
}
