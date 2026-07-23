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
```bash
# Terminal 1: Backend (port 5000)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

### Environment Variables

**Backend `.env`** (required):
```
MONGODB_URI=mongodb+srv://...         # or mongodb://localhost:27017/rentbike
JWT_SECRET=<64-char-hex>
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SSL_STORE_ID=
SSL_STORE_PASS=
SSL_IS_LIVE=false
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`** (required):
```
VITE_API_URL=http://localhost:5000/api
```

## Scripts

### Backend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Nodemon auto-restart on changes |
| `start` | `npm start` | Production start (node server.js) |
| `test` | `npm test` | Stub (echo "no tests") |

### Frontend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Vite dev server with HMR |
| `build` | `npm run build` | Production build → `dist/` |
| `lint` | `npm run lint` | ESLint check |
| `preview` | `npm run preview` | Preview production build locally |

### Seed Scripts (from `backend/`)
```bash
node scripts/seedAdmin.js     # Create admin user
node seed.js                  # Create admin (simpler)
node seedDemo.js              # Create renter + user + categories + 10 bikes
```

**Note:** `seedDemo.js` calls `process.exit()` — must restart server after running.

**Dev-only endpoint:**
```
GET http://localhost:5000/api/seed-temp
```
Creates: 3 users + 5 categories + 10 bikes. Only works when `NODE_ENV !== 'production'`.

## Commit Convention

Enforced by `.githooks/commit-msg` hook:
```
type: description
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

Examples:
```
feat: add delete bike API endpoint
fix: resolve image fallback for broken URLs
docs: update AGENTS.md architecture
```

## Git Workflow

### Branch Protection
- Branch protection is ON for `main`
- Requires PR reviews
- Stale review dismissal enabled
- Force push blocked
- Admin bypass available

### PR Workflow (from now on)
```bash
git checkout -b feat/my-feature
git add .
git commit -m "feat: my feature"
git push origin feat/my-feature
gh pr create --title "feat: my feature" --body "Description"
```

### Direct Push (legacy, bypassed)
Previously used admin bypass to push directly to main. Now using PR workflow.

## Deployment

### Backend (Render)
- **Config:** `render.yaml`
- **Build:** `cd backend && npm install`
- **Start:** `cd backend && node server.js`
- **Env vars:** Set in Render dashboard (not in yaml)
  - `MONGODB_URI` (Atlas connection string)
  - `JWT_SECRET`
  - `CLOUDINARY_*`
  - `SSL_STORE_ID`, `SSL_STORE_PASS`, `SSL_IS_LIVE`
  - `BACKEND_URL` (Render service URL)
  - `FRONTEND_URL` (Vercel URL)
  - `NODE_ENV=production`

### Frontend (Vercel)
- **Config:** `vercel.json`
- **SPA catch-all:** `"/(.*)"` → `"/index.html"`
- **Env vars:** Set in Vercel dashboard
  - `VITE_API_URL` (Render backend URL + `/api`)

### Database (MongoDB Atlas)
- Cluster: `rentbike.jcglevo.mongodb.net`
- Database: `rentbike`
- User: `rentbike` / `RentBike2026!`
- Free M0 tier (512MB)

## Testing

### Smoke Test (manual, 24 checks)
```bash
# 1. Health
curl http://localhost:5000/api/health

# 2. Auth
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentbikecox.com","password":"admin123"}'

# 3. Dashboard (with token)
curl http://localhost:5000/api/dashboard/settings \
  -H "Authorization: Bearer <token>"

# ... (full list in AGENTS.md)
```

### Lint Check
```bash
cd frontend && npm run lint
```

### Build Check
```bash
cd frontend && npm run build
```

## Project Files Reference

| File | Purpose | Committed |
|------|---------|-----------|
| `CREDENTIALS.md` | All secrets/credentials | No (gitignored) |
| `REDESIGN_PLAN.md` | UI/UX redesign roadmap | Yes |
| `RULES.md` | Business rules, pricing | Yes |
| `AGENTS.md` | Architecture documentation | Yes |
| `.env` (backend) | Server environment vars | No (gitignored) |
| `.env` (frontend) | VITE_API_URL | No (gitignored) |
| `.env.example` | Template for .env | Yes |
| `render.yaml` | Render deploy config | Yes |
| `vercel.json` | Vercel deploy config | Yes |
