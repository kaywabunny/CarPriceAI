# Build and start script for carpricebkk
# Make sure Docker Desktop is running before executing this script.
#
# Usage:
#   .\build-and-start.ps1           - build (use cache) and start
#   .\build-and-start.ps1 -Rebuild  - full rebuild (no cache), then start (takes ~10-15 min)

param(
    [switch]$Rebuild
)

if ($Rebuild) {
    Write-Host "Stopping and removing containers..." -ForegroundColor Cyan
    docker compose down
    Write-Host "Full rebuild (no cache) - this may take 10-15 minutes..." -ForegroundColor Cyan
    docker compose build --no-cache backend frontend
} else {
    Write-Host "Building Docker images (using cache)..." -ForegroundColor Cyan
    docker compose build
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Starting services..." -ForegroundColor Green
    docker compose up -d

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Services started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To view logs:" -ForegroundColor Cyan
        Write-Host "  docker compose logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "To stop services:" -ForegroundColor Cyan
        Write-Host "  docker compose down" -ForegroundColor White
    } else {
        Write-Host "Failed to start services" -ForegroundColor Red
    }
} else {
    Write-Host "Build failed. Please check the error messages above." -ForegroundColor Red
}
