# Full clean rebuild - use this when "nothing is fixing" so we're sure you're running the latest code.
# Run from project root: .\clean-rebuild.ps1

param(
    [switch]$Docker   # If set, rebuild Docker images (no cache). Otherwise only frontend.
)

$ErrorActionPreference = "Stop"

Write-Host "=== Clean rebuild ===" -ForegroundColor Cyan

# 1. Clean frontend build artifacts
Write-Host "Cleaning frontend build and cache..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
if (Test-Path "build") { Remove-Item -Recurse -Force build }
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue }
Set-Location $PSScriptRoot

# 2. Rebuild frontend
Write-Host "Building frontend (npm run build)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed." -ForegroundColor Red
    Set-Location $PSScriptRoot
    exit 1
}
Set-Location $PSScriptRoot

if ($Docker) {
    Write-Host "Rebuilding Docker images (no cache)..." -ForegroundColor Yellow
    docker compose build --no-cache frontend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker build failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "Restarting containers..." -ForegroundColor Yellow
    docker compose up -d
    Write-Host ""
    Write-Host "Done. Open http://localhost:3000 and do a HARD REFRESH (Ctrl+Shift+R or Ctrl+F5)." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Frontend build done. To run with Docker: .\clean-rebuild.ps1 -Docker" -ForegroundColor Green
    Write-Host "Or run 'npm start' in the frontend folder and open http://localhost:3000" -ForegroundColor Green
}
