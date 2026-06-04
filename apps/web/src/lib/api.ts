const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function fetchProducts(params?: {
  categoryId?: string;
  status?: string;
  search?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  query.set('limit', '20');

  const res = await fetch(`${API_URL}/products?${query}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchProduct(id: string) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createOrder(data: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Failed to create order');
  }
  return res.json();
}

export async function fetchMyOrders(token: string, params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/orders/my?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID').format(num);
}

export function getWhatsAppUrl(message?: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '6283125217199';
  const text = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${number}${text ? `?text=${text}` : ''}`;
}

export async function fetchUserProfile(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateUserProfile(token: string, data: { fullName?: string; phone?: string }) {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Failed to update profile');
  }
  return res.json();
}
