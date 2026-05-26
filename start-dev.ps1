# ─────────────────────────────────────────────────────────────────────────────
# TinyBit Dev Startup Script
# Starts backend + cloudflared tunnel, auto-updates .env with the live URL
# Usage: Right-click → "Run with PowerShell"  OR  .\start-dev.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "SilentlyContinue"
$cfPath = "C:\Users\Dream\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
$cfLog  = "$env:TEMP\tinybit_cf.txt"
$rootEnv = Join-Path $PSScriptRoot ".env"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TinyBit Dev Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── 1. Kill stale cloudflared processes ──────────────────────────────────────
Write-Host "`n[1/4] Clearing old tunnel..." -ForegroundColor Yellow
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item $cfLog -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# ── 2. Start backend server ───────────────────────────────────────────────────
Write-Host "[2/4] Starting backend server..." -ForegroundColor Yellow
$serverPath = Join-Path $PSScriptRoot "server"
$serverProc = Start-Process -FilePath "node" -ArgumentList "src/index.js" `
    -WorkingDirectory $serverPath -WindowStyle Minimized -PassThru
Start-Sleep -Seconds 2

$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($health.status -eq "ok") {
    Write-Host "  ✅ Backend running on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Backend may still be starting..." -ForegroundColor DarkYellow
}

# ── 3. Start cloudflared tunnel ───────────────────────────────────────────────
Write-Host "[3/4] Starting Cloudflare tunnel..." -ForegroundColor Yellow

# Find cloudflared if not at expected path
if (-not (Test-Path $cfPath)) {
    $cfPath = (Get-ChildItem "C:\Users\Dream\AppData\Local\Microsoft\WinGet" -Recurse -Filter "cloudflared.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if (-not $cfPath -or -not (Test-Path $cfPath)) {
    Write-Host "  ❌ cloudflared not found. Run: winget install Cloudflare.cloudflared" -ForegroundColor Red
    exit 1
}

Start-Process -FilePath $cfPath `
    -ArgumentList "tunnel --url http://localhost:5000" `
    -RedirectStandardError $cfLog `
    -WindowStyle Hidden

# Wait up to 20 seconds for the URL to appear
$tunnelUrl = $null
Write-Host "  Waiting for tunnel URL" -NoNewline -ForegroundColor Yellow
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Yellow
    $logContent = Get-Content $cfLog -Raw -ErrorAction SilentlyContinue
    $match = [regex]::Match($logContent, 'https://[a-z0-9\-]+\.trycloudflare\.com')
    if ($match.Success) {
        $tunnelUrl = $match.Value
        break
    }
}
Write-Host ""

if (-not $tunnelUrl) {
    Write-Host "  ❌ Could not get tunnel URL. Check internet connection." -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Tunnel: $tunnelUrl" -ForegroundColor Green

# ── 4. Write URL to root .env ─────────────────────────────────────────────────
Write-Host "[4/4] Updating .env..." -ForegroundColor Yellow

$apiUrl = "$tunnelUrl/api"
$envLine = "EXPO_PUBLIC_API_BASE_URL=$apiUrl"

if (Test-Path $rootEnv) {
    $existing = Get-Content $rootEnv -Raw
    if ($existing -match "EXPO_PUBLIC_API_BASE_URL") {
        # Replace existing line
        $updated = $existing -replace "EXPO_PUBLIC_API_BASE_URL=.*", $envLine
        Set-Content $rootEnv $updated -NoNewline
    } else {
        # Append
        Add-Content $rootEnv "`n$envLine"
    }
} else {
    # Create new .env
    Set-Content $rootEnv $envLine
}

Write-Host "  ✅ .env updated: $envLine" -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ All systems GO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend : http://localhost:5000" -ForegroundColor White
Write-Host "  Tunnel  : $tunnelUrl" -ForegroundColor White
Write-Host "  API URL : $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Now run in a NEW terminal:" -ForegroundColor Yellow
Write-Host "  npx expo start --clear" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep this window open to maintain the tunnel." -ForegroundColor DarkGray
Write-Host ""

# Keep window open so tunnel stays alive
Read-Host "Press Enter to stop the tunnel and exit"
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Tunnel stopped. Bye!" -ForegroundColor DarkGray
