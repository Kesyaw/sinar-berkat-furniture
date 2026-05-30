import Link from "next/link"
import { fetchProducts, fetchCategories, formatPrice } from "@/lib/api"

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283125217199"

export default async function HomePage() {
  const [productsData, categories] = await Promise.all([
    fetchProducts({ status: "READY_STOCK" }),
    fetchCategories(),
  ])
  const products = productsData.items ?? []

  return (
    <main>
      <section className="bg-gradient-to-br from-stone-800 to-stone-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Furniture Berkualitas</h1>
          <p className="text-stone-300 text-lg mb-8">Tersedia ready stock, preorder, dan custom sesuai kebutuhan.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products" className="bg-white text-stone-800 px-8 py-3 rounded-full font-semibold hover:bg-stone-100 transition">Lihat Produk</Link>
            <a href={"https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("Halo, saya ingin konsultasi furniture")} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition">Konsultasi Gratis</a>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Kategori</h2>
          <div className="flex gap-3 flex-wrap">
            {categories.map((cat: any) => (
              <Link key={cat.id} href={"/products?categoryId=" + cat.id} className="bg-stone-100 text-stone-700 px-5 py-2 rounded-full hover:bg-stone-200 transition text-sm font-medium">{cat.name}</Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Produk Ready Stock</h2>
          <Link href="/products" className="text-stone-600 hover:text-stone-800 text-sm">Lihat semua</Link>
        </div>
        {products.length === 0 ? (
          <p className="text-stone-500 text-center py-12">Belum ada produk</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-green-50 border-t border-green-100 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-3">Butuh Furniture Custom?</h2>
          <p className="text-stone-600 mb-6">Konsultasikan kebutuhan Anda langsung dengan kami via WhatsApp</p>
          <a href={"https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("Halo, saya ingin pesan furniture custom")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition">Chat WhatsApp Sekarang</a>
        </div>
      </section>
    </main>
  )
}

function ProductCard({ product }: { product: any }) {
  const primaryImage = product.images?.find((i: any) => i.isPrimary) ?? product.images?.[0]
  const imageUrl = primaryImage ? "https://brsmsxqddpsprayawwde.supabase.co/storage/v1/object/public/product-images/" + primaryImage.storagePath : null
  const statusLabel: Record<string, string> = { READY_STOCK: "Ready", PREORDER: "Pre-Order", CUSTOM: "Custom", OUT_OF_STOCK: "Habis" }
  const statusColor: Record<string, string> = { READY_STOCK: "bg-green-100 text-green-700", PREORDER: "bg-orange-100 text-orange-700", CUSTOM: "bg-blue-100 text-blue-700", OUT_OF_STOCK: "bg-gray-100 text-gray-500" }
  return (
    <Link href={"/products/" + product.id} className="group">
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition">
        <div className="aspect-square bg-stone-100 relative">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🪑</div>
          )}
          <span className={"absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-medium " + (statusColor[product.status] ?? "")}>{statusLabel[product.status] ?? product.status}</span>
        </div>
        <div className="p-3">
          <p className="font-medium text-stone-800 text-sm line-clamp-2">{product.name}</p>
          <p className="text-stone-600 text-sm mt-1">Rp {formatPrice(product.basePrice)}</p>
        </div>
      </div>
    </Link>
  )
}
