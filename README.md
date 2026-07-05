# Medica

Medica is a Bangladesh-focused medical information, doctor finder, and e-pharmacy platform built with Node.js, Express, and a lightweight SQL.js database. It includes public-facing pages for medicines, doctors, diseases, clinical guidelines, investigation centers, and an AI health assistant, plus authentication, favorites, reviews, medicine purchasing with order tracking, and an admin area.

## Features

- Medicine directory with uses, dosage, side effects, warnings, categories, and prices
- E-pharmacy: cart, checkout with shipping details, order history, and category-based medicine recommendations
- Doctor directory with search, profiles, favorites, and reviews
- Disease knowledge base with symptoms, diagnosis, treatment, and prevention
- National and international medical guideline listings
- Investigation and diagnostic center directory
- AI health assistant/chat page
- User registration, login, and JWT-based authentication
- Admin account support for protected areas, including order/shipping management
- Persistent local database stored in `database/medical.db`

## Tech Stack

- Backend: Node.js, Express
- Database: SQL.js (SQLite in JavaScript)
- Authentication: JSON Web Tokens, bcryptjs
- Middleware: CORS, rate limiting
- Frontend: Static HTML, CSS, and vanilla JavaScript

## Prerequisites

- Node.js 18 or newer
- npm
- A terminal with access to the project folder

## Installation

1. Open a terminal in the project root.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root if you do not already have one.

## Environment Variables

The app reads these variables from `.env`:

```env
PORT=3000
JWT_SECRET=your-super-secret-key
ADMIN_EMAIL=admin@bdmedical.com
ADMIN_PASSWORD=admin123
```

- `PORT` is optional. If omitted, the server uses `3000`.
- `JWT_SECRET` is required for login and token verification.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are optional. If omitted, the app uses the defaults shown above and creates the admin user automatically on first run.

## Database Setup

The database is created automatically the first time the server starts. The initialization step creates the required tables and ensures an admin account exists.

If you want to load sample data, run the seed scripts after installation:

```bash
npm run seed
npm run seed-modules
npm run import-dims
```

These scripts populate the database with medical content such as medicines, doctors, diseases, guidelines, and investigation centers.

## Run the Project

Start the application with:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The server serves the static frontend from the `public/` folder and exposes the API under `/api`.

## Available Scripts

- `npm start` - starts the server
- `npm run dev` - starts the server in the same way as `start`
- `npm run seed` - seeds medicines and doctors
- `npm run seed-modules` - seeds diseases, guidelines, and investigation centers
- `npm run import-dims` - imports additional medicine data

## Main Pages

The frontend includes these pages under `public/`:

- Home: `index.html`
- Login and registration: `login.html`, `register.html`
- Doctor directory: `doctors.html`
- Medicine directory: `medicines.html`
- Disease knowledge base: `diseases.html`
- Medical guidelines: `guidelines.html`
- Investigation centers: `investigations.html`
- AI assistant/chat: `chatbot.html`
- Shopping cart and checkout: `cart.html`
- Dashboard (with order history): `dashboard.html`
- Admin panel (with order management): `admin.html`

## API Overview

The server mounts these API groups:

- `/api/auth`
- `/api/medicines`
- `/api/doctors`
- `/api/chat`
- `/api/favorites`
- `/api/reviews`
- `/api/diseases`
- `/api/guidelines`
- `/api/investigations`
- `/api/cart`
- `/api/orders`

Authentication uses Bearer tokens. Protected endpoints expect the `Authorization: Bearer <token>` header.

## Project Structure

```text
database/      Database bootstrap and seed scripts
middleware/    Auth middleware
public/        Static frontend pages, CSS, and JavaScript
routes/        Express route handlers
server.js      Application entry point
```

## Notes

- The app uses a local SQLite file at `database/medical.db`.
- Seed scripts are idempotent and only insert missing records.
- API requests are rate limited under `/api/` to help prevent abuse.
- If the JWT secret is missing or incorrect, login and protected endpoints will fail.

## Troubleshooting

- If the server fails to start, confirm that `JWT_SECRET` is set in `.env`.
- If you do not see seeded data, run the seed scripts again after the database is initialized.
- If you change admin credentials in `.env`, delete `database/medical.db` only if you want to recreate the local database from scratch.

## License

No license file is currently included. Add one if you want to publish or share the project publicly.