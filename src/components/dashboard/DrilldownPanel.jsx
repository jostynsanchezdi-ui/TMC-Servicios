import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import CapitalDetalle from './drilldown/CapitalDetalle'
import CobradoDetalle from './drilldown/CobradoDetalle'
import PrestamosDetalle from './drilldown/PrestamosDetalle'
import CuotasDetalle from './drilldown/CuotasDetalle'
import SeccionDetalle from './drilldown/SeccionDetalle'

const META = {
  capital:   { title: 'Capital Total Activo',  Component: CapitalDetalle },
  cobrado:   { title: 'Total Cobrado',          Component: CobradoDetalle },
  prestamos: { title: 'Préstamos Activos',      Component: PrestamosDetalle },
  cuotas:    { title: 'Cuotas Pendientes',      Component: CuotasDetalle },
  seccion:   { title: null,                     Component: SeccionDetalle },
}

export default function DrilldownPanel({ type, nombre, stats, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const { title, Component } = META[type] ?? {}
  const panelTitle = type === 'seccion' ? nombre : title

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full sm:w-[500px] h-full bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{panelTitle}</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Component && <Component stats={stats} nombre={nombre} />}
        </div>
      </div>
    </div>
  )
}
