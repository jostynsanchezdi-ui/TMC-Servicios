import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDOP(amount) {
  if (amount === null || amount === undefined) return 'RD$ 0.00'
  return `RD$ ${Number(amount).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatFecha(fecha) {
  if (!fecha) return '—'
  return dayjs(fecha).format('DD/MM/YYYY')
}

export function formatFechaHora(fecha) {
  if (!fecha) return '—'
  return dayjs(fecha).format('DD/MM/YYYY HH:mm')
}

export function esFechaVencida(fecha) {
  return dayjs(fecha).isBefore(dayjs(), 'day')
}

export function diasParaVencer(fecha) {
  return dayjs(fecha).diff(dayjs(), 'day')
}

export function quincenaActual() {
  const hoy = dayjs()
  const dia = hoy.date()
  if (dia <= 15) {
    return hoy.date(15).format('YYYY-MM-DD')
  }
  return hoy.date(30).format('YYYY-MM-DD')
}

export function nombreCompleto(empleado) {
  if (!empleado) return ''
  return [empleado.nombre, empleado.apellido].filter(Boolean).join(' ')
}
