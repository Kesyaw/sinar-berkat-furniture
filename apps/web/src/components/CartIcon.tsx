"use client"
import Link from "next/link"
import { useCart } from "@/lib/cart-context"

export default function CartIcon() {
  const { items } = useCart()
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  return (
    <Link href="/cart" className="relative text-stone-600 hover:text-stone-800">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-stone-800 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{count}</span>
      )}
    </Link>
  )
}
