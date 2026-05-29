import { OrderStatus, PaymentStatus, ProductStatus, UserRole } from "./enums";

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO string — frontend doesn't use Date objects from JSON
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  status: ProductStatus;
  primaryImageUrl: string | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  paymentStatus: PaymentStatus;
  amountDue: number;
  dueDate: string | null;
}

// Ini hanya dipakai untuk auth context di frontend
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}