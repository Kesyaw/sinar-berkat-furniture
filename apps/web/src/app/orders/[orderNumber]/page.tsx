import { notFound } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

async function getOrderByNumber(orderNumber: string) {
  const res = await fetch(API_URL + "/orders?search=" + orderNumber, { cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0] ?? null
}

function formatPrice(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  return new Intl.NumberFormat("id-ID").format(num)
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const order = await getOrderByNumber(orderNumber)
  if (!order) notFound()

  const steps = [
    { key: "PENDING_REVIEW", label: "Diterima" },
    { key: "WAITING_PAYMENT", label: "Tunggu Bayar" },
    { key: "PROCESSING", label: "Diproses" },
    { key: "SHIPPED", label: "Dikirim" },
    { key: "COMPLETED", label: "Selesai" },
  ]

  const statusOrder = ["PENDING_REVIEW", "WAITING_PAYMENT", "PROCESSING", "PRODUCTION", "SHIPPED", "COMPLETED"]
  const currentIndex = statusOrder.indexOf(order.status)

  const statusColor: Record<string, string> = {
    PENDING_REVIEW: "bg-orange-100 text-orange-700",
    WAITING_PAYMENT: "bg-blue-100 text-blue-700",
    PROCESSING: "bg-purple-100 text-purple-700",
    PRODUCTION: "bg-indigo-100 text-indigo-700",
    SHIPPED: "bg-teal-100 text-teal-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }

  const statusLabel: Record<string, string> = {
    PENDING_REVIEW: "Menunggu Konfirmasi",
    WAITING_PAYMENT: "Menunggu Pembayaran",
    PROCESSING: "Sedang Diproses",
    PRODUCTION: "Dalam Produksi",
    SHIPPED: "Sedang Dikirim",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Status Pesanan</h1>
      <p className="text-stone-500 text-sm mb-4">{order.orderNumber}</p>

      <div className={"inline-flex px-3 py-1 rounded-full text-sm font-medium mb-6 " + (statusColor[order.status] ?? "bg-gray-100 text-gray-600")}>{statusLabel[order.status] ?? order.status}</div>

      {order.status !== "CANCELLED" && (
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-start min-w-max gap-0">
            {steps.map((step, i) => {
              const stepIndex = statusOrder.indexOf(step.key)
              const isDone = currentIndex >= stepIndex
              const isLast = i === steps.length - 1
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center w-16">
                    <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold " + (isDone ? "bg-stone-800 text-white" : "bg-stone-200 text-stone-400")}>{isDone ? "?" : (i + 1)}</div>
                    <p className={"text-xs mt-1 text-center " + (isDone ? "text-stone-700 font-medium" : "text-stone-400")}>{step.label}</p>
                  </div>
                  {!isLast && <div className={"w-8 h-0.5 mb-5 " + (currentIndex > stepIndex ? "bg-stone-800" : "bg-stone-200")} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-stone-800 mb-3">Informasi Pesanan</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Nama</span><span className="font-medium">{order.customerName}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">No. HP</span><span>{order.customerPhone}</span></div>
          <div className="flex justify-between gap-4"><span className="text-stone-500 flex-shrink-0">Alamat</span><span className="text-right">{order.shippingAddress}</span></div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-stone-800 mb-3">Item Pesanan</h2>
        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-stone-700">{item.productName} x{item.quantity}</span>
              <span className="font-medium">Rp {formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm text-stone-500"><span>Subtotal</span><span>Rp {formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-stone-500"><span>Ongkir</span><span>Rp {formatPrice(order.shippingCost)}</span></div>
            <div className="flex justify-between font-bold text-stone-800"><span>Total</span><span>Rp {formatPrice(order.total)}</span></div>
          </div>
        </div>
      </div>

      {order.adminNotes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mb-4">
          <p className="font-medium mb-1">Catatan dari Admin</p>
          <p>{order.adminNotes}</p>
        </div>
      )}

      <div className="text-center">
        <a href="/products" className="text-sm text-stone-500 hover:text-stone-700">Lanjut belanja</a>
      </div>
    </main>
  )
}
