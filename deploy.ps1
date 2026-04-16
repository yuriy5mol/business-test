# Скрипт для автоматического деплоя
Write-Host "--- Start Deploy ---" -ForegroundColor Cyan

# 1. Сборка фронтенда
Write-Host "Building frontend..." -ForegroundColor Yellow
npm run build --prefix frontend

# 2. Сборка Docker-образов
Write-Host "Building Docker images..." -ForegroundColor Yellow
docker compose build

# 3. Упаковка в архивы
Write-Host "Packing images..." -ForegroundColor Yellow
docker save localhost:5000/frontend:latest -o frontend_tmp.tar
docker save localhost:5000/backend_api:latest -o backend_tmp.tar

# 4. Переброска на сервер и Пуш
Write-Host "Transferring to remote..." -ForegroundColor Yellow
docker context use remote

Write-Host " -> Frontend..."
docker load -i frontend_tmp.tar
docker push localhost:5000/frontend:latest

Write-Host " -> Backend..."
docker load -i backend_tmp.tar
docker push localhost:5000/backend_api:latest

# 5. Возврат в локальный режим и очистка
Write-Host "Cleaning up..." -ForegroundColor Yellow
docker context use default

if (Test-Path frontend_tmp.tar) { Remove-Item frontend_tmp.tar }
if (Test-Path backend_tmp.tar) { Remove-Item backend_tmp.tar }

Write-Host "Done! Watchtower will update the site soon." -ForegroundColor Green
