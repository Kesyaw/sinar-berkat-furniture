"use client"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/api"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CartPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">??</p>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Cart Kosong</h1>
        <p className="text-stone-500 mb-6">Belum ada produk yang ditambahkan</p>
        <Link href="/products" className="bg-stone-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-stone-700 transition">Lihat Produk</Link>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Cart</h1>
      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div key={item.productId} className="bg-white border border-stone-200 rounded-xl p-4 flex gap-4 items-center">
            <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">??</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-800 text-sm truncate">{item.productName}</p>
              <p className="text-stone-600 text-sm">Rp {formatPrice(item.unitPrice)} / pcs</p>
              <p className="text-stone-700 font-semibold text-sm">Rp {formatPrice(parseFloat(item.unitPrice) * item.quantity)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100">-</button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100">+</button>
              <button onClick={() => removeItem(item.productId)} className="ml-1 text-red-400 hover:text-red-600 text-xs">?</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-stone-50 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm text-stone-600 mb-1">
          <span>{items.reduce((s, i) => s + i.quantity, 0)} item</span>
          <span>Subtotal</span>
        </div>
        <div className="flex justify-between font-bold text-stone-800 text-lg">
          <span>Total</span>
          <span>Rp {formatPrice(total)}</span>
        </div>
        <p className="text-xs text-stone-400 mt-1">Ongkos kirim akan dikonfirmasi admin</p>
      </div>

      <button onClick={() => router.push("/checkout?fromCart=true")} className="w-full bg-stone-800 text-white py-3 rounded-xl font-semibold hover:bg-stone-700 transition mb-2">Lanjut ke Checkout</button>
      <button onClick={clearCart} className="w-full text-stone-400 text-sm py-2 hover:text-stone-600 transition">Kosongkan Cart</button>
    </main>
  )
}
