# ===============================================
# Cosmic Gardener - Main Project Makefile
# ===============================================

# Variables
PROJECT_NAME := cosmic-gardener
FRONTEND_DIR := frontend
BACKEND_DIR := backend
DOCS_DIR := docs
INFRA_DIR := infra

# Colors for output
BLUE := \033[1;34m
GREEN := \033[1;32m
YELLOW := \033[1;33m
RED := \033[1;31m
NC := \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)🌌 Cosmic Gardener - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ===============================================
# Quick Start Commands
# ===============================================

.PHONY: setup
setup: ## Complete project setup
	@echo "$(BLUE)🚀 Setting up Cosmic Gardener...$(NC)"
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(YELLOW)Setting up backend environment...$(NC)"
	@cd $(BACKEND_DIR) && make setup
	@echo "$(GREEN)✅ Setup completed!$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "1. Run 'make dev' to start development servers"
	@echo "2. Visit http://localhost:3000 for the game"
	@echo "3. Visit http://localhost:8080/health for API health check"

.PHONY: dev
dev: ## Start full development environment
	@echo "$(BLUE)🌟 Starting Cosmic Gardener development environment...$(NC)"
	@docker-compose --profile full-stack up -d
	@echo "$(GREEN)✅ Development environment started!$(NC)"
	@echo ""
	@echo "$(BLUE)Services:$(NC)"
	@echo "Frontend:  http://localhost:3000"
	@echo "Backend:   http://localhost:8080"
	@echo "Grafana:   http://localhost:3001 (admin/admin)"
	@echo "Database:  localhost:5432"
	@echo "Redis:     localhost:6379"

.PHONY: dev-local
dev-local: ## Start development without Docker
	@echo "$(BLUE)🔧 Starting local development servers...$(NC)"
	@concurrently \
		--names "BACKEND,FRONTEND" \
		--prefix-colors "blue,green" \
		"cd $(BACKEND_DIR) && make dev" \
		"cd $(FRONTEND_DIR) && npm run dev"

.PHONY: stop
stop: ## Stop all services
	@echo "$(BLUE)🛑 Stopping all services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ All services stopped$(NC)"

# ===============================================
# Build Commands
# ===============================================

.PHONY: build
build: build-frontend build-backend ## Build all components
	@echo "$(GREEN)✅ All components built successfully!$(NC)"

.PHONY: build-frontend
build-frontend: ## Build frontend
	@echo "$(BLUE)🏗️ Building frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build

.PHONY: build-backend
build-backend: ## Build backend
	@echo "$(BLUE)🏗️ Building backend...$(NC)"
	@cd $(BACKEND_DIR) && make build-release

.PHONY: build-docker
build-docker: ## Build Docker images
	@echo "$(BLUE)🐳 Building Docker images...$(NC)"
	@docker-compose build

# ===============================================
# Testing Commands
# ===============================================

.PHONY: test
test: test-frontend test-backend ## Run all tests
	@echo "$(GREEN)✅ All tests completed!$(NC)"

.PHONY: test-frontend
test-frontend: ## Run frontend tests
	@echo "$(BLUE)🧪 Running frontend tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm test

.PHONY: test-backend
test-backend: ## Run backend tests
	@echo "$(BLUE)🧪 Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && make test-all

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(BLUE)🔗 Running integration tests...$(NC)"
	@docker-compose --profile testing up -d postgres-test redis-test
	@cd $(BACKEND_DIR) && make test-integration
	@docker-compose --profile testing down

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)🎭 Running E2E tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test:e2e

# ===============================================
# Code Quality Commands
# ===============================================

.PHONY: lint
lint: lint-frontend lint-backend ## Run all linters
	@echo "$(GREEN)✅ All linting completed!$(NC)"

.PHONY: lint-frontend
lint-frontend: ## Lint frontend code
	@echo "$(BLUE)🔍 Linting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint

.PHONY: lint-backend
lint-backend: ## Lint backend code
	@echo "$(BLUE)🔍 Linting backend...$(NC)"
	@cd $(BACKEND_DIR) && make lint

.PHONY: format
format: format-frontend format-backend ## Format all code
	@echo "$(GREEN)✅ All code formatted!$(NC)"

.PHONY: format-frontend
format-frontend: ## Format frontend code
	@echo "$(BLUE)✨ Formatting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run format

.PHONY: format-backend
format-backend: ## Format backend code
	@echo "$(BLUE)✨ Formatting backend...$(NC)"
	@cd $(BACKEND_DIR) && make fmt

# ===============================================
# Database Commands
# ===============================================

.PHONY: db-setup
db-setup: ## Setup database
	@echo "$(BLUE)🗄️ Setting up database...$(NC)"
	@docker-compose up -d postgres redis
	@sleep 10
	@cd $(BACKEND_DIR) && make migrate
	@cd $(BACKEND_DIR) && make seed

.PHONY: db-reset
db-reset: ## Reset database
	@echo "$(BLUE)🗄️ Resetting database...$(NC)"
	@cd $(BACKEND_DIR) && make db-reset

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(BLUE)🗄️ Running migrations...$(NC)"
	@cd $(BACKEND_DIR) && make migrate

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "$(BLUE)🌱 Seeding database...$(NC)"
	@cd $(BACKEND_DIR) && make seed

# ===============================================
# Monitoring Commands
# ===============================================

.PHONY: monitoring
monitoring: ## Start monitoring stack
	@echo "$(BLUE)📊 Starting monitoring stack...$(NC)"
	@docker-compose --profile monitoring up -d
	@echo "$(GREEN)✅ Monitoring started!$(NC)"
	@echo ""
	@echo "$(BLUE)Services:$(NC)"
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana:    http://localhost:3001 (admin/admin)"
	@echo "Jaeger:     http://localhost:16686"

.PHONY: logs
logs: ## Show service logs
	@docker-compose logs -f

.PHONY: logs-backend
logs-backend: ## Show backend logs
	@docker-compose logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Show frontend logs
	@docker-compose logs -f frontend

# ===============================================
# Performance Commands
# ===============================================

.PHONY: benchmark
benchmark: ## Run performance benchmarks
	@echo "$(BLUE)🏁 Running benchmarks...$(NC)"
	@cd $(BACKEND_DIR) && make bench
	@cd $(FRONTEND_DIR) && npm run benchmark

.PHONY: load-test
load-test: ## Run load tests
	@echo "$(BLUE)🚀 Running load tests...$(NC)"
	@docker-compose --profile loadtest up --abort-on-container-exit

.PHONY: profile
profile: ## Profile application performance
	@echo "$(BLUE)📈 Profiling performance...$(NC)"
	@cd $(BACKEND_DIR) && make profile

# ===============================================
# Security Commands
# ===============================================

.PHONY: security
security: security-frontend security-backend ## Run security audits
	@echo "$(GREEN)✅ Security audits completed!$(NC)"

.PHONY: security-frontend
security-frontend: ## Audit frontend dependencies
	@echo "$(BLUE)🔒 Auditing frontend security...$(NC)"
	@cd $(FRONTEND_DIR) && npm audit

.PHONY: security-backend
security-backend: ## Audit backend dependencies
	@echo "$(BLUE)🔒 Auditing backend security...$(NC)"
	@cd $(BACKEND_DIR) && make security-check

# ===============================================
# Documentation Commands
# ===============================================

.PHONY: docs
docs: ## Start documentation server
	@echo "$(BLUE)📚 Starting documentation server...$(NC)"
	@docker-compose --profile docs up -d
	@echo "$(GREEN)✅ Documentation available at http://localhost:8083$(NC)"

.PHONY: docs-build
docs-build: ## Build documentation
	@echo "$(BLUE)📚 Building documentation...$(NC)"
	@cd $(DOCS_DIR) && npm run build

# ===============================================
# Deployment Commands
# ===============================================

.PHONY: deploy-staging
deploy-staging: ## Deploy to staging
	@echo "$(BLUE)🚀 Deploying to staging...$(NC)"
	@cd $(BACKEND_DIR) && make deploy-staging

.PHONY: deploy-production
deploy-production: ## Deploy to production
	@echo "$(BLUE)🚀 Deploying to production...$(NC)"
	@cd $(BACKEND_DIR) && make deploy-production

# ===============================================
# Maintenance Commands
# ===============================================

.PHONY: clean
clean: ## Clean all build artifacts
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(NC)"
	@cd $(FRONTEND_DIR) && npm run clean
	@cd $(BACKEND_DIR) && make clean
	@docker system prune -f

.PHONY: clean-all
clean-all: clean ## Clean everything including Docker volumes
	@echo "$(BLUE)🧹 Deep cleaning...$(NC)"
	@docker-compose down -v --remove-orphans
	@docker system prune -af

.PHONY: update
update: ## Update all dependencies
	@echo "$(BLUE)⬆️ Updating dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && npm update
	@cd $(BACKEND_DIR) && cargo update

# ===============================================
# Utility Commands
# ===============================================

.PHONY: health
health: ## Check service health
	@echo "$(BLUE)❤️ Checking service health...$(NC)"
	@curl -f http://localhost:8080/health && echo "$(GREEN)Backend: OK$(NC)" || echo "$(RED)Backend: FAIL$(NC)"
	@curl -f http://localhost:3000 && echo "$(GREEN)Frontend: OK$(NC)" || echo "$(RED)Frontend: FAIL$(NC)"

.PHONY: status
status: ## Show service status
	@echo "$(BLUE)📊 Service Status:$(NC)"
	@docker-compose ps

.PHONY: shell-backend
shell-backend: ## Open backend container shell
	@docker-compose exec backend bash

.PHONY: shell-frontend
shell-frontend: ## Open frontend container shell
	@docker-compose exec frontend sh

.PHONY: shell-db
shell-db: ## Open database shell
	@docker-compose exec postgres psql -U postgres -d cosmic_gardener_dev

# ===============================================
# Quick Development Workflows
# ===============================================

.PHONY: quick-start
quick-start: setup dev ## Complete setup and start development
	@echo "$(GREEN)🌟 Cosmic Gardener is ready for development!$(NC)"

.PHONY: quick-test
quick-test: ## Quick test run
	@echo "$(BLUE)⚡ Running quick tests...$(NC)"
	@cd $(BACKEND_DIR) && make test
	@cd $(FRONTEND_DIR) && npm run test:quick

.PHONY: pre-commit
pre-commit: format lint test ## Pre-commit checks
	@echo "$(GREEN)✅ Pre-commit checks passed!$(NC)"

.PHONY: ci
ci: lint test security ## CI pipeline simulation
	@echo "$(GREEN)✅ CI checks passed!$(NC)"

# ===============================================
# Information Commands
# ===============================================

.PHONY: info
info: ## Show project information
	@echo "$(BLUE)🌌 Cosmic Gardener Project Information$(NC)"
	@echo ""
	@echo "$(YELLOW)Project Structure:$(NC)"
	@echo "frontend/  - TypeScript + Three.js frontend"
	@echo "backend/   - Rust backend with Actix Web"
	@echo "database/  - PostgreSQL with PostGIS schemas"
	@echo "docs/      - Project documentation"
	@echo "infra/     - Infrastructure and deployment configs"
	@echo ""
	@echo "$(YELLOW)Quick Commands:$(NC)"
	@echo "make setup     - Complete project setup"
	@echo "make dev       - Start development environment"
	@echo "make test      - Run all tests"
	@echo "make build     - Build all components"

.PHONY: version
version: ## Show version information
	@echo "$(BLUE)Version Information:$(NC)"
	@echo "Node.js: $$(node --version)"
	@echo "NPM: $$(npm --version)"
	@echo "Rust: $$(rustc --version)"
	@echo "Docker: $$(docker --version)"
	@echo "Docker Compose: $$(docker-compose --version)"

# Include environment variables if .env exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif