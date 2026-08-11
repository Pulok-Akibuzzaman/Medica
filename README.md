# 🏥 Medica - Healthcare, E-Pharmacy & Delivery Platform

**Medica** is a comprehensive, Bangladesh-focused healthcare ecosystem providing an E-Pharmacy, Doctor Appointment Booking system, AI Symptom Assistant, Medical Profile Tracking, and an integrated **Delivery Personnel Portal**.

---

## ✨ Key Features

### 🛒 E-Pharmacy & Medicine Directory
- **21,700+ Real Brand Medicines & Generics** sourced from Medex Bangladesh.
- Full text search by brand name, generic ingredient, indication, or manufacturer.
- Interactive Shopping Cart, Checkout System, Stock Tracking, and Order History.

### 🚚 Delivery Personnel System
- Dedicated **Delivery Portal** (`delivery.html`) for delivery staff.
- View assigned orders, customer phone numbers, delivery addresses, and order items.
- **✨ Available Orders**: Claim unassigned orders waiting for pickup in 1 click.
- Real-time **Status & Live Location Updates** (Warehouse, Out for Delivery, Delivered).
- Direct call links for customer contact.

### 👨‍⚕️ Doctor Finder & Appointment Scheduling
- **6,200+ Verified Bangladesh Doctors** searchable by specialty, hospital, and city.
- Rating & Review system, Consultation fee listing, and Favorite Doctor bookmarks.
- Online Appointment Booking with instant schedule management.

### 🤖 AI Symptom Assistant & Clinical Knowledge
- AI-powered symptom analyzer providing instant specialist recommendations.
- **Disease & Symptom Guide**: Causes, symptoms, diagnosis, and prevention for major conditions.
- **National & International Clinical Guidelines** (BMDC, WHO, GINA).
- **Diagnostic Center Directory**: Diagnostic centers, tests offered, opening hours, and contact details.

### ⏰ Dosage Reminders & Personal Health Profile
- Custom medicine reminder schedules with browser notification support.
- Comprehensive Medical Profile (Blood Group, Allergies, Disabilities, Organ Donor Status, Chronic Conditions).

### 🌐 Multilingual & Modern UI Design System
- Dual Language support (**English** & **Bangla** toggle).
- Sleek Light/Dark Mode theme switcher.
- Responsive, mobile-first design with smooth micro-animations.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, REST APIs, JWT Authentication, bcryptjs.
- **Database**: SQLite / `sql.js` (In-memory execution with persistent disk export to `medical.db`).
- **Frontend**: HTML5, CSS3 Custom Properties, Vanilla JavaScript (ES6+), FontAwesome Icons.
- **Deployment**: **Vercel** (Frontend Static Site) + **Render** (Node.js Backend & Database).

---

## 🔑 Demo Account Credentials

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| **Admin** | `admin@bdmedical.com` | `admin123` | Full System & Order Management |
| **Delivery Person** | `delivery@bdmedical.com` | `delivery123` | 🚚 Delivery Personnel Portal |
| **Customer** | *(Register any email)* | *(Any password)* | E-Pharmacy, Appointments, Profile |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18.x or newer
- Git

### 1. Install Dependencies
```bash
git clone https://github.com/Pulok-Akibuzzaman/Medica.git
cd Medica
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
JWT_SECRET=super-secret-medica-jwt-key-2026
ADMIN_EMAIL=admin@bdmedical.com
ADMIN_PASSWORD=admin123
DELIVERY_EMAIL=delivery@bdmedical.com
DELIVERY_PASSWORD=delivery123
DB_PATH=./database/medical.db
```

### 3. Start the Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## ☁️ Cloud Deployment (Render & Vercel)

This project is configured for dual cloud deployment:

- **Backend API & Database (Render)**:
  - Repository contains pre-populated `database/medical.db` containing all 21,712 medicines, 6,213 doctors, 41 diseases, and admin/delivery accounts.
  - Automatically starts via `npm start` on Render's Free tier without high memory usage.
- **Frontend Website (Vercel)**:
  - Deployed via `vercel.json` static configuration.
  - Automatically proxies `/api/*` requests to your Render backend API.

See the complete step-by-step instructions in the [Deployment Guide](deployment_guide.md).

---

## 📄 License
This project is developed for CSE479 Senior Design / Capstone Project.
