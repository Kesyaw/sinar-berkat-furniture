export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Menunggu Konfirmasi",
  WAITING_PAYMENT: "Menunggu Pembayaran",
  PROCESSING: "Diproses",
  PRODUCTION: "Dalam Produksi",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  READY_STOCK: "Tersedia",
  PREORDER: "Pre-Order",
  CUSTOM: "Custom",
  OUT_OF_STOCK: "Stok Habis",
};