# NSE Market Analytics Platform - Production Startup (Docker Compose)
# Run: .\start-prod.ps1

Write-Host "=== NSE Market Analytics Platform - Production ===" -ForegroundColor Cyan

# Check prerequisites
try { docker info | Out-Null; Write-Host "[OK] Docker running" -ForegroundColor Green }
catch { Write-Host "[ERROR] Docker not running" -ForegroundColor Red; exit 1 }

if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found. Run: Copy-Item .env.example .env" -ForegroundColor Red
    exit 1
}

Write-Host "Building and starting all services..." -ForegroundColor Yellow
docker-compose up -d --build

Write-Host "`nWaiting for services to be healthy (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

docker-compose ps

Write-Host ""
Write-Host "=== Platform is Ready ===" -ForegroundColor Green
Write-Host "  Dashboard:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:        http://localhost:3001/api" -ForegroundColor White
Write-Host "  AI Service: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Login: admin@nseanalytics.com / Admin@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs: docker-compose logs -f [service]" -ForegroundColor Gray
Write-Host "Stop: docker-compose down" -ForegroundColor Gray
