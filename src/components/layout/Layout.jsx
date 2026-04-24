import { useState, useRef, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  const handleScroll = useCallback((e) => {
    const currentY = e.target.scrollTop
    if (currentY < 10) {
      setHeaderVisible(true)
    } else if (currentY > lastScrollY.current) {
      setHeaderVisible(false)
    } else {
      setHeaderVisible(true)
    }
    lastScrollY.current = currentY
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#d4dce4' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          style={{
            height: headerVisible ? '3rem' : '0px',
            overflow: 'hidden',
            transition: 'height 0.25s ease',
            flexShrink: 0,
          }}
        >
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" onScroll={handleScroll}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
