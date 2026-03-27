# SkyVoyage — Airline Reservation System

A professional-grade, budgetless Airline Reservation System built with **Next.js 15**, **NestJS**, **Prisma**, and **Supabase**.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project (free tier) — [supabase.com](https://supabase.com)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/airline_manage.git
cd airline_manage

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** — Copy `backend/.env.example` to `backend/.env` and fill in your Supabase `DATABASE_URL` and a `JWT_SECRET`.

**Frontend** — Copy `frontend/.env.example` to `frontend/.env.local` and fill in `NEXT_PUBLIC_API_URL` and (optionally) your Supabase credentials.

### 3. Database Setup
```bash
cd backend

# Push schema to Supabase
npx prisma db push

# Seed demo data (users, aircraft, flights, seats)
npm run seed
```

**Demo Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skyvoyage.com | admin123 |
| Passenger | passenger@example.com | user123 |

### 4. Run Development Servers

In **two separate terminals**:

```bash
# Terminal 1 — Backend (http://localhost:4000)
cd backend
npm run start:dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend
npm run dev
```

### 5. Explore
| URL | Description |
|-----|-------------|
| http://localhost:3000 | Frontend App |
| http://localhost:3000/flights | Flight Search |
| http://localhost:3000/bookings | Booking Dashboard |
| http://localhost:3000/admin | Admin Panel |
| http://localhost:4000/docs | Swagger API Docs |

---

## 🏗️ Architecture

```
airline_manage/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/         # JWT auth (register, login, guards)
│   │   ├── bookings/     # Pessimistic locking transactions
│   │   ├── cache/        # Strategy Pattern (Map → Redis swap)
│   │   ├── flights/      # CRUD + search + caching
│   │   └── prisma/       # Global PrismaService
│   └── prisma/
│       ├── schema.prisma # PostgreSQL schema
│       └── seed.ts       # Demo data seeder
│
└── frontend/         # Next.js 15 (App Router)
    └── src/
        ├── app/
        │   ├── page.tsx          # Landing page
        │   ├── flights/page.tsx  # Flight search
        │   ├── flights/[id]/     # Seat map + booking
        │   ├── bookings/         # User dashboard
        │   └── admin/            # Admin panel
        └── components/
            └── navbar.tsx        # Glassmorphism nav
```

### Key Design Patterns
- **Strategy Pattern** — CacheProvider interface (MapCache ↔ Redis)
- **Pessimistic Locking** — `SELECT ... FOR UPDATE` to prevent double-booking
- **Clean Architecture** — NestJS modules, DTOs, services, controllers

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```
Set env var `NEXT_PUBLIC_API_URL` to your backend URL.

### Backend → Render / Railway
1. Connect your repo
2. Set build command: `npm run build`
3. Set start command: `npm run start:prod`
4. Add env vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`

### Database → Supabase
Already hosted. Just use the connection string in your backend `.env`.
