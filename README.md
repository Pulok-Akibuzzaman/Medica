# Medica

Medica is a Bangladesh-focused medical information, doctor finder, and e-pharmacy platform built with Node.js, Express, and a lightweight SQL.js database. It includes public-facing pages for medicines, doctors, diseases, clinical guidelines, and investigation centers, plus an AI health assistant, authentication, favorites, reviews, medicine purchasing with order tracking, and an admin area.

## Features

- Medicine directory with uses, dosage, side effects, warnings, categories, prices, and stock
- E-pharmacy: shopping cart, checkout with shipping details (৳50 flat delivery fee), order history, and stock tracking
- Smart recommendations: while viewing a medicine, the system suggests cheaper same-category alternatives (same-generic substitutes ranked first) with a "Save ৳X" badge
- Doctor directory with search, profiles, favorites, and reviews
- Disease knowledge base with symptoms, diagnosis, treatment, prevention, and related doctors/test centers
- National and international medical guideline listings
- Investigation and diagnostic center directory
- AI health assistant (registered users only) — rule-based symptom analysis that suggests specialties, doctors, and general advice, with per-user chat history
- User registration, login, and JWT-based authentication
- Admin panel with full add/edit/delete for medicines, doctors, diseases, guidelines, and investigation centers, plus order/shipping management
- Persistent local database stored in `database/medical.db`

## User Roles

- **Guest** — browse and search medicines, doctors, diseases, guidelines, and investigation centers (read-only)
- **Registered user** — everything a guest can do, plus the AI health assistant, buying medicines, cart and order history, favoriting doctors, and writing reviews
- **Admin** — everything above, plus managing all database records and processing orders (pending → processing → shipped → delivered / cancelled)

## Tech Stack

- Backend: Node.js, Express
- Database: SQL.js (SQLite in JavaScript), persisted to a local file
- Authentication: JSON Web Tokens, bcryptjs
- Middleware: CORS, rate limiting
- Frontend: Static HTML, CSS, and vanilla JavaScript

## Prerequisites

- Node.js 18 or newer
- npm

## Installation

1. Open a terminal in the project root.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root (see below). **The server will refuse to start without `JWT_SECRET`.**

## Environment Variables

The app reads these variables from `.env`:

```env
PORT=3000
JWT_SECRET=your-super-secret-key
ADMIN_EMAIL=admin@bdmedical.com
ADMIN_PASSWORD=admin123
```

- `PORT` is optional (default `3000`).
- `JWT_SECRET` is **required** — use any long random string. The server exits with a clear error if it is missing.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are optional. The admin user is created automatically on first run using these values (or the defaults shown).

## Database Setup

The database is created automatically the first time the server starts. Initialization creates all tables, ensures the admin account exists, and runs migrations (e.g., adding price/stock columns and assigning prices to older databases).

To load sample data, run the seed scripts after installation:

```bash
npm run seed          # medicines and doctors
npm run seed-modules  # diseases, guidelines, investigation centers
npm run import-dims   # additional medicine data
```

Seed scripts are idempotent and only insert missing records.

## Run the Project

```bash
npm start
```

Then open `http://localhost:3000`. The server serves the static frontend from `public/` and exposes the API under `/api`.

> **Important:** never run two instances of the server at the same time. The app writes its entire in-memory database to `database/medical.db` every 5 seconds, so a second instance will silently overwrite the first one's data. If you see an `EADDRINUSE` error on startup, a previous instance is still running — stop it first:
>
> ```powershell
> Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess -Force
> ```

## Main Pages

| Page | File | Access |
|---|---|---|
| Home | `index.html` | Public |
| Login / Register | `login.html`, `register.html` | Public |
| Medicine directory & shop | `medicines.html` | Browse public; buying requires login |
| Shopping cart & checkout | `cart.html` | Registered users |
| Doctor directory | `doctors.html` | Browse public; favorites/reviews require login |
| Disease knowledge base | `diseases.html` | Public |
| Medical guidelines | `guidelines.html` | Public |
| Investigation centers | `investigations.html` | Public |
| AI assistant | `chatbot.html` | Registered users |
| Dashboard (stats, favorites, order history) | `dashboard.html` | Registered users |
| Admin panel (CRUD + order management) | `admin.html` | Admin only |

## API Overview

| Group | Purpose |
|---|---|
| `/api/auth` | Register, login, current user |
| `/api/medicines` | Medicine CRUD, search, categories, cheaper-alternative recommendations (`/:id/related`) |
| `/api/doctors` | Doctor CRUD, search, locations, specialties |
| `/api/chat` | AI assistant (requires login) and chat history |
| `/api/favorites` | Favorite doctors |
| `/api/reviews` | Doctor ratings and reviews |
| `/api/diseases` | Disease CRUD with related doctors/investigations |
| `/api/guidelines` | Guideline CRUD, national/international filter |
| `/api/investigations` | Investigation center CRUD |
| `/api/cart` | Cart items (add, update quantity, remove, clear) |
| `/api/orders` | Checkout, order history, admin order list, status updates |

Authentication uses Bearer tokens: protected endpoints expect the `Authorization: Bearer <token>` header. All write operations on catalog data (medicines, doctors, diseases, guidelines, investigation centers) and order status updates require the admin role.

## Project Structure

```text
database/      Database bootstrap, migrations, and seed scripts
middleware/    Auth middleware (JWT verification, admin check)
public/        Static frontend pages, CSS, and JavaScript
routes/        Express route handlers
server.js      Application entry point
```

## Notes

- The app uses a local SQLite file at `database/medical.db`, saved every 5 seconds and on shutdown.
- API requests are rate limited under `/api/` to help prevent abuse.
- Placing an order snapshots each item's name and price into `order_items`, so past orders remain accurate even if a medicine is later edited or deleted.
- Deleting a medicine also removes it from user carts; deleting a doctor removes their favorites and reviews.

## Troubleshooting

- **Server exits immediately** — `JWT_SECRET` is missing from `.env`.
- **`EADDRINUSE` on startup** — a previous server instance is still running; stop it (see Run the Project).
- **"Login failed."** — usually means the server started without a valid `JWT_SECRET` (older versions) or the token secret changed; log in again to get a fresh token.
- **No seeded data** — run the seed scripts after the database is initialized.
- Changing admin credentials in `.env` only affects a fresh database; delete `database/medical.db` if you want to recreate it from scratch.

## License

No license file is currently included. Add one if you want to publish or share the project publicly.
