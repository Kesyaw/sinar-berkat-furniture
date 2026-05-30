import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sinar Berkat Furniture",
  description: "Furniture berkualitas untuk rumah Anda",
}

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283125217199"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <nav className="sticky top-0 z-50 bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="font-bold text-xl text-stone-800">Sinar Berkat</a>
            <div className="flex items-center gap-4">
              <a href="/products" className="text-stone-600 hover:text-stone-800 text-sm">Produk</a>
              <a href={"https://wa.me/" + WA_NUMBER} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600 transition">WhatsApp</a>
            </div>
          </div>
        </nav>
        {children}
        <footer className="bg-stone-800 text-stone-300 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="font-semibold text-white mb-1">Sinar Berkat Furniture</p>
            <p className="text-sm">Furniture berkualitas untuk rumah Anda</p>
            <p className="text-sm mt-2">WhatsApp: <a href={"https://wa.me/" + WA_NUMBER} className="text-green-400 hover:underline">+62 831-2521-7199</a></p>
          </div>
        </footer>
      </body>
    </html>
  )
}
