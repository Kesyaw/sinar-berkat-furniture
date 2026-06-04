import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/lib/cart-context"
import CartIcon from "@/components/CartIcon"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sinar Berkat Furniture - Pamulang",
  description: "Toko furniture terpercaya di Pamulang sejak 2006.",
}

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283125217199"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="id">
      <body className={inter.className} style={{backgroundColor: "#F0F7FA", color: "#1e3a4a"}}>
        <CartProvider>
          <nav className="sticky top-0 z-50 shadow-sm" style={{backgroundColor: "white", borderBottom: "1px solid #d0e8f0"}}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Sinar Berkat" width={40} height={40} className="rounded-full" />
                <div className="hidden sm:block">
                  <p className="font-bold text-sm leading-tight" style={{color: "#2A5F75"}}>Sinar Berkat</p>
                  <p className="text-xs leading-tight text-stone-400">Furniture Pamulang</p>
                </div>
              </a>
              <div className="flex items-center gap-2 sm:gap-4">
                <a href="/products" className="text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Produk</a>
                <a href="/#about" className="hidden sm:block text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Tentang Kami</a>
                <CartIcon />
                {user ? (
                  <>
                    <a href="/account/orders" className="text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Pesanan Saya</a>
                    <a href="/api/auth/logout" className="text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Keluar</a>
                  </>
                ) : (
                  <>
                    <a href="/login" className="text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Masuk</a>
                    <a href="/register" className="text-sm font-medium transition hover:opacity-70" style={{color: "#2A5F75"}}>Daftar</a>
                  </>
                )}
                <a href={"https://wa.me/" + WA} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-full text-sm font-medium transition hover:opacity-80" style={{backgroundColor: "#7FB5C8"}}>
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sm:hidden">WA</span>
                </a>
              </div>
            </div>
          </nav>
          {children}
          <footer className="text-stone-300 pt-12 pb-6 mt-16" style={{backgroundColor: "#1a3a4a"}}>
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Image src="/logo.png" alt="Sinar Berkat" width={36} height={36} className="rounded-full opacity-90" />
                    <p className="font-bold text-white text-lg">Sinar Berkat</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{color: "#94b8c8"}}>Toko furniture terpercaya di Pamulang sejak 2006.</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-3">Kontak</p>
                  <div className="space-y-2 text-sm" style={{color: "#94b8c8"}}>
                    <p>Jl. Raya Siliwangi No. 9 RT 002 RW 002</p>
                    <p>Pamulang, Tangerang Selatan</p>
                    <a href={"https://wa.me/" + WA} className="hover:underline block" style={{color: "#7FB5C8"}}>+62 831-2521-7199</a>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-white mb-3">Menu</p>
                  <div className="space-y-2 text-sm">
                    <a href="/products" className="block hover:text-white transition" style={{color: "#94b8c8"}}>Produk</a>
                    <a href="/#about" className="block hover:text-white transition" style={{color: "#94b8c8"}}>Tentang Kami</a>
                    <a href="/checkout" className="block hover:text-white transition" style={{color: "#94b8c8"}}>Pesan Sekarang</a>
                  </div>
                </div>
              </div>
              <div className="pt-4 text-center text-xs" style={{borderTop: "1px solid #2a5070", color: "#6a8a9a"}}>
                <p>2006 - 2026 Sinar Berkat Furniture. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  )
}