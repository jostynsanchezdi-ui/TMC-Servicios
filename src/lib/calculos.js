import dayjs from 'dayjs'

export function calcularPrestamo(montoOriginal, tasaMensual, fechaInicio, meses = 12) {
  const interesMensual = montoOriginal * tasaMensual
  const abonoCapital = montoOriginal / meses
  const cuotaMensual = interesMensual + abonoCapital
  const cuotaQuincenal = cuotaMensual / 2
  const totalCuotas = meses * 2
  const totalPagar = cuotaQuincenal * totalCuotas
  const totalIntereses = interesMensual * meses

  return {
    montoOriginal,
    tasaMensual,
    meses,
    totalCuotas,
    interesMensual,
    abonoCapital,
    cuotaMensual,
    cuotaQuincenal,
    totalPagar,
    totalIntereses,
  }
}

export function generarCuotas(montoOriginal, tasaMensual, fechaInicio, meses = 12) {
  const { cuotaQuincenal, totalCuotas } = calcularPrestamo(montoOriginal, tasaMensual, fechaInicio, meses)
  const cuotas = []
  let fecha = dayjs(fechaInicio)

  if (fecha.date() <= 15) {
    fecha = fecha.date(15)
  } else {
    fecha = fecha.date(30)
  }

  for (let i = 1; i <= totalCuotas; i++) {
    cuotas.push({
      numero_cuota: i,
      fecha_vencimiento: fecha.format('YYYY-MM-DD'),
      monto_esperado: cuotaQuincenal,
      monto_pagado: 0,
      estado: 'pendiente',
    })

    if (fecha.date() === 15) {
      fecha = fecha.date(30)
    } else {
      fecha = fecha.add(1, 'month').date(15)
    }
  }

  return cuotas
}

export function generarTablaAmortizacion(montoOriginal, tasaMensual, fechaInicio, meses = 12) {
  const { cuotaQuincenal, interesMensual, abonoCapital } = calcularPrestamo(
    montoOriginal, tasaMensual, fechaInicio, meses
  )
  const interesQuincenal = interesMensual / 2
  const abonoCapitalQuincenal = abonoCapital / 2
  const cuotas = generarCuotas(montoOriginal, tasaMensual, fechaInicio, meses)

  let saldo = montoOriginal

  return cuotas.map((cuota) => {
    saldo -= abonoCapitalQuincenal
    return {
      ...cuota,
      interes: interesQuincenal,
      abono_capital: abonoCapitalQuincenal,
      cuota: cuotaQuincenal,
      saldo: Math.max(0, saldo),
    }
  })
}

export function calcularScore(cuotas) {
  if (!cuotas || cuotas.length === 0) return null

  const vencidas = cuotas.filter((c) => c.estado === 'vencida').length
  const total = cuotas.filter((c) => c.estado !== 'pendiente').length

  if (total === 0) return null

  const tasaMorosidad = vencidas / total

  if (tasaMorosidad === 0) return 3
  if (tasaMorosidad <= 0.2) return 2
  return 1
}

export function tasaSugeridaPorScore(score) {
  if (score === 3) return { min: 3, max: 4 }
  if (score === 2) return { min: 5, max: 6 }
  return { min: 7, max: 8 }
}
