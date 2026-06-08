# =============================================================================
# Lumeo LMS — Makefile
# Использование: make <команда>
# =============================================================================

.PHONY: help up down restart logs pull update backup restore status clean

COMPOSE = docker compose

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""

up: ## Запустить все сервисы
	$(COMPOSE) up -d
	@echo "✅ Lumeo запущен"
	@$(COMPOSE) ps

down: ## Остановить все сервисы
	$(COMPOSE) down

restart: ## Перезапустить server и client (без БД)
	$(COMPOSE) restart server client
	@$(COMPOSE) ps

restart-all: ## Перезапустить все сервисы
	$(COMPOSE) restart

logs: ## Показать логи (последние 100 строк, live)
	$(COMPOSE) logs -f --tail=100

logs-server: ## Логи только сервера
	$(COMPOSE) logs -f --tail=100 server

logs-db: ## Логи PostgreSQL
	$(COMPOSE) logs -f --tail=50 postgres

pull: ## Скачать последние образы
	$(COMPOSE) pull server client

update: pull ## Обновить до последней версии
	$(COMPOSE) up -d server client
	@echo "✅ Обновление завершено"
	@$(COMPOSE) ps

status: ## Статус контейнеров
	$(COMPOSE) ps

backup: ## Создать резервную копию БД
	@bash backup.sh

restore: ## Восстановить из резервной копии (make restore FILE=backups/lumeo_xxx.sql.gz)
	@bash restore.sh $(FILE)

db-shell: ## Открыть psql в контейнере
	$(COMPOSE) exec postgres psql -U $$DB_USER $$DB_NAME

clean: ## Удалить остановленные контейнеры и неиспользуемые образы
	docker system prune -f
	@echo "✅ Очистка завершена"
