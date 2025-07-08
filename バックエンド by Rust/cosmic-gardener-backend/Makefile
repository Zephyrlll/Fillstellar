# ===============================================
# Cosmic Gardener Backend - Makefile
# ===============================================

# Variables
PROJECT_NAME := cosmic-gardener-backend
CARGO := cargo
DOCKER_COMPOSE := docker-compose
RUST_LOG := debug
DATABASE_URL := postgresql://postgres:password@localhost:5432/cosmic_gardener_dev
TEST_DATABASE_URL := postgresql://postgres:password@localhost:5432/cosmic_gardener_test

# Colors for output
BLUE := \033[1;34m
GREEN := \033[1;32m
YELLOW := \033[1;33m
RED := \033[1;31m
NC := \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)Cosmic Gardener Backend - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ===============================================
# Development Commands
# ===============================================

.PHONY: dev
dev: ## Start development server with hot reload
	@echo "$(BLUE)Starting development server...$(NC)"
	RUST_LOG=$(RUST_LOG) $(CARGO) watch -x "run --bin cosmic-gardener-server"

.PHONY: dev-release
dev-release: ## Start development server in release mode
	@echo "$(BLUE)Starting development server (release mode)...$(NC)"
	RUST_LOG=info $(CARGO) run --release --bin cosmic-gardener-server

.PHONY: build
build: ## Build the project
	@echo "$(BLUE)Building project...$(NC)"
	$(CARGO) build

.PHONY: build-release
build-release: ## Build the project in release mode
	@echo "$(BLUE)Building project (release mode)...$(NC)"
	$(CARGO) build --release

.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	$(CARGO) clean

# ===============================================
# Testing Commands
# ===============================================

.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(CARGO) test

.PHONY: test-unit
test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	$(CARGO) test --lib

.PHONY: test-integration
test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	$(CARGO) test --test '*'

.PHONY: test-all
test-all: lint test test-doc ## Run all tests and checks
	@echo "$(GREEN)All tests completed!$(NC)"

.PHONY: test-doc
test-doc: ## Run documentation tests
	@echo "$(BLUE)Running documentation tests...$(NC)"
	$(CARGO) test --doc

.PHONY: test-coverage
test-coverage: ## Generate test coverage report
	@echo "$(BLUE)Generating test coverage report...$(NC)"
	$(CARGO) tarpaulin --out html --output-dir coverage/ --exclude-files "src/main.rs"
	@echo "$(GREEN)Coverage report generated: coverage/tarpaulin-report.html$(NC)"

.PHONY: test-db-setup
test-db-setup: ## Setup test database
	@echo "$(BLUE)Setting up test database...$(NC)"
	DATABASE_URL=$(TEST_DATABASE_URL) sqlx database create
	DATABASE_URL=$(TEST_DATABASE_URL) sqlx migrate run

# ===============================================
# Code Quality Commands
# ===============================================

.PHONY: fmt
fmt: ## Format code using rustfmt
	@echo "$(BLUE)Formatting code...$(NC)"
	$(CARGO) fmt

.PHONY: fmt-check
fmt-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	$(CARGO) fmt --all -- --check

.PHONY: lint
lint: ## Run clippy lints
	@echo "$(BLUE)Running clippy lints...$(NC)"
	$(CARGO) clippy --all-targets --all-features -- -D warnings

.PHONY: lint-fix
lint-fix: ## Fix clippy lints automatically
	@echo "$(BLUE)Fixing clippy lints...$(NC)"
	$(CARGO) clippy --fix --all-targets --all-features

.PHONY: check
check: ## Check code compiles without building
	@echo "$(BLUE)Checking code compilation...$(NC)"
	$(CARGO) check

.PHONY: doc
doc: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	$(CARGO) doc --no-deps --document-private-items

.PHONY: doc-open
doc-open: doc ## Generate and open documentation
	@echo "$(BLUE)Opening documentation...$(NC)"
	$(CARGO) doc --no-deps --document-private-items --open

# ===============================================
# Security Commands
# ===============================================

.PHONY: audit
audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	$(CARGO) audit

.PHONY: deny
deny: ## Check dependencies with cargo-deny
	@echo "$(BLUE)Checking dependencies...$(NC)"
	$(CARGO) deny check

.PHONY: security-check
security-check: audit deny ## Run all security checks
	@echo "$(GREEN)Security checks completed!$(NC)"

# ===============================================
# Database Commands
# ===============================================

.PHONY: migrate
migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	sqlx migrate run

.PHONY: migrate-down
migrate-down: ## Revert the last migration
	@echo "$(BLUE)Reverting last migration...$(NC)"
	sqlx migrate revert

.PHONY: migrate-info
migrate-info: ## Show migration status
	@echo "$(BLUE)Migration status:$(NC)"
	sqlx migrate info

.PHONY: migration-create
migration-create: ## Create a new migration (usage: make migration-create name=migration_name)
	@if [ -z "$(name)" ]; then \
		echo "$(RED)Error: Please provide a migration name$(NC)"; \
		echo "Usage: make migration-create name=migration_name"; \
		exit 1; \
	fi
	@echo "$(BLUE)Creating migration: $(name)$(NC)"
	sqlx migrate add $(name)

.PHONY: db-create
db-create: ## Create database
	@echo "$(BLUE)Creating database...$(NC)"
	sqlx database create

.PHONY: db-drop
db-drop: ## Drop database
	@echo "$(YELLOW)Dropping database...$(NC)"
	sqlx database drop

.PHONY: db-reset
db-reset: db-drop db-create migrate seed ## Reset database completely
	@echo "$(GREEN)Database reset completed!$(NC)"

.PHONY: seed
seed: ## Load seed data
	@echo "$(BLUE)Loading seed data...$(NC)"
	$(CARGO) run --bin cosmic-gardener-server -- --seed

# ===============================================
# Docker Commands
# ===============================================

.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t $(PROJECT_NAME) .

.PHONY: docker-run
docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -p 8080:8080 --env-file .env $(PROJECT_NAME)

.PHONY: dev-up
dev-up: ## Start development environment with Docker Compose
	@echo "$(BLUE)Starting development environment...$(NC)"
	$(DOCKER_COMPOSE) --profile development up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "Backend: http://localhost:8080"
	@echo "Database: localhost:5432"
	@echo "Redis: localhost:6379"

.PHONY: dev-down
dev-down: ## Stop development environment
	@echo "$(BLUE)Stopping development environment...$(NC)"
	$(DOCKER_COMPOSE) --profile development down

.PHONY: dev-logs
dev-logs: ## Show development environment logs
	$(DOCKER_COMPOSE) --profile development logs -f

.PHONY: monitoring-up
monitoring-up: ## Start monitoring stack
	@echo "$(BLUE)Starting monitoring stack...$(NC)"
	$(DOCKER_COMPOSE) --profile monitoring up -d
	@echo "$(GREEN)Monitoring stack started!$(NC)"
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3000 (admin/admin)"
	@echo "Jaeger: http://localhost:16686"

.PHONY: monitoring-down
monitoring-down: ## Stop monitoring stack
	@echo "$(BLUE)Stopping monitoring stack...$(NC)"
	$(DOCKER_COMPOSE) --profile monitoring down

.PHONY: logs
logs: ## Show Docker Compose logs
	$(DOCKER_COMPOSE) logs -f

.PHONY: docker-clean
docker-clean: ## Clean Docker resources
	@echo "$(BLUE)Cleaning Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f

# ===============================================
# Performance Commands
# ===============================================

.PHONY: bench
bench: ## Run benchmarks
	@echo "$(BLUE)Running benchmarks...$(NC)"
	$(CARGO) bench

.PHONY: profile
profile: ## Run with profiling
	@echo "$(BLUE)Running with profiling...$(NC)"
	$(CARGO) flamegraph --bin cosmic-gardener-server

.PHONY: load-test
load-test: ## Run load tests
	@echo "$(BLUE)Running load tests...$(NC)"
	$(DOCKER_COMPOSE) --profile loadtest up --abort-on-container-exit

# ===============================================
# Dependency Management
# ===============================================

.PHONY: deps-install
deps-install: ## Install Rust development dependencies
	@echo "$(BLUE)Installing Rust development dependencies...$(NC)"
	$(CARGO) install cargo-watch
	$(CARGO) install sqlx-cli
	$(CARGO) install cargo-audit
	$(CARGO) install cargo-tarpaulin
	$(CARGO) install cargo-deny
	$(CARGO) install cargo-expand
	$(CARGO) install cargo-udeps
	$(CARGO) install flamegraph
	@echo "$(GREEN)Dependencies installed!$(NC)"

.PHONY: deps-check
deps-check: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(NC)"
	$(CARGO) outdated

.PHONY: deps-unused
deps-unused: ## Check for unused dependencies
	@echo "$(BLUE)Checking for unused dependencies...$(NC)"
	$(CARGO) +nightly udeps --all-targets

.PHONY: deps-tree
deps-tree: ## Show dependency tree
	@echo "$(BLUE)Dependency tree:$(NC)"
	$(CARGO) tree

# ===============================================
# Utility Commands
# ===============================================

.PHONY: pre-commit
pre-commit: fmt-check lint test ## Run pre-commit checks
	@echo "$(GREEN)Pre-commit checks passed!$(NC)"

.PHONY: ci
ci: fmt-check lint test-all security-check ## Run CI checks locally
	@echo "$(GREEN)CI checks passed!$(NC)"

.PHONY: setup
setup: deps-install dev-up migrate seed ## Complete development setup
	@echo "$(GREEN)Development environment setup completed!$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "1. Run 'make dev' to start the development server"
	@echo "2. Visit http://localhost:8080/health to verify the server is running"
	@echo "3. Check out the documentation with 'make doc-open'"

.PHONY: version
version: ## Show version information
	@echo "$(BLUE)Version Information:$(NC)"
	@echo "Rust: $$(rustc --version)"
	@echo "Cargo: $$($(CARGO) --version)"
	@echo "Docker: $$(docker --version)"
	@echo "Docker Compose: $$($(DOCKER_COMPOSE) --version)"

.PHONY: health
health: ## Check application health
	@echo "$(BLUE)Checking application health...$(NC)"
	@curl -f http://localhost:8080/health || echo "$(RED)Application is not running$(NC)"

# ===============================================
# Release Commands
# ===============================================

.PHONY: release-check
release-check: ## Check if ready for release
	@echo "$(BLUE)Checking release readiness...$(NC)"
	$(CARGO) fmt --all -- --check
	$(CARGO) clippy --all-targets --all-features -- -D warnings
	$(CARGO) test --all-features
	$(CARGO) audit
	@echo "$(GREEN)Release checks passed!$(NC)"

.PHONY: release-build
release-build: ## Build release artifacts
	@echo "$(BLUE)Building release artifacts...$(NC)"
	$(CARGO) build --release
	strip target/release/cosmic-gardener-server
	@echo "$(GREEN)Release build completed!$(NC)"

# ===============================================
# Aliases for common commands
# ===============================================

.PHONY: run
run: dev ## Alias for dev

.PHONY: start
start: dev-up ## Alias for dev-up

.PHONY: stop
stop: dev-down ## Alias for dev-down

.PHONY: restart
restart: dev-down dev-up ## Restart development environment

.PHONY: install
install: deps-install ## Alias for deps-install

# Include environment variables if .env exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif