import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function quincenaDates(month, half) {
  const isFebruary = month.month() === 1
  const endDay = isFebruary ? month.endOf('month').date() : 30
  if (half === 0) {
    return {
      desde: month.date(1).format('YYYY-MM-DD'),
      hasta: month.date(endDay).format('YYYY-MM-DD'),
    }
  }
  if (half === 1) {
    return {
      desde: month.date(1).format('YYYY-MM-DD'),
      hasta: month.date(15).format('YYYY-MM-DD'),
    }
  }
  return {
    desde: month.date(16).format('YYYY-MM-DD'),
    hasta: month.date(endDay).format('YYYY-MM-DD'),
  }
}

export function quincenaLabel(month, half) {
  const isFebruary = month.month() === 1
  const endDay = isFebruary ? month.endOf('month').date() : 30
  if (half === 0) return month.format('MMM YYYY')
  const halfStr = half === 1 ? '1–15' : `16–${endDay}`
  return `${halfStr} ${month.format('MMM YYYY')}`
}

export function defaultQuincena() {
  const hoy = dayjs()
  return { month: hoy.startOf('month'), half: hoy.date() <= 15 ? 1 : 2 }
}

export default function QuincenaSelector({ month, half, onChange, showFullMonth = false }) {
  const isFebruary = month.month() === 1
  const endDay = isFebruary ? month.endOf('month').date() : 30

  return (
    <div className="space-y-1 mt-1">
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => onChange(month.subtract(1, 'month'), half)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={14} className="text-gray-500" />
        </button>
        <span className="text-[10px] text-gray-500 text-center capitalize leading-tight">
          {month.format('MMM YYYY')}
        </span>
        <button
          onClick={() => onChange(month.add(1, 'month'), half)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={14} className="text-gray-500" />
        </button>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(month, 1)}
          className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors ${
            half === 1 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          1 – 15
        </button>
        <button
          onClick={() => onChange(month, 2)}
          className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors ${
            half === 2 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          16 – {endDay}
        </button>
        {showFullMonth && (
          <button
            onClick={() => onChange(month, 0)}
            className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors ${
              half === 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Mes
          </button>
        )}
      </div>
    </div>
  )
}
