# Build Process — Dev Workflow & Deployment

## Local Development Setup

### Prerequisites
- Node.js 20+ (via nvm recommended)
- npm 10+
- MongoDB (local or Atlas)
- Git

### One-Time Setup
```bash
git clone https://github.com/TOWSIF-ABRAR-SAHIL/rent-bike-cox.git
cd rent-bike-cox

# Configure git hooks
git config core.hooksPath .githooks

# Backend setup
cd backend
cp .env.example .env      # Edit with your credentials
npm install

# Frontend setup
cd ../frontend
cp .env.example .env      # Edit VITE_API_URL
npm install
```

### Running Locally

**Backend** (port 5000):
```bash
cd backend
npm run dev    # nodemon (auto-restart on changes)
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev    # Vite dev server with HMR
```

**Docker** (backend + MongoDB):
```bash
docker-compose up --build
```

### Available Commands

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | backend/ | Start backend with nodemon |
| `npm run dev` | frontend/ | Start Vite dev server |
| `npm run lint` | frontend/ | ESLint check (no typecheck) |
| `npm run build` | frontend/ | Production build |
| `node scripts/seedAdmin.js` | backend/ | Seed admin user |
| `node seed.js` | backend/ | Seed admin (simple) |
| `node seedDemo.js` | backend/ | Seed demo data |
| `docker-compose up --build` | root/ | Docker dev environment |

## Code Quality

### ESLint (Frontend)
```bash
cd frontend && npm run lint
```
- Strict rules enforced
- Context hooks must be in separate files from providers
- React 19 purity rules (no Date.now() in render)

### No TypeScript
- Project uses plain JavaScript
- Frontend has no typecheck command
- Only `npm run lint` for code quality

## Git Workflow

### Branch Protection
- `main` is protected
- Force push allowed via GitHub rule exceptions (for repo owner)
- Always commit with: `git add -A && git commit -m "type: description"`

### Commit Convention
Format: `type: description`

Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

```
feat: add fleet management dashboard
fix: correct payment amount calculation
docs: update README deployment instructions
refactor: migrate console.log to winston
chore: update npm dependencies
```

## Build Process

### Frontend Production Build
```bash
cd frontend && npm run build
```
Output: `frontend/dist/` (static files served by Vite or Vercel)

### Backend
No build step — Node.js runs directly. Dependencies installed via `npm install`.

### Docker Build
```bash
docker-compose up --build
```
- Backend: `node:20-alpine` image, non-root user, health check
- MongoDB: `mongo:7` with persistent volume

## Deployment

### Backend — Render

**Via render.yaml (Blueprint):**
1. Push code to GitHub `main`
2. Go to Render Dashboard → New → Blueprint
3. Select repo → Render auto-detects `render.yaml`
4. Set environment variables in dashboard (never in yaml for secrets)

**Manual Setup:**
1. New → Web Service → Connect GitHub repo
2. Settings:
   - Name: `rent-bike-backend`
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Plan: Free
3. Environment variables:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASS`, `SSLCOMMERZ_IS_LIVE=false`
   - `BACKEND_URL` = `https://rent-bike-backend.onrender.com`
   - `FRONTEND_URL` = `https://rent-bike-cox.vercel.app`
4. Deploy → Wait 2-5 min → Verify `GET /api/health` returns `{"status":"ok"}`

### Frontend — Vercel

1. Go to vercel.com → New Project → Import GitHub repo
2. Settings:
   - Framework: Vite
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Environment variables:
   - `VITE_API_URL` = `https://rent-bike-backend.onrender.com/api`
4. Deploy → Wait 1-2 min → Site live at `https://rent-bike-cox.vercel.app`

### Post-Deploy Checklist

- [ ] Test health endpoint: `GET /api/health`
- [ ] Test admin login: `admin@rentbikecox.com` / `admin123`
- [ ] Test renter login: `renter@rentbikecox.com` / `renter123`
- [ ] Test user login: `user@rentbikecox.com` / `user123`
- [ ] Browse homepage on live URL
- [ ] Test theme switcher (Light/Dark/System)
- [ ] Configure SSLCommerz callback URLs:
  - Success: `https://rent-bike-backend.onrender.com/api/payment/success`
  - Fail: `https://rent-bike-backend.onrender.com/api/payment/fail`
  - Cancel: `https://rent-bike-backend.onrender.com/api/payment/cancel`
  - IPN: `https://rent-bike-backend.onrender.com/api/payment/ipn`
- [ ] Whitelist Render IPs in MongoDB Atlas (or `0.0.0.0/0` for testing)

## CI/CD

### GitHub Actions

**ci.yml** — Runs on push/PR to `main`:
- ESLint check (frontend)
- Vite production build (frontend)
- Node.js syntax check (backend)

**deploy.yml** — Deploy triggers:
- Push to `main` triggers Render + Vercel auto-deploy

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Render cold start (30s delay) | Free tier sleeps after 15min inactivity. First request wakes it. |
| MongoDB connection refused | Check IP whitelist in Atlas. Add `0.0.0.0/0` for testing. |
| CORS error (403) | Check `FRONTEND_URL` env var matches your Vercel URL. |
| SPA routes return 404 on Vercel | Ensure `vercel.json` is in `frontend/` directory (not repo root). |
| SSLCommerz callback fails | Verify `BACKEND_URL` is correct and SSLCommerz URLs match. |
| `req.query` error in middleware | Express 5 doesn't allow setting `req.query`. Use custom sanitize.js. |
