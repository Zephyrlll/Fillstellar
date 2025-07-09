# Cosmic Gardener Game Launcher (PowerShell版)
param(
    [switch]$Dev,
    [switch]$NoOpen
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    Cosmic Gardener Game Launcher" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"

# バックエンドの起動
Write-Host "[1/4] バックエンドサーバーを起動中..." -ForegroundColor Green
Set-Location $backendDir

if ($Dev) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Backend Server Logs' -ForegroundColor Yellow; cargo run --no-default-features"
} else {
    Start-Process powershell -ArgumentList "-WindowStyle", "Minimized", "-Command", "cargo run --no-default-features"
}

Write-Host "    - バックエンドサーバーを起動しました" -ForegroundColor DarkGreen

# 待機
Write-Host ""
Write-Host "[2/4] バックエンドの準備を待機中..." -ForegroundColor Green
Start-Sleep -Seconds 10

# ヘルスチェック
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "    - バックエンドが正常に起動しました ✓" -ForegroundColor DarkGreen
    }
} catch {
    Write-Host "    - バックエンドの確認に失敗しました（通常は問題ありません）" -ForegroundColor Yellow
}

# フロントエンドの起動
Write-Host ""
Write-Host "[3/4] フロントエンドサーバーを起動中..." -ForegroundColor Green
Set-Location $frontendDir

if ($Dev) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Frontend Server Logs' -ForegroundColor Yellow; python -m http.server 8000"
} else {
    Start-Process powershell -ArgumentList "-WindowStyle", "Minimized", "-Command", "python -m http.server 8000"
}

Write-Host "    - フロントエンドサーバーを起動しました" -ForegroundColor DarkGreen

# ブラウザを開く
if (-not $NoOpen) {
    Write-Host ""
    Write-Host "[4/4] ブラウザでゲームを開いています..." -ForegroundColor Green
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:8000"
    Write-Host "    - ブラウザでゲームを開きました" -ForegroundColor DarkGreen
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       ゲーム起動完了！" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($Dev) {
    Write-Host "開発モード情報:" -ForegroundColor Yellow
    Write-Host "- Backend URL:  http://localhost:8080" -ForegroundColor White
    Write-Host "- Frontend URL: http://localhost:8000" -ForegroundColor White
    Write-Host "- Health Check: http://localhost:8080/health" -ForegroundColor White
    Write-Host "- WebSocket:    ws://localhost:8080/ws" -ForegroundColor White
    Write-Host ""
}

Write-Host "ゲームを終了するには:" -ForegroundColor Yellow
Write-Host "- stop-game.bat を実行" -ForegroundColor White
Write-Host "- または手動で両方のサーバーを停止" -ForegroundColor White
Write-Host ""

Read-Host "Enterキーを押すと終了します"