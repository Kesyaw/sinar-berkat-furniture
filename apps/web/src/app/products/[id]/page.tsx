import { fetchProduct, formatPrice } from "@/lib/api"
import { notFound } from "next/navigation"

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283125217199"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product: any
  try {
    product = await fetchProduct(id)
  } catch {
    notFound()
  }

  const primaryImage = product.images?.find((i: any) => i.isPrimary) ?? product.images?.[0]
  const imageUrl = primaryImage ? "https://brsmsxqddpsprayawwde.supabase.co/storage/v1/object/public/product-images/" + primaryImage.storagePath : null

  const isReady = product.status === "READY_STOCK"
  const waMessage = isReady
    ? "Halo, saya tertarik dengan produk " + product.name + " (Rp " + formatPrice(product.basePrice) + "). Apakah masih tersedia?"
    : "Halo, saya ingin konsultasi mengenai " + product.name + ". Boleh info lebih lanjut?"

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">??</div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-sm text-stone-500 mb-1">{product.category?.name}</p>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">{product.name}</h1>
          <p className="text-2xl font-bold text-stone-700 mb-4">Rp {formatPrice(product.basePrice)}</p>

          {product.status === "READY_STOCK" && product.stockQty != null && (
            <p className="text-sm text-green-600 mb-4">Stok tersedia: {product.stockQty} unit</p>
          )}

          {product.description && (
            <p className="text-stone-600 text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          <div className="mt-auto space-y-3">
            {isReady ? (
              <a href={"https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(waMessage)} target="_blank" rel="noopener noreferrer" className="block w-full bg-green-500 text-white text-center py-3 rounded-xl font-semibold hover:bg-green-600 transition">Pesan via WhatsApp</a>
            ) : (
              <a href={"https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(waMessage)} target="_blank" rel="noopener noreferrer" className="block w-full bg-stone-800 text-white text-center py-3 rounded-xl font-semibold hover:bg-stone-700 transition">Konsultasi via WhatsApp</a>
            )}
            <p className="text-xs text-stone-400 text-center">Respon cepat melalui WhatsApp</p>
          </div>
        </div>
      </div>
    </main>
  )
}
