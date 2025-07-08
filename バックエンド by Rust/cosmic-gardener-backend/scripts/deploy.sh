#!/bin/bash

# ===============================================
# Cosmic Gardener Backend Deployment Script
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-cosmic-gardener}"
SERVICE_NAME="cosmic-gardener-backend"
BACKUP_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        staging|production)
            log_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("docker" "docker-compose" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="/opt/cosmic-gardener/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Docker images
    if docker images | grep -q "$SERVICE_NAME"; then
        docker save "$SERVICE_NAME:current" | gzip > "$backup_dir/image.tar.gz" 2>/dev/null || true
    fi
    
    # Backup configuration
    if [[ -f "/opt/cosmic-gardener/.env" ]]; then
        cp "/opt/cosmic-gardener/.env" "$backup_dir/"
    fi
    
    # Backup database (if local)
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        docker exec cosmic-gardener-postgres pg_dump -U postgres cosmic_gardener | gzip > "$backup_dir/database.sql.gz" 2>/dev/null || true
    fi
    
    # Clean up old backups
    find /opt/cosmic-gardener/backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Backup created at $backup_dir"
}

# Pull new Docker image
pull_image() {
    log_info "Pulling Docker image: $DOCKER_REGISTRY/backend:$IMAGE_TAG"
    
    if ! docker pull "$DOCKER_REGISTRY/backend:$IMAGE_TAG"; then
        log_error "Failed to pull Docker image"
        exit 1
    fi
    
    # Tag as latest for this environment
    docker tag "$DOCKER_REGISTRY/backend:$IMAGE_TAG" "$SERVICE_NAME:$ENVIRONMENT"
    docker tag "$DOCKER_REGISTRY/backend:$IMAGE_TAG" "$SERVICE_NAME:current"
    
    log_success "Image pulled and tagged successfully"
}

# Update configuration
update_configuration() {
    log_info "Updating configuration for $ENVIRONMENT..."
    
    local config_dir="/opt/cosmic-gardener"
    local env_file="$config_dir/.env"
    
    # Create configuration directory if it doesn't exist
    mkdir -p "$config_dir"
    
    # Environment-specific configuration
    case "$ENVIRONMENT" in
        staging)
            cat > "$env_file" << EOF
# Staging Environment Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/cosmic_gardener_staging
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=${JWT_SECRET:-staging-secret-key}
SERVER_PORT=8080
RUST_LOG=info
CORS_ORIGINS=https://staging.cosmic-gardener.com
ENVIRONMENT=staging
EOF
            ;;
        production)
            cat > "$env_file" << EOF
# Production Environment Configuration
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
SERVER_PORT=8080
RUST_LOG=warn
CORS_ORIGINS=https://cosmic-gardener.com,https://www.cosmic-gardener.com
ENVIRONMENT=production
EOF
            ;;
    esac
    
    # Set secure permissions
    chmod 600 "$env_file"
    
    log_success "Configuration updated"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a temporary container to run migrations
    docker run --rm \
        --env-file "/opt/cosmic-gardener/.env" \
        --network host \
        "$SERVICE_NAME:current" \
        /usr/local/bin/cosmic-gardener-migrate || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_success "Database migrations completed"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    local compose_file="/opt/cosmic-gardener/docker-compose.yml"
    
    # Create Docker Compose file for deployment
    cat > "$compose_file" << EOF
version: '3.8'

services:
  backend:
    image: ${SERVICE_NAME}:current
    container_name: ${SERVICE_NAME}
    env_file:
      - .env
    ports:
      - "8080:8080"
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

networks:
  default:
    external: true
    name: cosmic-network
EOF

    # Stop existing service
    cd /opt/cosmic-gardener
    docker-compose down || true
    
    # Start new service
    docker-compose up -d
    
    log_success "Application deployed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=0
    local url="http://localhost:8080/health"
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        ((attempt++))
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local base_url="http://localhost:8080"
    
    # Test health endpoint
    if ! curl -f -s "$base_url/health" | jq -e '.status == "healthy"' > /dev/null; then
        log_error "Health endpoint test failed"
        return 1
    fi
    
    # Test API version endpoint
    if ! curl -f -s "$base_url/api/v1/health" > /dev/null; then
        log_warning "API health endpoint test failed (non-critical)"
    fi
    
    log_success "Smoke tests passed"
}

# Rollback function
rollback() {
    log_warning "Starting rollback..."
    
    # Find the most recent backup
    local backup_dir
    backup_dir=$(find /opt/cosmic-gardener/backups -type d -name "20*" | sort -r | head -n1)
    
    if [[ -z "$backup_dir" ]]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    log_info "Rolling back to backup: $backup_dir"
    
    # Stop current service
    cd /opt/cosmic-gardener
    docker-compose down || true
    
    # Restore image if available
    if [[ -f "$backup_dir/image.tar.gz" ]]; then
        gunzip -c "$backup_dir/image.tar.gz" | docker load
    fi
    
    # Restore configuration
    if [[ -f "$backup_dir/.env" ]]; then
        cp "$backup_dir/.env" "/opt/cosmic-gardener/"
    fi
    
    # Start service
    docker-compose up -d
    
    # Wait for service to be ready
    sleep 30
    
    if health_check; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Clean up old container logs
    find /opt/cosmic-gardener/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment of Cosmic Gardener Backend"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    
    validate_environment
    check_prerequisites
    backup_current_deployment
    pull_image
    update_configuration
    
    # Run migrations only for staging or if explicitly requested
    if [[ "$ENVIRONMENT" == "staging" ]] || [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
        run_migrations
    fi
    
    deploy_application
    
    if ! health_check; then
        log_error "Deployment failed health check"
        if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
            rollback
        fi
        exit 1
    fi
    
    if ! run_smoke_tests; then
        log_warning "Smoke tests failed, but deployment will continue"
    fi
    
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Service is running at: http://localhost:8080"
    log_info "Health check: http://localhost:8080/health"
}

# Trap for cleanup on script exit
trap 'log_info "Deployment script interrupted"' INT TERM

# Check if this script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi