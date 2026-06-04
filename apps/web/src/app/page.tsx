import Link from "next/link"
import Image from "next/image"
import { fetchProducts, fetchCategories, formatPrice } from "@/lib/api"

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283125217199"
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

async function getReviews() {
  try {
    const res = await fetch(API_URL + "/reviews", { next: { revalidate: 300 } })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export default async function HomePage() {
  const [productsData, categories, reviews] = await Promise.all([
    fetchProducts({}),
    fetchCategories(),
    getReviews(),
  ])
  const products = productsData.items ?? []

  return (
    <main>
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <Image
          src="/hero.png"
          alt="Sinar Berkat Furniture"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0" style={{background: "linear-gradient(to right, rgba(26,58,74,0.85) 0%, rgba(26,58,74,0.6) 50%, rgba(26,58,74,0.1) 100%)"}} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6 border" style={{backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "white"}}>
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Terpercaya sejak 2006
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
              Furniture Impian
              <br />
              <span style={{color: "#b8dff0"}}>Untuk Rumah Anda</span>
            </h1>
            <p className="text-lg mb-4 leading-relaxed" style={{color: "rgba(255,255,255,0.85)"}}>
              Temukan koleksi furniture berkualitas tinggi untuk melengkapi setiap sudut rumah Anda. Ready stock dan preorder tersedia.
            </p>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s: number) => (
                  <svg key={s} className="w-4 h-4" style={{color: "#F5C842"}} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <span className="text-white text-sm font-medium">Dipercaya ratusan pelanggan</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/products" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold transition text-sm hover:opacity-90" style={{backgroundColor: "#7FB5C8", color: "white"}}>
                Lihat Koleksi
              </Link>
              <a href={"https://wa.me/" + WA + "?text=" + encodeURIComponent("Halo, saya ingin konsultasi furniture")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold transition text-sm border hover:bg-white/20" style={{backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.4)", color: "white"}}>
                Konsultasi Gratis
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 z-10 hidden md:flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg text-center min-w-24">
            <p className="text-2xl font-bold" style={{color: "#2A5F75"}}>18+</p>
            <p className="text-xs text-stone-500">Tahun</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg text-center min-w-24">
            <p className="text-2xl font-bold" style={{color: "#2A5F75"}}>{products.length}+</p>
            <p className="text-xs text-stone-500">Produk</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg text-center min-w-24">
            <p className="text-2xl font-bold" style={{color: "#2A5F75"}}>100+</p>
            <p className="text-xs text-stone-500">Pelanggan</p>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{color: "#1e3a4a"}}>Kategori Produk</h2>
            <p className="text-sm text-stone-500">Temukan furniture yang sesuai kebutuhan Anda</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categories.map((cat: any) => (
              <Link key={cat.id} href={"/products?categoryId=" + cat.id} className="group bg-white rounded-2xl p-4 text-center border transition hover:shadow-md hover:border-[#7FB5C8]" style={{borderColor: "#d0e8f0"}}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 text-2xl" style={{backgroundColor: "#E8F4F8"}}>🪑</div>
                <p className="text-sm font-medium text-stone-700">{cat.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{cat._count?.products ?? 0} produk</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1" style={{color: "#1e3a4a"}}>Produk Unggulan</h2>
            <p className="text-sm text-stone-500">Pilihan terbaik dari koleksi kami</p>
          </div>
          <Link href="/products" className="text-sm font-medium hover:opacity-70 transition" style={{color: "#2A5F75"}}>Lihat semua</Link>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-4xl mb-3">🪑</p>
            <p>Belum ada produk tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section id="about" className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{backgroundColor: "#E8F4F8", color: "#2A5F75"}}>
                Tentang Kami
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{color: "#1e3a4a"}}>Lebih dari 18 Tahun Melayani dengan Sepenuh Hati</h2>
              <div className="space-y-4 text-stone-600 text-sm leading-relaxed">
                <p>Pada tahun 2005, pemilik usaha yang merupakan sales springbed memutuskan membuka usahanya sendiri. Lahirlah <strong>Sinar Berkat Furniture</strong> yang bergerak di bidang furniture interior rumah.</p>
                <p>Berlokasi di <strong>Jl. Raya Siliwangi No. 9 RT 002 RW 002, Pamulang</strong>, toko ini diresmikan pada <strong>1 Agustus 2006</strong> oleh Deddy Wangsa.</p>
                <p>Logo berbentuk matahari dengan inisial SB mencerminkan harapan kami untuk selalu menerangi dan menjadi berkat bagi sesama.</p>
              </div>
              <div className="flex gap-4 mt-6">
                <div className="rounded-xl p-4 text-center flex-1" style={{backgroundColor: "#E8F4F8"}}>
                  <p className="text-2xl font-bold" style={{color: "#2A5F75"}}>2006</p>
                  <p className="text-xs text-stone-500">Tahun Berdiri</p>
                </div>
                <div className="rounded-xl p-4 text-center flex-1" style={{backgroundColor: "#E8F4F8"}}>
                  <p className="text-2xl font-bold" style={{color: "#2A5F75"}}>Pamulang</p>
                  <p className="text-xs text-stone-500">Lokasi Kami</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl p-8 text-center" style={{background: "linear-gradient(135deg, #E8F4F8, #daeeda)"}}>
              <Image src="/logo.png" alt="Sinar Berkat Furniture" width={200} height={200} className="mx-auto" />
              <p className="text-xl font-bold mt-4" style={{color: "#2A5F75"}}>Sinar Berkat Furniture</p>
              <p className="text-sm text-stone-500">Pamulang, sejak 2006</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12" style={{backgroundColor: "#E8F4F8"}}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1" style={{color: "#1e3a4a"}}>Lokasi Toko</h2>
            <p className="text-sm text-stone-500">Jl. Raya Siliwangi No. 9, Pamulang, Tangerang Selatan</p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-md border h-64 md:h-80" style={{borderColor: "#b8d8e8"}}>
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.4!2d106.73!3d-6.36!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSinar+Berkat+Furniture!5e0!3m2!1sen!2sid!4v1" width="100%" height="100%" style={{border: 0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="text-center mt-4">
            <a href="https://maps.google.com/?q=Sinar+Berkat+Furniture+Pamulang" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white px-6 py-2.5 rounded-full text-sm font-medium transition hover:opacity-80" style={{backgroundColor: "#2A5F75"}}>
              Buka di Google Maps
            </a>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{color: "#1e3a4a"}}>Kata Pelanggan Kami</h2>
              <p className="text-sm text-stone-500">Kepuasan pelanggan adalah prioritas utama kami</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review: any) => (
                <div key={review.id} className="rounded-2xl p-5 border" style={{backgroundColor: "#F0F7FA", borderColor: "#d0e8f0"}}>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map((s: number) => (
                      <svg key={s} className="w-4 h-4" style={{color: s <= review.rating ? "#F5C842" : "#ddd"}} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4 italic">{review.comment}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-stone-800 text-sm">{review.customerName}</p>
                    <span className="text-xs text-stone-400 bg-stone-200 px-2 py-0.5 rounded-full">{review.source === "GOOGLE_MAPS" ? "Google" : review.source === "WHATSAPP" ? "WhatsApp" : "Website"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16" style={{background: "linear-gradient(135deg, #2A5F75, #7FB5C8)"}}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Siap Melengkapi Rumah Anda?</h2>
          <p className="mb-8 text-sm" style={{color: "rgba(255,255,255,0.8)"}}>Konsultasikan kebutuhan furniture Anda dengan kami.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products" className="bg-white px-8 py-3 rounded-full font-bold hover:bg-stone-100 transition text-sm" style={{color: "#2A5F75"}}>Lihat Produk</Link>
            <a href={"https://wa.me/" + WA + "?text=" + encodeURIComponent("Halo, saya ingin konsultasi furniture")} target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full font-bold transition text-sm border" style={{backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.5)", color: "white"}}>Chat WhatsApp</a>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProductCard({ product }: { product: any }) {
  const primaryImage = product.images?.find((i: any) => i.isPrimary) ?? product.images?.[0]
  const imageUrl = primaryImage ? "https://brsmsxqddpsprayawwde.supabase.co/storage/v1/object/public/product-images/" + primaryImage.storagePath : null
  const statusLabel: Record<string, string> = { READY_STOCK: "Ready", PREORDER: "Pre-Order", OUT_OF_STOCK: "Habis" }
  const statusBg: Record<string, string> = { READY_STOCK: "#7FB5C8", PREORDER: "#A8D5A2", OUT_OF_STOCK: "#ccc" }
  const statusText: Record<string, string> = { READY_STOCK: "white", PREORDER: "#1e3a4a", OUT_OF_STOCK: "#666" }

  return (
    <Link href={"/products/" + product.id} className="group">
      <div className="bg-white rounded-2xl border overflow-hidden transition duration-300 hover:shadow-lg" style={{borderColor: "#d0e8f0"}}>
        <div className="aspect-square relative overflow-hidden" style={{backgroundColor: "#E8F4F8"}}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🪑</div>
          )}
          <span className="absolute top-2 left-2 text-xs px-2.5 py-1 rounded-full font-semibold" style={{backgroundColor: statusBg[product.status] ?? "#ccc", color: statusText[product.status] ?? "#666"}}>{statusLabel[product.status] ?? product.status}</span>
        </div>
        <div className="p-4">
          <p className="font-semibold text-sm line-clamp-2 mb-1" style={{color: "#1e3a4a"}}>{product.name}</p>
          <p className="font-bold text-sm" style={{color: "#2A5F75"}}>Rp {formatPrice(product.basePrice)}</p>
          {product.category && <p className="text-xs text-stone-400 mt-1">{product.category.name}</p>}
        </div>
      </div>
    </Link>
  )
}