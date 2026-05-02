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
    fecha = fecha.endOf('month')
  }

  for (let i = 1; i <= totalCuotas; i++) {
    cuotas.push({
      numero_cuota: i,
      fecha_vencimiento: fecha.format('YYYY-MM-DD'),
      monto_esperado: cuotaQuincenal,
      monto_pagado: 0,
      estado: 'pendiente',
    })

    if (fecha.date() <= 15) {
      fecha = fecha.endOf('month')
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
