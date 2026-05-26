# AI-Powered NSE Market Data Automation & Analytics Platform

A production-grade full-stack platform that automatically downloads NSE India market data, processes it with AI/ML, and displays everything in a modern dashboard.

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Next.js    │◄──►│  NestJS API  │◄──►│ Python AI Svc   │
│  Frontend   │    │  Backend     │    │ (FastAPI + ML)  │
│  :3000      │    │  :3001       │    │ :8000           │
└─────────────┘    └──────┬───────┘    └────────┬────────┘
                          │                      │
                   ┌──────▼───────┐    ┌─────────▼───────┐
                   │  PostgreSQL  │    │     Redis        │
                   │  :5432       │    │    (BullMQ)      │
                   └──────────────┘    └─────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, ApexCharts |
| Backend | Node.js, NestJS, TypeORM, BullMQ, Socket.IO |
| AI Service | Python, FastAPI, scikit-learn, XGBoost, pandas |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| AI/LLM | OpenAI GPT-4o-mini, Anthropic Claude |
| Deployment | Docker, Docker Compose, Kubernetes |

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone and configure
```bash
git clone <your-repo>
cd "Share market"

# Copy and edit environment
cp .env.example .env
# Edit .env: add your OPENAI_API_KEY and other credentials
```

### 2. Start all services
```bash
docker-compose up -d
```

### 3. Access the platform
| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **Backend API** | http://localhost:3001/api |
| **API Docs (Swagger)** | http://localhost:3001/docs |
| **AI Service** | http://localhost:8000/docs |

### Default Login
```
Email:    admin@nseanalytics.com
Password: Admin@123
```

---

## Local Development Setup

### Backend
```bash
cd backend
npm install
# Ensure PostgreSQL and Redis are running (or use docker-compose for just infra)
docker-compose up -d postgres redis
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### AI Service
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Data Sources

| Source | URL | Schedule |
|--------|-----|----------|
| Lower Band Hitters | nseindia.com API | Daily 6:30 PM IST |
| Upper Band Hitters | nseindia.com API | Daily 6:30 PM IST |
| Volume Gainers | nseindia.com API | Daily 6:30 PM IST |
| Most Active Equities | nseindia.com API | Daily 6:30 PM IST |
| Bhav Copy CSV | nsearchives.nseindia.com | Daily 6:30 PM IST |

Scheduler cron: `30 18 * * 1-5` (IST timezone)

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| `/overview` | Market summary, sector heatmap, stat cards |
| `/lower-band` | Lower circuit hitters with filters & export |
| `/upper-band` | Upper circuit hitters with filters & export |
| `/volume-gainers` | Stocks with unusual volume surge |
| `/most-active` | Most actively traded equities |
| `/bhav-copy` | Daily NSE price snapshot |
| `/ai-insights` | AI-generated stock analysis scores |
| `/ai-signals` | High-probability trading signals |
| `/sector-analytics` | Sector-level heatmap & breakdown |
| `/historical` | Candlestick charts + technical indicators |
| `/watchlists` | Personal stock watchlists |
| `/chat` | AI chatbot for market queries |
| `/logs` | Job execution history |
| `/settings` | Profile, theme, password |

---

## REST API Endpoints

### Market Data
```
GET /api/lower-band-hitters
GET /api/upper-band-hitters
GET /api/volume-gainers
GET /api/most-active-equities
GET /api/bhav-copy
GET /api/available-dates/:table
GET /api/export/:table?date=YYYY-MM-DD
```

### AI Analytics
```
GET /api/ai/market-summary
GET /api/ai/stock-insights
GET /api/ai/stock-insights/:symbol
GET /api/ai/signals
GET /api/ai/alerts
GET /api/ai/watchlist-alerts
```

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
PUT  /api/auth/profile
PUT  /api/auth/change-password
```

### Admin
```
POST /api/admin/trigger-ingestion   (Admin role only)
```

### AI Service (Python)
```
GET  /api/indicators/stock/:symbol
GET  /api/indicators/market-breadth
GET  /api/indicators/top-signals
GET  /api/insights/sector-analysis
GET  /api/insights/historical/:symbol
POST /api/chat/ask
```

