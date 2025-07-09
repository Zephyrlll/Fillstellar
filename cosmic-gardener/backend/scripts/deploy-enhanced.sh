#!/bin/bash

# ===============================================
# Enhanced Deployment Script with Blue-Green Support
# Cosmic Gardener Backend
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
DEPLOYMENT_TYPE="${3:-blue-green}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-cosmic-gardener}"
SERVICE_NAME="cosmic-gardener-backend"

# Blue-Green Configuration
BLUE_SERVICE_NAME="${SERVICE_NAME}-blue"
GREEN_SERVICE_NAME="${SERVICE_NAME}-green"
BLUE_PORT=8080
GREEN_PORT=8081
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_CONFIG_FILE="${NGINX_CONFIG_DIR}/cosmic-gardener"
BACKUP_COUNT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[DEPLOY]${NC} $1"
}

log_error() {
    echo -e "${RED}[DEPLOY]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [IMAGE_TAG] [DEPLOYMENT_TYPE]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT       Environment to deploy to (staging|production)"
    echo "  IMAGE_TAG         Docker image tag to deploy (default: latest)"
    echo "  DEPLOYMENT_TYPE   Deployment type (blue-green|rolling|direct)"
    echo ""
    echo "Examples:"
    echo "  $0 staging v1.0.0 blue-green"
    echo "  $0 production latest rolling"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_REGISTRY   Docker registry (default: cosmic-gardener)"
    echo "  AUTO_ROLLBACK     Enable automatic rollback on failure (default: true)"
    echo "  SLACK_WEBHOOK     Slack webhook for notifications"
    echo "  HEALTH_CHECK_URL  Custom health check URL"
}

# Validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        staging|production)
            log_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
            show_usage
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("docker" "docker-compose" "curl" "jq" "nginx")
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
    
    # Check if image exists
    if ! docker images | grep -q "$DOCKER_REGISTRY.*$IMAGE_TAG"; then
        log_warning "Docker image not found locally, attempting to pull..."
        if ! docker pull "$DOCKER_REGISTRY:$IMAGE_TAG"; then
            log_error "Failed to pull Docker image: $DOCKER_REGISTRY:$IMAGE_TAG"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Get currently active service
get_active_service() {
    if docker ps --format "table {{.Names}}" | grep -q "$BLUE_SERVICE_NAME"; then
        echo "blue"
    elif docker ps --format "table {{.Names}}" | grep -q "$GREEN_SERVICE_NAME"; then
        echo "green"
    else
        echo "none"
    fi
}

# Get inactive service
get_inactive_service() {
    local active_service
    active_service=$(get_active_service)
    
    case "$active_service" in
        blue)
            echo "green"
            ;;
        green)
            echo "blue"
            ;;
        *)
            echo "blue"  # Default to blue if none active
            ;;
    esac
}

# Create backup of current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="/opt/cosmic-gardener/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Docker images
    local active_service
    active_service=$(get_active_service)
    
    if [[ "$active_service" != "none" ]]; then
        local service_name
        if [[ "$active_service" == "blue" ]]; then
            service_name="$BLUE_SERVICE_NAME"
        else
            service_name="$GREEN_SERVICE_NAME"
        fi
        
        docker save "$service_name:current" | gzip > "$backup_dir/image.tar.gz" 2>/dev/null || true
    fi
    
    # Backup configuration
    cp -r /opt/cosmic-gardener/config "$backup_dir/" 2>/dev/null || true
    
    # Backup nginx configuration
    if [[ -f "$NGINX_CONFIG_FILE" ]]; then
        cp "$NGINX_CONFIG_FILE" "$backup_dir/nginx.conf"
    fi
    
    # Backup database (if local)
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        docker exec cosmic-gardener-postgres pg_dump -U postgres cosmic_gardener | gzip > "$backup_dir/database.sql.gz" 2>/dev/null || true
    fi
    
    # Clean up old backups
    find /opt/cosmic-gardener/backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Backup created at $backup_dir"
}

# Update nginx configuration
update_nginx_config() {
    local target_service="$1"
    local target_port="$2"
    
    log_info "Updating nginx configuration for $target_service service on port $target_port"
    
    # Create nginx configuration
    cat > "$NGINX_CONFIG_FILE" << EOF
upstream cosmic_gardener_backend {
    server 127.0.0.1:$target_port;
}

server {
    listen 80;
    server_name cosmic-gardener.com www.cosmic-gardener.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Health check endpoint
    location /health {
        proxy_pass http://cosmic_gardener_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://cosmic_gardener_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Main application
    location / {
        proxy_pass http://cosmic_gardener_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF
    
    # Test nginx configuration
    if ! nginx -t; then
        log_error "Nginx configuration test failed"
        return 1
    fi
    
    # Reload nginx
    if ! systemctl reload nginx; then
        log_error "Failed to reload nginx"
        return 1
    fi
    
    log_success "Nginx configuration updated successfully"
}

# Deploy service
deploy_service() {
    local service_name="$1"
    local port="$2"
    local image_tag="$3"
    
    log_info "Deploying service: $service_name on port $port"
    
    # Stop existing service if running
    if docker ps --format "table {{.Names}}" | grep -q "$service_name"; then
        log_info "Stopping existing service: $service_name"
        docker stop "$service_name" || true
        docker rm "$service_name" || true
    fi
    
    # Load environment configuration
    local env_file="/opt/cosmic-gardener/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Start new service
    docker run -d \
        --name "$service_name" \
        --env-file "$env_file" \
        --network cosmic-network \
        -p "$port:8080" \
        --restart unless-stopped \
        --health-cmd "curl -f http://localhost:8080/health || exit 1" \
        --health-interval 30s \
        --health-timeout 10s \
        --health-retries 3 \
        --health-start-period 30s \
        -v /opt/cosmic-gardener/logs:/app/logs \
        -v /opt/cosmic-gardener/config:/app/config:ro \
        "$DOCKER_REGISTRY:$image_tag"
    
    log_success "Service deployed: $service_name"
}

# Health check for service
health_check_service() {
    local service_name="$1"
    local port="$2"
    local max_attempts=30
    local attempt=0
    
    log_info "Performing health check for service: $service_name on port $port"
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            log_success "Health check passed for service: $service_name"
            return 0
        fi
        
        # Check if container is running
        if ! docker ps --format "table {{.Names}}" | grep -q "$service_name"; then
            log_error "Service container is not running: $service_name"
            return 1
        fi
        
        ((attempt++))
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
    done
    
    log_error "Health check failed for service: $service_name"
    return 1
}

# Blue-Green deployment
blue_green_deployment() {
    local image_tag="$1"
    
    log_info "Starting Blue-Green deployment"
    
    # Determine active and inactive services
    local active_service
    local inactive_service
    local inactive_service_name
    local inactive_port
    
    active_service=$(get_active_service)
    inactive_service=$(get_inactive_service)
    
    if [[ "$inactive_service" == "blue" ]]; then
        inactive_service_name="$BLUE_SERVICE_NAME"
        inactive_port="$BLUE_PORT"
    else
        inactive_service_name="$GREEN_SERVICE_NAME"
        inactive_port="$GREEN_PORT"
    fi
    
    log_info "Active service: $active_service"
    log_info "Deploying to inactive service: $inactive_service ($inactive_service_name)"
    
    # Deploy to inactive service
    if ! deploy_service "$inactive_service_name" "$inactive_port" "$image_tag"; then
        log_error "Failed to deploy to inactive service"
        return 1
    fi
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if ! health_check_service "$inactive_service_name" "$inactive_port"; then
        log_error "Health check failed for new deployment"
        return 1
    fi
    
    # Switch traffic
    if ! update_nginx_config "$inactive_service" "$inactive_port"; then
        log_error "Failed to update nginx configuration"
        return 1
    fi
    
    # Wait for traffic to stabilize
    log_info "Waiting for traffic to stabilize..."
    sleep 60
    
    # Final health check through nginx
    if ! curl -f -s "http://localhost/health" > /dev/null; then
        log_error "Final health check failed through nginx"
        return 1
    fi
    
    # Stop old service
    if [[ "$active_service" != "none" ]]; then
        local old_service_name
        if [[ "$active_service" == "blue" ]]; then
            old_service_name="$BLUE_SERVICE_NAME"
        else
            old_service_name="$GREEN_SERVICE_NAME"
        fi
        
        log_info "Stopping old service: $old_service_name"
        docker stop "$old_service_name" || true
        docker rm "$old_service_name" || true
    fi
    
    log_success "Blue-Green deployment completed successfully"
}

# Rolling deployment
rolling_deployment() {
    local image_tag="$1"
    
    log_info "Starting Rolling deployment"
    
    # Deploy to main service
    if ! deploy_service "$SERVICE_NAME" "8080" "$image_tag"; then
        log_error "Rolling deployment failed"
        return 1
    fi
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if ! health_check_service "$SERVICE_NAME" "8080"; then
        log_error "Health check failed for rolling deployment"
        return 1
    fi
    
    # Update nginx configuration
    if ! update_nginx_config "main" "8080"; then
        log_error "Failed to update nginx configuration"
        return 1
    fi
    
    log_success "Rolling deployment completed successfully"
}

# Direct deployment
direct_deployment() {
    local image_tag="$1"
    
    log_info "Starting Direct deployment"
    
    # Deploy to main service
    if ! deploy_service "$SERVICE_NAME" "8080" "$image_tag"; then
        log_error "Direct deployment failed"
        return 1
    fi
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if ! health_check_service "$SERVICE_NAME" "8080"; then
        log_error "Health check failed for direct deployment"
        return 1
    fi
    
    log_success "Direct deployment completed successfully"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Starting rollback deployment..."
    
    local backup_dir
    backup_dir=$(find /opt/cosmic-gardener/backups -type d -name "20*" | sort -r | head -n1)
    
    if [[ -z "$backup_dir" ]]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    log_info "Rolling back to backup: $backup_dir"
    
    # Restore image if available
    if [[ -f "$backup_dir/image.tar.gz" ]]; then
        gunzip -c "$backup_dir/image.tar.gz" | docker load
    fi
    
    # Restore nginx configuration
    if [[ -f "$backup_dir/nginx.conf" ]]; then
        cp "$backup_dir/nginx.conf" "$NGINX_CONFIG_FILE"
        nginx -t && systemctl reload nginx
    fi
    
    log_success "Rollback completed successfully"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local color
        case "$status" in
            success)
                color="good"
                ;;
            warning)
                color="warning"
                ;;
            error)
                color="danger"
                ;;
            *)
                color="#36a64f"
                ;;
        esac
        
        local payload
        payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Cosmic Gardener Deployment",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Image Tag",
                    "value": "$IMAGE_TAG",
                    "short": true
                },
                {
                    "title": "Deployment Type",
                    "value": "$DEPLOYMENT_TYPE",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$message",
                    "short": false
                }
            ],
            "footer": "Enhanced Deployment Script",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK" || true
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
    log_info "Starting Enhanced Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Deployment Type: $DEPLOYMENT_TYPE"
    
    # Send start notification
    send_notification "info" "Enhanced deployment started"
    
    validate_environment
    check_prerequisites
    backup_current_deployment
    
    # Execute deployment based on type
    case "$DEPLOYMENT_TYPE" in
        blue-green)
            if blue_green_deployment "$IMAGE_TAG"; then
                send_notification "success" "Blue-Green deployment completed successfully"
            else
                send_notification "error" "Blue-Green deployment failed"
                if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            ;;
        rolling)
            if rolling_deployment "$IMAGE_TAG"; then
                send_notification "success" "Rolling deployment completed successfully"
            else
                send_notification "error" "Rolling deployment failed"
                if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            ;;
        direct)
            if direct_deployment "$IMAGE_TAG"; then
                send_notification "success" "Direct deployment completed successfully"
            else
                send_notification "error" "Direct deployment failed"
                if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            ;;
        *)
            log_error "Invalid deployment type: $DEPLOYMENT_TYPE"
            show_usage
            exit 1
            ;;
    esac
    
    cleanup
    
    log_success "Enhanced deployment completed successfully!"
    log_info "Service is running at: http://localhost"
    log_info "Health check: http://localhost/health"
}

# Trap for cleanup on script exit
trap 'send_notification "error" "Deployment script interrupted"' INT TERM

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi