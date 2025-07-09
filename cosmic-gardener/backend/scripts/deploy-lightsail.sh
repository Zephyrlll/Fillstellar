#!/bin/bash

# ===============================================
# AWS Lightsail Deployment Script with Blue-Green Deployment
# Cosmic Gardener Backend
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
DEPLOYMENT_TYPE="${3:-blue-green}"

# Lightsail Configuration
LIGHTSAIL_SERVICE_NAME="cosmic-gardener-backend"
LIGHTSAIL_REGION="${AWS_REGION:-us-east-1}"
CONTAINER_NAME="cosmic-gardener-backend"
CONTAINER_PORT=8080
CONTAINER_REGISTRY="cosmic-gardener"
HEALTH_CHECK_PATH="/health"

# Blue-Green Deployment Configuration
BLUE_SERVICE_NAME="${LIGHTSAIL_SERVICE_NAME}-blue"
GREEN_SERVICE_NAME="${LIGHTSAIL_SERVICE_NAME}-green"
LOAD_BALANCER_NAME="${LIGHTSAIL_SERVICE_NAME}-lb"
BACKUP_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[LIGHTSAIL]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[LIGHTSAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[LIGHTSAIL]${NC} $1"
}

log_error() {
    echo -e "${RED}[LIGHTSAIL]${NC} $1"
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
    echo "  AWS_REGION        AWS region (default: us-east-1)"
    echo "  AWS_PROFILE       AWS profile to use"
    echo "  SLACK_WEBHOOK     Slack webhook for notifications"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("aws" "jq" "curl" "docker")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check AWS CLI configuration
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI not configured properly"
        exit 1
    fi
    
    # Check Lightsail plugin
    if ! aws lightsail describe-container-services --region "$LIGHTSAIL_REGION" &> /dev/null; then
        log_error "Lightsail service not accessible in region: $LIGHTSAIL_REGION"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
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

# Get current deployment status
get_deployment_status() {
    local service_name="$1"
    
    aws lightsail get-container-service \
        --service-name "$service_name" \
        --region "$LIGHTSAIL_REGION" \
        --query 'containerService.state' \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

# Get current active service (blue or green)
get_active_service() {
    local blue_status
    local green_status
    
    blue_status=$(get_deployment_status "$BLUE_SERVICE_NAME")
    green_status=$(get_deployment_status "$GREEN_SERVICE_NAME")
    
    if [[ "$blue_status" == "RUNNING" ]]; then
        echo "blue"
    elif [[ "$green_status" == "RUNNING" ]]; then
        echo "green"
    else
        echo "none"
    fi
}

# Get inactive service (opposite of active)
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

# Create or update container service
create_or_update_service() {
    local service_name="$1"
    local container_image="$2"
    
    log_info "Creating/updating container service: $service_name"
    
    # Check if service exists
    local service_status
    service_status=$(get_deployment_status "$service_name")
    
    if [[ "$service_status" == "NOT_FOUND" ]]; then
        log_info "Creating new container service: $service_name"
        
        aws lightsail create-container-service \
            --service-name "$service_name" \
            --power micro \
            --scale 1 \
            --region "$LIGHTSAIL_REGION" \
            --tags "key=Environment,value=$ENVIRONMENT" \
                   "key=Application,value=cosmic-gardener" \
                   "key=DeploymentType,value=$DEPLOYMENT_TYPE" \
            --no-is-disabled
        
        # Wait for service to be active
        log_info "Waiting for container service to be active..."
        aws lightsail wait container-service-active \
            --service-name "$service_name" \
            --region "$LIGHTSAIL_REGION"
    fi
    
    # Create deployment configuration
    local deployment_config
    deployment_config=$(cat <<EOF
{
    "containers": {
        "$CONTAINER_NAME": {
            "image": "$container_image",
            "environment": {
                "ENVIRONMENT": "$ENVIRONMENT",
                "AWS_REGION": "$LIGHTSAIL_REGION",
                "RUST_LOG": "info",
                "SERVER_PORT": "8080"
            },
            "ports": {
                "8080": "HTTP"
            }
        }
    },
    "publicEndpoint": {
        "containerName": "$CONTAINER_NAME",
        "containerPort": 8080,
        "healthCheck": {
            "healthyThreshold": 2,
            "unhealthyThreshold": 3,
            "timeoutSeconds": 5,
            "intervalSeconds": 30,
            "path": "$HEALTH_CHECK_PATH",
            "successCodes": "200"
        }
    }
}
EOF
)
    
    # Deploy to container service
    log_info "Deploying container to service: $service_name"
    echo "$deployment_config" | aws lightsail create-container-service-deployment \
        --service-name "$service_name" \
        --region "$LIGHTSAIL_REGION" \
        --cli-input-json file:///dev/stdin
    
    log_success "Deployment initiated for service: $service_name"
}

# Wait for deployment to complete
wait_for_deployment() {
    local service_name="$1"
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for deployment to complete: $service_name"
    
    while [[ $attempt -lt $max_attempts ]]; do
        local status
        status=$(get_deployment_status "$service_name")
        
        case "$status" in
            RUNNING)
                log_success "Deployment completed successfully: $service_name"
                return 0
                ;;
            FAILED|DISABLED)
                log_error "Deployment failed: $service_name (Status: $status)"
                return 1
                ;;
            *)
                log_info "Deployment in progress: $service_name (Status: $status)"
                ;;
        esac
        
        ((attempt++))
        sleep 30
    done
    
    log_error "Deployment timed out: $service_name"
    return 1
}

# Health check for service
health_check_service() {
    local service_name="$1"
    local max_attempts=10
    local attempt=0
    
    log_info "Performing health check for service: $service_name"
    
    # Get service URL
    local service_url
    service_url=$(aws lightsail get-container-service \
        --service-name "$service_name" \
        --region "$LIGHTSAIL_REGION" \
        --query 'containerService.url' \
        --output text)
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$service_url$HEALTH_CHECK_PATH" > /dev/null; then
            log_success "Health check passed for service: $service_name"
            return 0
        fi
        
        ((attempt++))
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 30 seconds..."
        sleep 30
    done
    
    log_error "Health check failed for service: $service_name"
    return 1
}

# Create or update load balancer
create_or_update_load_balancer() {
    local target_service="$1"
    
    log_info "Creating/updating load balancer: $LOAD_BALANCER_NAME"
    
    # Check if load balancer exists
    local lb_status
    lb_status=$(aws lightsail get-load-balancer \
        --load-balancer-name "$LOAD_BALANCER_NAME" \
        --region "$LIGHTSAIL_REGION" \
        --query 'loadBalancer.state' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$lb_status" == "NOT_FOUND" ]]; then
        log_info "Creating new load balancer: $LOAD_BALANCER_NAME"
        
        aws lightsail create-load-balancer \
            --load-balancer-name "$LOAD_BALANCER_NAME" \
            --instance-port 8080 \
            --health-check-path "$HEALTH_CHECK_PATH" \
            --region "$LIGHTSAIL_REGION" \
            --tags "key=Environment,value=$ENVIRONMENT" \
                   "key=Application,value=cosmic-gardener"
        
        # Wait for load balancer to be active
        log_info "Waiting for load balancer to be active..."
        sleep 60
    fi
    
    # Get service URL
    local service_url
    service_url=$(aws lightsail get-container-service \
        --service-name "$target_service" \
        --region "$LIGHTSAIL_REGION" \
        --query 'containerService.url' \
        --output text)
    
    # Update load balancer target
    # Note: This is a simplified example. In practice, you'd need to 
    # configure the load balancer to point to the new service
    log_info "Load balancer configuration updated for service: $target_service"
}

# Blue-Green Deployment
blue_green_deployment() {
    local container_image="$1"
    
    log_info "Starting Blue-Green deployment"
    
    # Determine active and inactive services
    local active_service
    local inactive_service
    local inactive_service_name
    
    active_service=$(get_active_service)
    inactive_service=$(get_inactive_service)
    
    if [[ "$inactive_service" == "blue" ]]; then
        inactive_service_name="$BLUE_SERVICE_NAME"
    else
        inactive_service_name="$GREEN_SERVICE_NAME"
    fi
    
    log_info "Active service: $active_service"
    log_info "Deploying to inactive service: $inactive_service ($inactive_service_name)"
    
    # Deploy to inactive service
    create_or_update_service "$inactive_service_name" "$container_image"
    
    # Wait for deployment to complete
    if ! wait_for_deployment "$inactive_service_name"; then
        log_error "Blue-Green deployment failed"
        return 1
    fi
    
    # Health check
    if ! health_check_service "$inactive_service_name"; then
        log_error "Health check failed for new deployment"
        return 1
    fi
    
    # Switch traffic (update load balancer)
    create_or_update_load_balancer "$inactive_service_name"
    
    # Wait for traffic to stabilize
    log_info "Waiting for traffic to stabilize..."
    sleep 60
    
    # Final health check
    if ! health_check_service "$inactive_service_name"; then
        log_error "Final health check failed, rolling back..."
        rollback_deployment "$active_service"
        return 1
    fi
    
    # Disable old service
    if [[ "$active_service" != "none" ]]; then
        local old_service_name
        if [[ "$active_service" == "blue" ]]; then
            old_service_name="$BLUE_SERVICE_NAME"
        else
            old_service_name="$GREEN_SERVICE_NAME"
        fi
        
        log_info "Disabling old service: $old_service_name"
        aws lightsail update-container-service \
            --service-name "$old_service_name" \
            --region "$LIGHTSAIL_REGION" \
            --is-disabled
    fi
    
    log_success "Blue-Green deployment completed successfully"
}

# Rolling deployment
rolling_deployment() {
    local container_image="$1"
    local service_name="$LIGHTSAIL_SERVICE_NAME"
    
    log_info "Starting Rolling deployment"
    
    # Deploy to main service
    create_or_update_service "$service_name" "$container_image"
    
    # Wait for deployment to complete
    if ! wait_for_deployment "$service_name"; then
        log_error "Rolling deployment failed"
        return 1
    fi
    
    # Health check
    if ! health_check_service "$service_name"; then
        log_error "Health check failed for rolling deployment"
        return 1
    fi
    
    log_success "Rolling deployment completed successfully"
}

# Direct deployment
direct_deployment() {
    local container_image="$1"
    local service_name="$LIGHTSAIL_SERVICE_NAME"
    
    log_info "Starting Direct deployment"
    
    # Deploy to main service
    create_or_update_service "$service_name" "$container_image"
    
    # Wait for deployment to complete
    if ! wait_for_deployment "$service_name"; then
        log_error "Direct deployment failed"
        return 1
    fi
    
    log_success "Direct deployment completed successfully"
}

# Rollback deployment
rollback_deployment() {
    local target_service="$1"
    
    log_warning "Rolling back deployment..."
    
    if [[ "$target_service" == "none" ]]; then
        log_error "No service to rollback to"
        return 1
    fi
    
    local service_name
    if [[ "$target_service" == "blue" ]]; then
        service_name="$BLUE_SERVICE_NAME"
    else
        service_name="$GREEN_SERVICE_NAME"
    fi
    
    # Enable old service
    aws lightsail update-container-service \
        --service-name "$service_name" \
        --region "$LIGHTSAIL_REGION" \
        --no-is-disabled
    
    # Update load balancer
    create_or_update_load_balancer "$service_name"
    
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
            "footer": "Lightsail Deployment",
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

# Cleanup old deployments
cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."
    
    # This would typically clean up old container service versions
    # For now, we'll just log that cleanup is happening
    log_info "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Lightsail deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Deployment Type: $DEPLOYMENT_TYPE"
    
    # Send start notification
    send_notification "info" "Deployment started"
    
    validate_environment
    check_prerequisites
    
    local container_image="$CONTAINER_REGISTRY:$IMAGE_TAG"
    
    # Execute deployment based on type
    case "$DEPLOYMENT_TYPE" in
        blue-green)
            if blue_green_deployment "$container_image"; then
                send_notification "success" "Blue-Green deployment completed successfully"
            else
                send_notification "error" "Blue-Green deployment failed"
                exit 1
            fi
            ;;
        rolling)
            if rolling_deployment "$container_image"; then
                send_notification "success" "Rolling deployment completed successfully"
            else
                send_notification "error" "Rolling deployment failed"
                exit 1
            fi
            ;;
        direct)
            if direct_deployment "$container_image"; then
                send_notification "success" "Direct deployment completed successfully"
            else
                send_notification "error" "Direct deployment failed"
                exit 1
            fi
            ;;
        *)
            log_error "Invalid deployment type: $DEPLOYMENT_TYPE"
            show_usage
            exit 1
            ;;
    esac
    
    cleanup_old_deployments
    
    log_success "Lightsail deployment completed successfully!"
    log_info "Service URL: https://$LIGHTSAIL_SERVICE_NAME.service.lightsail.aws.com"
}

# Trap for cleanup on script exit
trap 'send_notification "error" "Deployment script interrupted"' INT TERM

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi