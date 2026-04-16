# Команды для автоматизации
.PHONY: deploy build push clean

# Главная команда: собрать и отправить
deploy: build push clean

# Сборка проекта
build:
	@echo "📦 Building frontend..."
	npm run build --prefix frontend
	@echo "🐳 Building Docker images..."
	docker compose build

# Отправка на сервер
push:
	@echo "📦 Exporting images to .tar..."
	docker save localhost:5000/frontend:latest -o frontend_tmp.tar
	docker save localhost:5000/backend_api:latest -o backend_tmp.tar
	@echo "☁️ Uploading and pushing to remote (using 'remote' context)..."
	docker context use remote
	docker load -i frontend_tmp.tar
	docker push localhost:5000/frontend:latest
	docker load -i backend_tmp.tar
	docker push localhost:5000/backend_api:latest
	docker context use default

# Удаление временных файлов
clean:
	@echo "🧹 Cleaning up..."
	@if exist frontend_tmp.tar del /f /q frontend_tmp.tar
	@if exist backend_tmp.tar del /f /q backend_tmp.tar
	@echo "✅ Done! Watchtower will update the containers soon."
