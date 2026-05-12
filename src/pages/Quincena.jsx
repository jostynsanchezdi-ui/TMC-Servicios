import { useState } from 'react'
import { LayoutList, Table2 } from 'lucide-react'
import PanelQuincena from '@/components/pagos/PanelQuincena'
import TablaQuincenas from '@/components/pagos/TablaQuincenas'

export default function Quincena() {
  const [vista, setVista] = useState('lista')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Quincena</h1>
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              vista === 'lista'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList size={13} />
            Lista
          </button>
          <button
            onClick={() => setVista('tabla')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              vista === 'tabla'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table2 size={13} />
            Tabla
          </button>
        </div>
      </div>

      {vista === 'lista' ? <PanelQuincena /> : <TablaQuincenas />}
    </div>
  )
}
