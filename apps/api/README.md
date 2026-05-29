# Sinar Berkat Furniture — Fullstack Commerce System

Production-ready furniture commerce system untuk bisnis furniture Indonesia kecil-menengah.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Web | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Admin App | Flutter (Web & Android) |
| Backend API | NestJS, TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth + JWT (ES256) |
| Storage | Supabase Storage |
| Payment | Midtrans (coming soon) |
| Deployment | Vercel (web) + Railway (api) |

## Architecture

```
Flutter Admin App  →  Next.js Web (Customer)  →  NestJS REST API  →  PostgreSQL (Supabase)
```

All business logic stays in NestJS. Supabase is used only for database, auth, and storage.

## Project Structure

```
sinar-berkat-furniture/
├── apps/
│   ├── web/          ← Next.js customer website (WIP)
│   └── api/          ← NestJS backend API
├── admin_app/        ← Flutter admin app
└── packages/
    └── shared-types/ ← Shared TypeScript types
```

## Features

### Admin App (Flutter)
- ✅ Authentication (Supabase + JWT ES256)
- ✅ Product CRUD with image upload (web + mobile)
- ✅ Category management
- ✅ Order management with status workflow
- ✅ Mobile-first responsive UI

### Backend API (NestJS)
- ✅ Modular architecture
- ✅ JWT authentication with RBAC (Admin/Customer)
- ✅ Products module (CRUD + image upload to Supabase Storage)
- ✅ Categories module
- ✅ Orders module with status workflow
- ⏳ Invoices module
- ⏳ Payments module (Midtrans)
- ⏳ Webhooks module

### Customer Website (Next.js)
- ⏳ Coming soon

## Business Flow

**Ready Stock:** Customer browse → Checkout → Admin review → Admin set shipping → Customer pays → Shipped

**Custom/Preorder:** Customer browse → WhatsApp consultation → Admin confirms → DP payment → Production

## Order Status Workflow

```
PENDING_REVIEW → WAITING_PAYMENT → PROCESSING → SHIPPED → COMPLETED
                                 ↘ PRODUCTION ↗
Any status → CANCELLED
```

## API Endpoints

```
POST   /api/v1/auth/sync
GET    /api/v1/auth/me

GET    /api/v1/categories
POST   /api/v1/categories           [ADMIN]
PUT    /api/v1/categories/:id       [ADMIN]
DELETE /api/v1/categories/:id       [ADMIN]

GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products             [ADMIN]
PUT    /api/v1/products/:id         [ADMIN]
DELETE /api/v1/products/:id         [ADMIN]
POST   /api/v1/products/:id/images  [ADMIN]

GET    /api/v1/orders               [ADMIN]
GET    /api/v1/orders/:id           [ADMIN]
POST   /api/v1/orders
PATCH  /api/v1/orders/:id/status    [ADMIN]
PATCH  /api/v1/orders/:id/shipping  [ADMIN]
```

## Setup

### Prerequisites
- Node.js 18+
- pnpm
- Flutter SDK
- PostgreSQL (or Supabase account)

### Environment Variables

Copy `.env.example` to `.env` in `apps/api/`:

```env
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Run API
cd apps/api && pnpm run start:dev

# Run Flutter admin
cd admin_app && flutter run -d chrome
```

## Development Progress

- ✅ Phase 1 — Foundation (monorepo, DB schema, Prisma)
- ✅ Phase 2 — Authentication (Supabase + NestJS JWT ES256)
- ✅ Phase 3 — Flutter Admin Products CRUD + Image Upload
- ✅ Phase 4 — Orders Module (NestJS + Flutter)
- ⏳ Phase 5 — WhatsApp Integration
- ⏳ Phase 6 — Payment (Midtrans)
- ⏳ Phase 7 — Customer Website (Next.js)
- ⏳ Phase 8 — Production Hardening + Deployment