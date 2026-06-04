"use client"

import { useState } from "react"

interface PayButtonProps {
  orderNumber: string
  existingPaymentUrl?: string | null
}

export default function PayButton({ orderNumber, existingPaymentUrl }: PayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    setLoading(true)
    setError(null)

    // Jika payment link sudah ada dan masih aktif, langsung redirect ke sana
    if (existingPaymentUrl) {
      window.location.href = existingPaymentUrl
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
      const res = await fetch(`${apiUrl}/payments/orders/track/${orderNumber}/create-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        throw new Error("Gagal membuat link pembayaran. Silakan coba beberapa saat lagi.")
      }

      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error("Respon server tidak valid.")
      }
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan")
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-stone-850 hover:bg-stone-800 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        style={{ backgroundColor: "#1c1917" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Menghubungkan ke Midtrans...
          </>
        ) : (
          "Bayar Sekarang"
        )}
      </button>
      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}
