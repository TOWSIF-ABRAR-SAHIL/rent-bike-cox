# Rent Bike Cox's Bazar

Motorcycle and car rental platform for Cox's Bazar. Role-based access (Admin, Renter, User), identity verification via NID/license uploads, SSLCommerz payments (bKash, Nagad, bank), and printable rental invoices.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express 5, Mongoose 9, MongoDB
- **Auth:** JWT (bcryptjs)
- **Payments:** SSLCommerz
- **File Uploads:** Cloudinary (via multer)

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for NID/license/bike photo uploads)
- SSLCommerz sandbox account (for payment testing)

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # fill in your credentials
node scripts/seedAdmin.js   # creates admin@rentbikecox.com / admin123
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env    # set VITE_API_URL
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.

## Project Docs

| File | Purpose |
|---|---|
| `AGENTS.md` | Architecture guide, commands, gotchas for AI agents & new devs |
| `CONTRIBUTING.md` | Commit convention, branch protection, git hooks setup |
| `RULES.md` | Business rules, fine policies, pricing |
| `PROJECT_PLAN.md` | Remaining tasks (deployment) |
