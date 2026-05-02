export default function SelectorMeses({ value, onChange }) {
  function adjust(delta) {
    const next = Math.max(1, (value || 1) + delta)
    onChange(next)
  }

  function handleChange(e) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v) && v > 0) onChange(v)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => adjust(-1)}
        className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 flex items-center justify-center text-lg font-bold"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={36}
        value={value}
        onChange={handleChange}
        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        type="button"
        onClick={() => adjust(1)}
        className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 flex items-center justify-center text-lg font-bold"
      >
        +
      </button>
      <span className="text-sm text-gray-500">
        {value === 1 ? 'mes' : 'meses'} = <strong className="text-gray-700">{value * 2}</strong> cuotas quincenales
      </span>
    </div>
  )
}
