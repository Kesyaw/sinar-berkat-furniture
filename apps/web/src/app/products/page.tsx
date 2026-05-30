import Link from "next/link"
import { fetchProducts, fetchCategories, formatPrice } from "@/lib/api"

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ categoryId?: string; search?: string }> }) {
  const params = await searchParams
  const [productsData, categories] = await Promise.all([
    fetchProducts({ categoryId: params.categoryId, search: params.search }),
    fetchCategories(),
  ])
  const products = productsData.items ?? []

  const statusLabel: Record<string, string> = { READY_STOCK: "Ready", PREORDER: "Pre-Order", CUSTOM: "Custom", OUT_OF_STOCK: "Habis" }
  const statusColor: Record<string, string> = { READY_STOCK: "bg-green-100 text-green-700", PREORDER: "bg-orange-100 text-orange-700", CUSTOM: "bg-blue-100 text-blue-700", OUT_OF_STOCK: "bg-gray-100 text-gray-500" }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">Produk</h1>

      <div className="flex gap-3 flex-wrap mb-6">
        <Link href="/products" className={"px-4 py-2 rounded-full text-sm font-medium transition " + (!params.categoryId ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200")}>Semua</Link>
        {categories.map((cat: any) => (
          <Link key={cat.id} href={"/products?categoryId=" + cat.id} className={"px-4 py-2 rounded-full text-sm font-medium transition " + (params.categoryId === cat.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200")}>{cat.name}</Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-stone-500 text-center py-20">Belum ada produk</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product: any) => {
            const primaryImage = product.images?.find((i: any) => i.isPrimary) ?? product.images?.[0]
            const imageUrl = primaryImage ? "https://brsmsxqddpsprayawwde.supabase.co/storage/v1/object/public/product-images/" + primaryImage.storagePath : null
            return (
              <Link key={product.id} href={"/products/" + product.id} className="group">
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
          })}
        </div>
      )}
    </main>
  )
}
