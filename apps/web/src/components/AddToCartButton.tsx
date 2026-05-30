"use client"
import { useState } from "react"
import { useCart } from "@/lib/cart-context"
import { useRouter } from "next/navigation"

type Props = {
  product: { id: string; name: string; basePrice: string; imageUrl?: string | null }
}

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart()
  const router = useRouter()
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.basePrice,
      quantity: 1,
      imageUrl: product.imageUrl ?? undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.basePrice,
      quantity: 1,
      imageUrl: product.imageUrl ?? undefined,
    })
    router.push("/cart")
  }

  return (
    <div className="space-y-2">
      <button onClick={handleBuyNow} className="w-full bg-stone-800 text-white py-3 rounded-xl font-semibold hover:bg-stone-700 transition">Beli Sekarang</button>
      <button onClick={handleAddToCart} className={"w-full border py-3 rounded-xl font-semibold transition text-sm " + (added ? "border-green-500 text-green-600 bg-green-50" : "border-stone-300 text-stone-700 hover:bg-stone-50")}>
        {added ? "? Ditambahkan ke Cart" : "Tambah ke Cart"}
      </button>
    </div>
  )
}
