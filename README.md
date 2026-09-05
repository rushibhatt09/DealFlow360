# DealFlow360

A self-governing B2B sales operations platform: quotation → discount governance → multi-warehouse fulfillment → hybrid billing → customer negotiation → payment.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 6 / SQLite · iron-session · Tailwind CSS

## Running it

```bash
npm install
npm run seed   # populate demo data
npm run dev    # http://localhost:3000
```

## Logins

**Internal** (`/login`, password `password123`): `admin@dealflow360.com`, `manager@dealflow360.com`, `finance@dealflow360.com`, `rep@dealflow360.com`, `ananya@dealflow360.com`

**Customer portal** (`/portal/login`, password `portal123`): `acme@example.com` (Gold), `beta@example.com` (Silver), `nimbus@example.com` (Bronze)

## Structure

- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — demo data
- `src/lib/*-engine.ts` — the actual business logic (discount risk scoring, warehouse split, billing proration, upsell ranking, deal health), each a pure function
- `src/lib/quotation-service.ts` — orchestrates the engines against the database
- `src/app/actions/*.ts` — server actions (mutations)
- `src/app/workspace/*` — internal rep/manager/finance UI
- `src/app/admin/*` — backend configuration
- `src/app/portal/*` — customer-facing negotiation portal
