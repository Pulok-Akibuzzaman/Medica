# Medica

Bangladesh-focused medical information, doctor finder, and e-pharmacy platform built with Node.js, Express, and SQL.js.

## Prerequisites

- Node.js 18 or newer
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   PORT=3000
   JWT_SECRET=your-super-secret-key
   ADMIN_EMAIL=admin@bdmedical.com
   ADMIN_PASSWORD=admin123
   ```

   `JWT_SECRET` is **required** — the server refuses to start without it. `PORT`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are optional (defaults shown).

3. Load data — pick one:

   - Full real datasets (recommended — ~21,700 medicines, ~6,200 doctors, 39 diseases):

     ```bash
     npm run import-medicines   # needs database/medicine.csv + generic.csv
     npm run import-doctors     # needs database/doctors_combined_data.csv
     npm run import-diseases    # needs database/DiseaseAndSymptoms.csv + "Disease precaution.csv"
     ```

     Each of these needs its source CSV(s) present in `database/`, and each wipes and replaces the table(s) it owns — run them once, on a stopped server (see below).

   - Or a small hand-written placeholder set, if the CSVs aren't available:

     ```bash
     npm run seed
     ```

4. Start the server:

   ```bash
   npm start
   ```

   Then open `http://localhost:3000`.

## Important

- Never run two server instances at once, and never run an import while the server is running — the app keeps its database in memory and saves it to `database/medical.db` every 5 seconds, so anything else running at the same time (another server, an import script) gets silently overwritten.
- If `npm start` fails with `EADDRINUSE`, a previous instance is still running. Stop it first:

  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess -Force
  ```
