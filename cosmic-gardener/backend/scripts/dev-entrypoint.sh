#!/bin/bash

# ===============================================
# Development Environment Entrypoint Script
# ===============================================

set -euo pipefail

# Configuration
RUST_LOG="${RUST_LOG:-debug}"
RUST_BACKTRACE="${RUST_BACKTRACE:-full}"
CARGO_WATCH="${CARGO_WATCH:-true}"
AUTO_MIGRATE="${AUTO_MIGRATE:-true}"
AUTO_SEED="${AUTO_SEED:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[DEV]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[DEV]${NC} $1"
}

log_error() {
    echo -e "${RED}[DEV]${NC} $1"
}

# Wait for database to be ready
wait_for_database() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_warning "DATABASE_URL not set, skipping database checks"
        return 0
    fi
    
    log_info "Waiting for database to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if sqlx database --help &> /dev/null; then
            if sqlx database create --database-url "$DATABASE_URL" 2>/dev/null; then
                log_success "Database is ready"
                return 0
            fi
        fi
        
        ((attempt++))
        log_info "Database not ready, attempt $attempt/$max_attempts, retrying in 2 seconds..."
        sleep 2
    done
    
    log_error "Database not ready after $max_attempts attempts"
    return 1
}

# Wait for Redis to be ready
wait_for_redis() {
    if [[ -z "${REDIS_URL:-}" ]]; then
        log_warning "REDIS_URL not set, skipping Redis checks"
        return 0
    fi
    
    log_info "Waiting for Redis to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
            log_success "Redis is ready"
            return 0
        fi
        
        ((attempt++))
        log_info "Redis not ready, attempt $attempt/$max_attempts, retrying in 2 seconds..."
        sleep 2
    done
    
    log_error "Redis not ready after $max_attempts attempts"
    return 1
}

# Run database migrations
run_migrations() {
    if [[ "$AUTO_MIGRATE" != "true" ]]; then
        log_info "Auto-migration disabled"
        return 0
    fi
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_warning "DATABASE_URL not set, skipping migrations"
        return 0
    fi
    
    log_info "Running database migrations..."
    
    if sqlx migrate run --database-url "$DATABASE_URL"; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
}

# Seed database
seed_database() {
    if [[ "$AUTO_SEED" != "true" ]]; then
        log_info "Auto-seeding disabled"
        return 0
    fi
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_warning "DATABASE_URL not set, skipping seeding"
        return 0
    fi
    
    log_info "Seeding database..."
    
    # Check if seeding script exists
    if [[ -f "scripts/seed.sql" ]]; then
        psql "$DATABASE_URL" -f scripts/seed.sql
        log_success "Database seeding completed"
    else
        log_warning "No seed script found, skipping seeding"
    fi
}

# Setup development environment
setup_development() {
    log_info "Setting up development environment..."
    
    # Set development environment variables
    export RUST_LOG="$RUST_LOG"
    export RUST_BACKTRACE="$RUST_BACKTRACE"
    export CARGO_TERM_COLOR="always"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data
    mkdir -p tmp
    
    # Install additional development tools if needed
    if ! command -v cargo-watch &> /dev/null; then
        log_info "Installing cargo-watch..."
        cargo install cargo-watch
    fi
    
    log_success "Development environment setup completed"
}

# Start development server
start_dev_server() {
    log_info "Starting development server..."
    
    if [[ "$CARGO_WATCH" == "true" ]]; then
        log_info "Starting with cargo-watch (hot reload enabled)"
        exec cargo watch --clear --exec "run --bin cosmic-gardener-server"
    else
        log_info "Starting without hot reload"
        exec cargo run --bin cosmic-gardener-server
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=10
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s http://localhost:8080/health > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        ((attempt++))
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show development information
show_dev_info() {
    log_info "Development Environment Information:"
    echo "======================================"
    echo "Rust Version: $(rustc --version)"
    echo "Cargo Version: $(cargo --version)"
    echo "Environment: ${ENVIRONMENT:-development}"
    echo "Log Level: $RUST_LOG"
    echo "Backtrace: $RUST_BACKTRACE"
    echo "Hot Reload: $CARGO_WATCH"
    echo "Auto Migrate: $AUTO_MIGRATE"
    echo "Auto Seed: $AUTO_SEED"
    echo "Database URL: ${DATABASE_URL:-not set}"
    echo "Redis URL: ${REDIS_URL:-not set}"
    echo "======================================"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up development environment..."
    
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    log_success "Development environment cleanup completed"
}

# Signal handlers
handle_sigterm() {
    log_info "Received SIGTERM, shutting down gracefully..."
    cleanup
    exit 0
}

handle_sigint() {
    log_info "Received SIGINT, shutting down gracefully..."
    cleanup
    exit 0
}

# Main function
main() {
    # Set up signal handlers
    trap handle_sigterm SIGTERM
    trap handle_sigint SIGINT
    
    show_dev_info
    setup_development
    wait_for_database
    wait_for_redis
    run_migrations
    seed_database
    start_dev_server
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi