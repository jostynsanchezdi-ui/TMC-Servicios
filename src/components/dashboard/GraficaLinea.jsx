import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

export default function GraficaLinea({ pagos }) {
  const map = {}
  pagos.forEach((p) => {
    const mes = dayjs(p.fecha_pago).format('MMM YY')
    if (!map[mes]) map[mes] = { mes, cobrado: 0 }
    map[mes].cobrado += Number(p.monto)
  })
  const data = Object.values(map).slice(-12)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Flujo de Cobros Mensual</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => `RD$ ${v.toLocaleString()}`} />
          <Line type="monotone" dataKey="cobrado" stroke="#16a34a" strokeWidth={2} dot={false} name="Cobrado" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