All API endpoints support: `?page=&limit=&search=&sortBy=&sortOrder=&date=&startDate=&endDate=`

---

## Technical Indicators

- RSI (14-period)
- MACD (12, 26, 9)
- EMA (10, 20, 50)
- SMA (20, 50, 200)
- Bollinger Bands (20, 2σ)
- ATR (14-period)
- VWAP
- Stochastic RSI

---

## AI Features

- Daily AI market summary (OpenAI/Claude)
- Per-stock insights (trend, momentum, risk scores)
- Breakout probability scoring
- Pattern detection (gap up/down, volume spike, breakout, consolidation)
- Sector intelligence
- ML direction prediction (Random Forest + XGBoost)
- Risk engine (volatility, liquidity, circuit risk)
- AI chatbot with live market context

> ⚠️ All AI predictions are probabilistic and NOT financial advice.

---

## Environment Variables

See `.env.example` for full list. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_*` | Yes | Database connection |
| `REDIS_*` | Yes | Redis connection |
| `JWT_SECRET` | Yes | Change in production! |
| `OPENAI_API_KEY` | Optional | Enables AI summaries & chat |
| `ANTHROPIC_API_KEY` | Optional | Alternative LLM |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram notifications |
| `SMTP_*` | Optional | Email notifications |

---

## Docker Compose Services

```yaml
services:
  postgres:   # PostgreSQL 16 (port 5432)
  redis:      # Redis 7 (port 6379)
  backend:    # NestJS API (port 3001)
  ai-service: # Python FastAPI (port 8000)
  frontend:   # Next.js (port 3000)
  nginx:      # Reverse proxy (port 80)
```

---

## Kubernetes Deployment

```bash
# Prerequisites: kubectl configured, Docker registry accessible

# Set registry and tag
export REGISTRY=your-registry.com
export TAG=v1.0.0

# Run deployment script
bash k8s/deploy.sh
```

Edit `k8s/secrets.yaml` with base64-encoded production secrets before deploying.

---

## Monitoring & Logs

- Application logs: `./logs/` directory (rotated daily, 30-day retention)
- Job execution logs: Dashboard → Job Logs page
- Health checks: `GET /api/health` (backend), `GET /health` (AI service)

---

## Security

- JWT authentication with role-based access (admin/user/analyst)
- Helmet.js security headers
- CORS protection
- API rate limiting (100 req/min per IP)
- SQL injection prevention (parameterised queries via TypeORM)
- Non-root Docker containers
- Secure environment variable handling

---

## Project Structure

```
Share market/
├── backend/           # NestJS API
│   └── src/
│       ├── auth/           # JWT auth, guards, strategies
│       ├── market-data/    # NSE data entities & service
│       ├── ai/             # AI insights & alerts
│       ├── jobs/           # Scheduler & job logs
│       ├── notifications/  # Email/Telegram/Slack
│       ├── websocket/      # Socket.IO gateway
│       ├── watchlist/      # User watchlists
│       ├── logs/           # Job log API
│       ├── health/         # Health check
│       ├── services/       # NSE scraper
│       ├── common/         # Shared DTOs
│       └── utils/          # Logger
│
├── frontend/          # Next.js 14 dashboard
│   └── src/
│       ├── app/            # App Router pages
│       ├── components/     # UI/chart/layout components
│       ├── hooks/          # React Query hooks
│       ├── lib/            # Axios API clients
│       ├── store/          # Zustand state
│       └── types/          # TypeScript interfaces
│
├── ai-service/        # Python FastAPI + ML
│   └── app/
│       ├── core/           # Config & database
│       ├── services/       # Technical indicators, ML models
│       └── routers/        # API endpoints
│
├── k8s/               # Kubernetes manifests
├── nginx/             # Nginx configuration
├── docker-compose.yml
├── .env               # Local environment (git-ignored)
└── .env.example       # Template
```

---

## License

MIT — Built for production use with NSE India market data.

> **Important:** This platform is for informational purposes only. All AI predictions and market analysis are NOT financial advice. Past performance does not guarantee future results. Trade at your own risk.
