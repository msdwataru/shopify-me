'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardShell({
  email,
  children,
}: {
  email?: string
  children: React.ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar open={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={email} onMenuClick={() => setMobileNavOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
