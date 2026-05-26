# NSE Market Analytics Platform - Development Startup Script
# Run: .\start-dev.ps1

Write-Host "=== NSE Market Analytics Platform ===" -ForegroundColor Cyan
Write-Host "Starting development environment..." -ForegroundColor Yellow

# Check Docker
try {
    docker info | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check .env
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] .env not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[WARN] Please edit .env and add your API keys, then re-run this script." -ForegroundColor Yellow
    notepad ".env"
    exit 0
}
Write-Host "[OK] .env file found" -ForegroundColor Green

# Start infrastructure (PostgreSQL + Redis)
Write-Host "`nStarting PostgreSQL and Redis..." -ForegroundColor Cyan
docker-compose up -d postgres redis

Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "[SKIP] node_modules already exists" -ForegroundColor Gray
}
Pop-Location

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "[SKIP] node_modules already exists" -ForegroundColor Gray
}
Pop-Location

Write-Host "`n=== Starting Services ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Backend API (port 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend API' -ForegroundColor Cyan; npm run start:dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "=== AI Service (Optional) ===" -ForegroundColor Yellow
Write-Host "To start the Python AI service manually:" -ForegroundColor Gray
Write-Host "  cd ai-service" -ForegroundColor Gray
Write-Host "  python -m venv venv" -ForegroundColor Gray
Write-Host "  .\venv\Scripts\activate" -ForegroundColor Gray
Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
Write-Host "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Access URLs ===" -ForegroundColor Cyan
Write-Host "  Dashboard:   http://localhost:3000" -ForegroundColor White
Write-Host "  API:         http://localhost:3001/api" -ForegroundColor White
Write-Host "  Swagger:     http://localhost:3001/docs" -ForegroundColor White
Write-Host "  AI Service:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Login:  admin@nseanalytics.com / Admin@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop this script (services continue in separate windows)" -ForegroundColor Gray
