.PHONY: help secrets up down logs migrate test-backend build

help:
	@echo "Targets:"
	@echo "  secrets       Generate FERNET_KEY + SECRET_KEY"
	@echo "  up            docker compose up -d --build"
	@echo "  down          docker compose down"
	@echo "  logs          Follow backend+bot logs"
	@echo "  migrate       Run Alembic migrations"
	@echo "  test-backend  Run Python unit tests"
	@echo "  build         Build frontend production bundle"

secrets:
	bash scripts/generate-secrets.sh

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f backend bot

migrate:
	docker compose run --rm -e APP_ROLE=migrate backend

test-backend:
	cd backend && python -m pytest -q

build:
	cd frontend && npm ci && npm run build
