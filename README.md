# Business Cloud Infrastructure

Учебный проект по созданию облачной инфраструктуры с использованием Docker Compose, Nginx и системы автоматического обновления контейнеров.

## 🏗 Архитектура проекта

Проект представляет собой готовую среду для развертывания веб-приложений с базой данных, панелью управления и собственным Docker Registry.

```mermaid
graph TD
    Client((Клиент)) -- 80/443 --> Nginx[Nginx Proxy]
    Nginx -- /pgadmin --> pgAdmin[pgAdmin 4]
    Nginx -- / --> Backend[Backend API (в планах)]
    pgAdmin -- internal --> Postgres[PostgreSQL 16]
    Registry[Docker Registry] -- 5000 --> Client
    Watchtower[Watchtower] -- monitoring --> AllContainers[Все контейнеры]
```

## 🛠 Компоненты

- **Nginx**: Единая точка входа, проксирование трафика.
- **PostgreSQL 16**: Основное хранилище данных.
- **pgAdmin 4**: Веб-интерфейс для управления базой данных.
- **Docker Registry**: Локальное хранилище для ваших Docker-образов.
- **Watchtower**: Автоматически обновляет контейнеры при появлении новых версий образов в реестре.

## 🚀 Быстрый старт

### Требования
- Установленный Docker и Docker Compose.
- Настроенный SSH-доступ к серверу.

### Установка
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/ваш-аккаунт/business-test.git
   cd business-test
   ```

2. Подготовьте переменные окружения:
   ```bash
   cp .env.example .env
   # Отредактируйте .env, установив свои пароли
   ```

3. Настройте аутентификацию для реестра:
   ```bash
   # Если не установлен htpasswd: sudo apt install apache2-utils
   mkdir -p auth
   htpasswd -Bc auth/htpasswd admin
   ```

4. Запустите инфраструктуру:
   ```bash
   docker compose up -d
   ```

## 🔐 Безопасность
- Пароли хранятся только в `.env` (исключен из Git).
- База данных Postgres доступна только внутри внутренней сети Docker и не проброшена на внешние порты.
- pgAdmin защищен авторизацией и работает через прокси.

## 📅 Планы по доработке
- [ ] Добавить сервис Backend (Node.js/Python).
- [ ] Добавить сервис Frontend (React/Vue/Vite).
- [ ] Настройка SSL (Certbot/Let's Encrypt).
- [ ] Интеграция CI/CD через GitHub Actions.
