'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchMyOrders, formatPrice } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getOrders() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login?next=/account/orders')
          return
        }

        const res = await fetchMyOrders(session.access_token, { page, limit })
        setOrders(res.items || [])
        setTotal(res.total || 0)
      } catch (err: any) {
        console.error('Error fetching customer orders:', err)
        setError('Gagal memuat riwayat pesanan. Silakan coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    getOrders()
  }, [page, limit, router])

  const totalPages = Math.ceil(total / limit)

  const paymentStatusMap: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Belum Bayar', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    PAID: { label: 'Lunas', className: 'bg-green-50 text-green-700 border border-green-200' },
    EXPIRED: { label: 'Kedaluwarsa', className: 'bg-stone-50 text-stone-600 border border-stone-200' },
    FAILED: { label: 'Gagal', className: 'bg-red-50 text-red-700 border border-red-200' },
  }

  const orderStatusMap: Record<string, { label: string; className: string }> = {
    PENDING_REVIEW: { label: 'Menunggu Konfirmasi', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    WAITING_PAYMENT: { label: 'Menunggu Pembayaran', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    PROCESSING: { label: 'Sedang Diproses', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    PRODUCTION: { label: 'Dalam Produksi', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    SHIPPED: { label: 'Dikirim', className: 'bg-sky-50 text-sky-700 border border-sky-200' },
    COMPLETED: { label: 'Selesai', className: 'bg-green-50 text-green-700 border border-green-200' },
    CANCELLED: { label: 'Dibatalkan', className: 'bg-red-50 text-red-700 border border-red-200' },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Riwayat Pesanan</h1>
          <p className="text-stone-500 text-sm">Daftar semua pesanan mebel Anda</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="text-stone-700 hover:text-stone-900 border-stone-300"
        >
          Belanja Lagi
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <p className="text-stone-500">Memuat riwayat pesanan...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <p className="font-semibold">{error}</p>
          <Button
            onClick={() => setPage(page)}
            className="mt-4"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <Card className="text-center py-12 border-stone-200 shadow-sm bg-white">
          <CardContent className="space-y-4 pt-6">
            <p className="text-stone-500">Anda belum memiliki riwayat pesanan.</p>
            <Button onClick={() => router.push('/products')}>
              Lihat Produk Kami
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-4">
            {orders.map((order) => {
              const oStatus = orderStatusMap[order.status] || { label: order.status, className: 'bg-stone-50 text-stone-700 border border-stone-200' }
              const pStatus = paymentStatusMap[order.invoice?.paymentStatus || 'PENDING'] || { label: order.invoice?.paymentStatus || 'PENDING', className: 'bg-stone-50 text-stone-700 border border-stone-200' }
              const orderDate = new Date(order.createdAt).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })

              return (
                <Card key={order.id} className="border-stone-200 shadow-sm hover:shadow-md transition bg-white overflow-hidden">
                  <CardHeader className="bg-stone-50/50 py-3 px-4 border-b border-stone-100 flex flex-row flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">No. Pesanan</p>
                      <a href={`/orders/${order.orderNumber}`} className="text-sm font-bold text-stone-800 hover:underline">
                        {order.orderNumber}
                      </a>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500">{orderDate}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="text-sm text-stone-600">
                          <span className="font-semibold text-stone-800">{item.productName}</span> x{item.quantity}
                        </div>
                      ))}
                      <p className="text-xs text-stone-400">Tujuan: {order.shippingAddress}</p>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                      <div className="space-y-1 text-left md:text-right">
                        <p className="text-xs text-stone-400">Total Pembayaran</p>
                        <p className="text-lg font-bold text-stone-800">Rp {formatPrice(order.total)}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${oStatus.className}`}>
                          {oStatus.label}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${pStatus.className}`}>
                          {pStatus.label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-stone-600">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
