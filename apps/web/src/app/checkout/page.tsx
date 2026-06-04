"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createOrder, formatPrice } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromCart = searchParams.get("fromCart") === "true"
  const { items, clearCart } = useCart()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    shippingAddress: "",
    notes: "",
    productName: "",
    customerPhonePlaceholder: "08xxxxxxxxxx",
    quantity: "1",
    unitPrice: "",
  })

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setForm(prev => ({
          ...prev,
          customerName: session.user.user_metadata?.full_name || "",
          customerEmail: session.user.email || "",
          customerPhone: session.user.user_metadata?.phone || "",
        }))
      }
    }
    loadUser()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const orderItems = fromCart && items.length > 0
        ? items.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.unitPrice, quantity: i.quantity }))
        : [{ productName: form.productName, unitPrice: form.unitPrice, quantity: parseInt(form.quantity) }]

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const order = await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        shippingAddress: form.shippingAddress,
        notes: form.notes || undefined,
        items: orderItems,
      }, token)
      
      if (fromCart) clearCart()
      router.push("/orders/" + order.orderNumber)
    } catch (err: any) {
      setError(err.message ?? "Gagal membuat order")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">Form Pemesanan</h1>
      <p className="text-stone-500 text-sm mb-6">Isi form berikut dan admin kami akan segera menghubungi Anda.</p>

      {fromCart && items.length > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-stone-700 mb-2">Produk yang dipesan:</p>
          {items.map(item => (
            <div key={item.productId} className="flex justify-between text-sm text-stone-600">
              <span>{item.productName} x{item.quantity}</span>
              <span>Rp {formatPrice(parseFloat(item.unitPrice) * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-stone-200 mt-2 pt-2 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>Rp {formatPrice(items.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0))}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nama Lengkap *</label>
          <input name="customerName" value={form.customerName} onChange={handleChange} required className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="Nama Anda" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">No. WhatsApp *</label>
          <input name="customerPhone" value={form.customerPhone} onChange={handleChange} required className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email (opsional)</label>
          <input name="customerEmail" value={form.customerEmail} onChange={handleChange} type="email" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Alamat Pengiriman *</label>
          <textarea name="shippingAddress" value={form.shippingAddress} onChange={handleChange} required rows={3} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="Alamat lengkap termasuk kota dan provinsi" />
        </div>

        {!fromCart && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-sm font-medium text-stone-700 mb-3">Detail Produk</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Nama Produk *</label>
                <input name="productName" value={form.productName} onChange={handleChange} required className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="Nama produk yang dipesan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-stone-600 mb-1">Harga Satuan (Rp) *</label>
                  <input name="unitPrice" value={form.unitPrice} onChange={handleChange} required type="number" min="0" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-stone-600 mb-1">Jumlah *</label>
                  <input name="quantity" value={form.quantity} onChange={handleChange} required type="number" min="1" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Catatan (opsional)</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" placeholder="Warna, ukuran, atau permintaan khusus" />
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-stone-800 text-white py-3 rounded-xl font-semibold hover:bg-stone-700 transition disabled:opacity-50">
          {isLoading ? "Memproses..." : "Kirim Pesanan"}
        </button>
        <p className="text-xs text-stone-400 text-center">Admin akan mengkonfirmasi pesanan dan menghubungi Anda via WhatsApp</p>
      </form>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
