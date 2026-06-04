'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: 'Profil Saya', href: '/account/profile' },
    { name: 'Pesanan Saya', href: '/account/orders' },
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-1 shadow-sm">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-3 mb-2">Pengaturan Akun</p>
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <button
                  key={tab.href}
                  onClick={() => router.push(tab.href)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-stone-800 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {tab.name}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Page Content */}
        <section className="flex-1">
          {children}
        </section>
      </div>
    </main>
  )
}
