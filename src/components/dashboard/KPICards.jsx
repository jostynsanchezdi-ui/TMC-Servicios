import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { formatDOP, formatFecha } from '@/lib/utils'
import {
  Banknote, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight,
  CalendarCheck, CalendarClock, Percent, Layers, DollarSign
} from 'lucide-react'
import QuincenaSelector, { quincenaDates, quincenaLabel, defaultQuincena } from '@/components/common/QuincenaSelector'

const SVG_PATTERN = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23ffffff' fill-opacity='0.07'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23ffffff' fill-opacity='0.07'/%3E%3Ccircle cx='40' cy='0' r='1.5' fill='%23ffffff' fill-opacity='0.07'/%3E%3Ccircle cx='0' cy='40' r='1.5' fill='%23ffffff' fill-opacity='0.07'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23ffffff' fill-opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`

function FeaturedCard({ label, value, sub, onClick }) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden flex flex-col justify-between min-h-[140px]"
      style={{ backgroundColor: '#1e356f', backgroundImage: SVG_PATTERN }}
    >
      <div className="flex items-start justify-between">
        <div className="bg-white/10 rounded-xl p-2.5">
          <Banknote size={18} className="text-white" />
        </div>
        {onClick && (
          <button onClick={onClick} className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors">
            <ArrowUpRight size={15} className="text-white/80" />
          </button>
        )}
      </div>
      <div className="mt-3">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-2xl font-bold mt-1 leading-none">{value}</p>
        {sub && <p className="text-blue-300 text-xs mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, sub2, iconBg, iconColor, onClick, delta, deltaLabel }) {
  const positive = delta >= 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className={`${iconBg} rounded-xl p-2.5`}>
          <Icon size={16} className={iconColor} />
        </div>
        {onClick && (
          <button onClick={onClick} className="bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors">
            <ArrowUpRight size={15} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
        {delta !== null && delta !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-gray-900 text-xl font-bold mt-1 leading-none">{value}</p>
        {sub && <p className="text-gray-400 text-xs mt-1.5">{sub}</p>}
        {sub2 && <p className="text-gray-400 text-xs mt-0.5">{sub2}</p>}
        {deltaLabel && <p className="text-gray-400 text-xs mt-0.5">{deltaLabel}</p>}
      </div>
    </div>
  )
}

// ── Capital Restante Card ─────────────────────────────────────
function CapitalRestanteCard({ prestamos, pagos }) {
  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf] = useState(dq.half)

  const { valor, proyectado } = useMemo(() => {
    const { hasta } = quincenaDates(month, half)
    const esFuturo = dayjs(hasta).isAfter(dayjs(), 'day')
    const activos = prestamos.filter(p => p.estado === 'activo')
    const total = activos.reduce((s, p) => {
      const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
      const tasa = Number(p.tasa_mensual)
      const denom = tasa + 1 / meses
      const ratio = denom > 0 ? tasa / denom : 0.5
      const capitalPagado = pagos
        .filter(pg => pg.prestamo_id === p.id && (pg.fecha_pago || '').slice(0, 10) <= hasta)
        .reduce((ss, pg) => ss + Number(pg.monto) * (1 - ratio), 0)
      return s + Math.max(0, Number(p.monto_original) - capitalPagado)
    }, 0)
    return { valor: total, proyectado: esFuturo }
  }, [month, half, prestamos, pagos])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className="bg-violet-50 rounded-xl p-2.5">
          <CreditCard size={16} className="text-violet-500" />
        </div>
        {proyectado && (
          <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full self-start">
            Proy.
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Capital Restante</p>
        <p className="text-gray-900 text-xl font-bold mt-1 leading-none">{formatDOP(valor)}</p>
        <p className="text-gray-400 text-xs mt-1 capitalize">{quincenaLabel(month, half)}</p>
        <QuincenaSelector month={month} half={half} onChange={(m, h) => { setMonth(m); setHalf(h) }} showFullMonth />
      </div>
    </div>
  )
}

// ── Tasa Promedio Card ────────────────────────────────────────
function TasaPromedioCard({ prestamos, cuotas }) {
  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf] = useState(dq.half)

  const { valor, cuotasPendientes, proyectado } = useMemo(() => {
    const { desde, hasta } = quincenaDates(month, half)
    const esFuturo = dayjs(hasta).isAfter(dayjs(), 'day')
    const idsEnPeriodo = new Set(
      cuotas
        .filter(c => c.fecha_vencimiento >= desde && c.fecha_vencimiento <= hasta && c.estado !== 'cancelada')
        .map(c => c.prestamo_id)
    )
    const loansEnPeriodo = prestamos.filter(p => idsEnPeriodo.has(p.id))
    const tasa = loansEnPeriodo.length
      ? loansEnPeriodo.reduce((s, p) => s + Number(p.tasa_mensual), 0) / loansEnPeriodo.length
      : 0
    const pendientes = cuotas.filter(c =>
      c.fecha_vencimiento >= desde && c.fecha_vencimiento <= hasta &&
      (c.estado === 'pendiente' || c.estado === 'parcial')
    ).length
    return { valor: tasa, cuotasPendientes: pendientes, proyectado: esFuturo }
  }, [month, half, prestamos, cuotas])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className="bg-rose-50 rounded-xl p-2.5">
          <Percent size={16} className="text-rose-500" />
        </div>
        {proyectado && (
          <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full self-start">
            Proy.
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Tasa Promedio Mensual</p>
        <p className="text-gray-900 text-xl font-bold mt-1 leading-none">{(valor * 100).toFixed(2)}%</p>
        <p className="text-gray-400 text-xs mt-1">{cuotasPendientes} cuotas pendientes · <span className="capitalize">{quincenaLabel(month, half)}</span></p>
        <QuincenaSelector month={month} half={half} onChange={(m, h) => { setMonth(m); setHalf(h) }} showFullMonth />
      </div>
    </div>
  )
}

// ── Tasa de Retorno Card ──────────────────────────────────────
function TasaRetornoCard({ prestamos, cuotas, pagos, statsRetorno }) {
  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf] = useState(dq.half)

  const { valor, interesEsperado, proyectado } = useMemo(() => {
    const { desde, hasta } = quincenaDates(month, half)
    const esFuturo = dayjs(hasta).isAfter(dayjs(), 'day')
    const activos = prestamos.filter(p => p.estado === 'activo')

    const ratioMap = {}
    activos.forEach(p => {
      const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
      const tasa = Number(p.tasa_mensual)
      const denom = tasa + 1 / meses
      ratioMap[p.id] = denom > 0 ? tasa / denom : 0.5
    })

    const capitalRestante = activos.reduce((s, p) => {
      const ratio = ratioMap[p.id] ?? 0.5
      const capitalPagado = pagos
        .filter(pg => pg.prestamo_id === p.id && (pg.fecha_pago || '').slice(0, 10) <= hasta)
        .reduce((ss, pg) => ss + Number(pg.monto) * (1 - ratio), 0)
      return s + Math.max(0, Number(p.monto_original) - capitalPagado)
    }, 0)

    const activosIds = new Set(activos.map(p => p.id))
    const interes = cuotas
      .filter(c => c.fecha_vencimiento >= desde && c.fecha_vencimiento <= hasta && c.estado !== 'cancelada' && activosIds.has(c.prestamo_id))
      .reduce((s, c) => s + Number(c.monto_esperado) * (ratioMap[c.prestamo_id] ?? 0), 0)

    const tasa = capitalRestante > 0 ? (interes / capitalRestante) * 100 : 0
    return { valor: tasa, interesEsperado: interes, proyectado: esFuturo }
  }, [month, half, prestamos, cuotas, pagos])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className="bg-green-50 rounded-xl p-2.5">
          <TrendingUp size={16} className="text-green-600" />
        </div>
        {proyectado && (
          <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full self-start">
            Proy.
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Tasa de Retorno</p>
        <p className="text-gray-900 text-xl font-bold mt-1 leading-none">{valor.toFixed(2)}%</p>
        <p className="text-gray-400 text-xs mt-1"><span className="capitalize">{quincenaLabel(month, half)}</span> · {formatDOP(interesEsperado)} interés</p>
        <QuincenaSelector month={month} half={half} onChange={(m, h) => { setMonth(m); setHalf(h) }} showFullMonth />
      </div>
    </div>
  )
}

// ── Ganancias Netas Card ──────────────────────────────────────
function GananciasNetasCard({ cuotas, prestamos }) {
  const dq = defaultQuincena()
  const [month, setMonth] = useState(dq.month)
  const [half, setHalf] = useState(dq.half)

  const ratioMap = useMemo(() => {
    const m = {}
    prestamos.forEach(p => {
      const meses = dayjs(p.fecha_fin).diff(dayjs(p.fecha_inicio), 'month') || 12
      const tasa = Number(p.tasa_mensual)
      const denom = tasa + 1 / meses
      m[p.id] = denom > 0 ? tasa / denom : 0.5
    })
    return m
  }, [prestamos])

  const { ganancia, proyectado } = useMemo(() => {
    const { desde, hasta } = quincenaDates(month, half)
    const esFuturo = dayjs(hasta).isAfter(dayjs(), 'day')
    const total = cuotas
      .filter(c => c.fecha_vencimiento >= desde && c.fecha_vencimiento <= hasta && c.estado !== 'cancelada')
      .reduce((s, c) => s + Number(c.monto_esperado) * (ratioMap[c.prestamo_id] ?? 0), 0)
    return { ganancia: total, proyectado: esFuturo }
  }, [month, half, cuotas, ratioMap])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className="bg-emerald-50 rounded-xl p-2.5">
          <DollarSign size={16} className="text-emerald-600" />
        </div>
        {proyectado && (
          <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full self-start">
            Proy.
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Ganancias Netas</p>
        <p className="text-gray-900 text-xl font-bold mt-1 leading-none">{formatDOP(ganancia)}</p>
        <p className="text-gray-400 text-xs mt-1 capitalize">{quincenaLabel(month, half)}</p>
        <QuincenaSelector month={month} half={half} onChange={(m, h) => { setMonth(m); setHalf(h) }} showFullMonth />
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function KPICards({ stats, onCardClick }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1 — Capital total activo */}
      <FeaturedCard
        label="Capital Total Activo"
        value={formatDOP(stats.capitalActivo)}
        sub={`${stats.prestamosActivos} préstamos activos`}
        onClick={() => onCardClick('capital')}
      />

      {/* 2 — Total próxima quincena */}
      <StatCard
        icon={CalendarClock}
        label="Total Próxima Quincena"
        value={formatDOP(stats.totalProximaQuincena)}
        sub={formatFecha(stats.fechaProxima)}
        iconBg="bg-teal-50"
        iconColor="text-teal-600"
      />

      {/* 3 — Total quincena anterior */}
      <StatCard
        icon={CalendarCheck}
        label="Total Quincena Anterior"
        value={formatDOP(stats.totalQuincenaAnterior)}
        sub={formatFecha(stats.fechaAnterior)}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-500"
      />

      {/* 4 — Capital restante */}
      <CapitalRestanteCard prestamos={stats.prestamos} pagos={stats.pagos} />

      {/* 5 — Ganancias netas */}
      <GananciasNetasCard cuotas={stats.cuotas} prestamos={stats.prestamos} />

      {/* 6 — Tasa promedio mensual + cuotas pendientes */}
      <TasaPromedioCard prestamos={stats.prestamos} cuotas={stats.cuotas} />

      {/* 7 — Total capital + interés esperado */}
      <StatCard
        icon={Layers}
        label="Capital + Interés Esperado"
        value={formatDOP(stats.totalCapitalInteres)}
        sub="Flujo total activo"
        iconBg="bg-blue-50"
        iconColor="text-blue-500"
      />

      {/* 8 — Tasa de retorno */}
      <TasaRetornoCard prestamos={stats.prestamos} cuotas={stats.cuotas} pagos={stats.pagos} />
    </div>
  )
}
