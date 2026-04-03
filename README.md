# Cents Tracker

A production-ready personal and business finance management web application built with React, Node.js, and Supabase.

## Features

- **Multi-user authentication** via Supabase Auth
- **Dashboard** with balance, income, expense, investment, and savings summaries
- **Transactions** — add, edit, delete with 5-second undo, search, filter, sort
- **Categories** — default + custom categories per user
- **Reports** — daily, weekly, monthly, yearly with CSV export
- **Charts** — line, bar, pie, doughnut breakdowns
- **Budget System** — set budgets per category with progress tracking and alerts
- **Investment Tracker** — track portfolio entries with monthly summary
- **In-app Notifications** — budget alerts, low balance alerts
- **Fully Responsive** — works on mobile and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |

## Project Structure

```
cents-tracker/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Supabase admin client
│   │   ├── controllers/      # Route logic
│   │   ├── middleware/       # Auth & error handling
│   │   ├── routes/           # Express routers
│   │   └── utils/            # Currency & CSV helpers
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context providers
│   │   ├── hooks/            # Custom data hooks
│   │   ├── lib/              # Supabase client
│   │   ├── pages/            # Route-level pages
│   │   ├── services/         # Backend API service
│   │   └── utils/            # Currency, date, export utils
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── supabase/
│   ├── schema.sql            # Full DB schema + RLS policies
│   └── seed.sql              # Sample data
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- A free Supabase account at https://supabase.com

---

### Step 1 — Supabase Setup

1. Create a new project at [https://supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the contents of `supabase/schema.sql`
3. Optionally, run `supabase/seed.sql` for sample categories
4. From **Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in your values:

```
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`.

---

### Step 3 — Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Currency Handling

All monetary amounts are stored as **integers (cents)** in the database to avoid floating-point errors. For example, `$12.50` is stored as `1250`. The frontend automatically converts for display.

## Row-Level Security

All Supabase tables have RLS enabled. Users can only read and write their own data. The backend uses the service role key but verifies user identity via JWT before every operation.

## Build for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```
