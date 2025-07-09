#!/bin/bash

# ===============================================
# Secure Docker Build Script
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="${IMAGE_NAME:-cosmic-gardener-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.optimized}"
SECURITY_SCAN="${SECURITY_SCAN:-true}"
PUSH_IMAGE="${PUSH_IMAGE:-false}"
REGISTRY="${REGISTRY:-}"

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

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --name NAME        Image name (default: cosmic-gardener-backend)"
    echo "  -t, --tag TAG         Image tag (default: latest)"
    echo "  -f, --file FILE       Dockerfile path (default: Dockerfile.optimized)"
    echo "  -s, --security-scan   Enable security scanning (default: true)"
    echo "  -p, --push            Push to registry after build"
    echo "  -r, --registry REG    Registry URL for pushing"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  IMAGE_NAME            Docker image name"
    echo "  IMAGE_TAG             Docker image tag"
    echo "  DOCKERFILE            Dockerfile to use"
    echo "  SECURITY_SCAN         Enable/disable security scanning"
    echo "  PUSH_IMAGE            Push image after successful build"
    echo "  REGISTRY              Registry URL"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--name)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -f|--file)
                DOCKERFILE="$2"
                shift 2
                ;;
            -s|--security-scan)
                SECURITY_SCAN="true"
                shift
                ;;
            -p|--push)
                PUSH_IMAGE="true"
                shift
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("docker" "git")
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
    
    # Check if Dockerfile exists
    if [[ ! -f "$PROJECT_ROOT/$DOCKERFILE" ]]; then
        log_error "Dockerfile not found: $PROJECT_ROOT/$DOCKERFILE"
        exit 1
    fi
    
    # Install security scanner if security scan is enabled
    if [[ "$SECURITY_SCAN" == "true" ]]; then
        if ! command -v trivy &> /dev/null; then
            log_info "Installing Trivy security scanner..."
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Generate build context
generate_build_context() {
    log_info "Generating build context..."
    
    # Create build context directory
    local build_dir="$PROJECT_ROOT/build-context"
    rm -rf "$build_dir"
    mkdir -p "$build_dir"
    
    # Copy necessary files
    cp -r "$PROJECT_ROOT/src" "$build_dir/"
    cp "$PROJECT_ROOT/Cargo.toml" "$build_dir/"
    cp "$PROJECT_ROOT/Cargo.lock" "$build_dir/"
    cp -r "$PROJECT_ROOT/config" "$build_dir/"
    cp -r "$PROJECT_ROOT/migrations" "$build_dir/"
    cp -r "$PROJECT_ROOT/scripts" "$build_dir/"
    
    # Copy Dockerfile
    cp "$PROJECT_ROOT/$DOCKERFILE" "$build_dir/Dockerfile"
    
    # Generate .dockerignore
    cat > "$build_dir/.dockerignore" << EOF
# Build artifacts
target/
Dockerfile*
.dockerignore
.git
.gitignore
README.md
*.md
.env*
.vscode/
.idea/

# Test and development files
tests/
benches/
examples/
docs/
coverage/
*.log
*.tmp

# Security files
.aws/
.ssh/
secrets/
*.key
*.pem
*.crt
*.p12
*.pfx

# System files
.DS_Store
Thumbs.db
*.swp
*.swo
*~
EOF
    
    # Generate build metadata
    cat > "$build_dir/build-metadata.json" << EOF
{
  "image_name": "$IMAGE_NAME",
  "image_tag": "$IMAGE_TAG",
  "dockerfile": "$DOCKERFILE",
  "build_time": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "security_scan": $SECURITY_SCAN,
  "builder": "$(whoami)@$(hostname)"
}
EOF
    
    log_success "Build context generated at $build_dir"
}

# Build Docker image
build_image() {
    log_info "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
    
    local build_dir="$PROJECT_ROOT/build-context"
    local full_image_name="$IMAGE_NAME:$IMAGE_TAG"
    
    # Build arguments
    local build_args=(
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        --build-arg GIT_COMMIT="$(git rev-parse HEAD)"
        --build-arg GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
        --build-arg VERSION="$(grep '^version' "$PROJECT_ROOT/Cargo.toml" | cut -d'"' -f2)"
    )
    
    # Build the image
    if ! docker build \
        "${build_args[@]}" \
        --target production \
        --tag "$full_image_name" \
        "$build_dir"; then
        log_error "Docker build failed"
        exit 1
    fi
    
    # Tag additional versions
    docker tag "$full_image_name" "$IMAGE_NAME:latest"
    
    # If registry is specified, tag for registry
    if [[ -n "$REGISTRY" ]]; then
        docker tag "$full_image_name" "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
        docker tag "$full_image_name" "$REGISTRY/$IMAGE_NAME:latest"
    fi
    
    log_success "Docker image built successfully"
}

# Run security scan
security_scan() {
    if [[ "$SECURITY_SCAN" != "true" ]]; then
        log_info "Security scanning disabled"
        return 0
    fi
    
    log_info "Running security scan on image: $IMAGE_NAME:$IMAGE_TAG"
    
    local scan_results="$PROJECT_ROOT/security-scan-results.json"
    
    # Run comprehensive security scan
    if ! trivy image \
        --format json \
        --output "$scan_results" \
        --security-checks vuln,secret,config \
        --severity HIGH,CRITICAL \
        "$IMAGE_NAME:$IMAGE_TAG"; then
        log_error "Security scan failed"
        exit 1
    fi
    
    # Check for critical vulnerabilities
    local critical_count
    critical_count=$(jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' "$scan_results" 2>/dev/null | wc -l)
    
    local high_count
    high_count=$(jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID' "$scan_results" 2>/dev/null | wc -l)
    
    if [[ $critical_count -gt 0 ]]; then
        log_error "Found $critical_count critical vulnerabilities"
        log_error "Build failed due to security issues"
        exit 1
    elif [[ $high_count -gt 0 ]]; then
        log_warning "Found $high_count high severity vulnerabilities"
        log_warning "Consider reviewing security scan results: $scan_results"
    else
        log_success "No critical or high severity vulnerabilities found"
    fi
    
    # Generate security report
    trivy image \
        --format table \
        --security-checks vuln,secret,config \
        --severity HIGH,CRITICAL \
        "$IMAGE_NAME:$IMAGE_TAG" > "$PROJECT_ROOT/security-report.txt"
    
    log_success "Security scan completed. Report saved to security-report.txt"
}

# Test image
test_image() {
    log_info "Testing Docker image: $IMAGE_NAME:$IMAGE_TAG"
    
    # Test image can start
    local container_id
    container_id=$(docker run -d --rm -p 8080:8080 "$IMAGE_NAME:$IMAGE_TAG")
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    if curl -f -s http://localhost:8080/health > /dev/null; then
        log_success "Image test passed"
    else
        log_error "Image test failed - health endpoint not responding"
        docker stop "$container_id" || true
        exit 1
    fi
    
    # Stop test container
    docker stop "$container_id" || true
    
    log_success "Image testing completed"
}

# Push image to registry
push_image() {
    if [[ "$PUSH_IMAGE" != "true" ]]; then
        log_info "Image pushing disabled"
        return 0
    fi
    
    if [[ -z "$REGISTRY" ]]; then
        log_error "Registry not specified for push"
        exit 1
    fi
    
    log_info "Pushing image to registry: $REGISTRY"
    
    # Push all tags
    docker push "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    docker push "$REGISTRY/$IMAGE_NAME:latest"
    
    log_success "Image pushed successfully"
}

# Generate image metadata
generate_metadata() {
    log_info "Generating image metadata..."
    
    local metadata_file="$PROJECT_ROOT/image-metadata.json"
    local image_size
    image_size=$(docker images --format "table {{.Size}}" "$IMAGE_NAME:$IMAGE_TAG" | tail -n1)
    
    cat > "$metadata_file" << EOF
{
  "image_name": "$IMAGE_NAME",
  "image_tag": "$IMAGE_TAG",
  "image_size": "$image_size",
  "dockerfile": "$DOCKERFILE",
  "build_time": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "security_scan": $SECURITY_SCAN,
  "registry": "$REGISTRY",
  "pushed": $PUSH_IMAGE,
  "builder": "$(whoami)@$(hostname)"
}
EOF
    
    log_success "Image metadata generated: $metadata_file"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove build context
    rm -rf "$PROJECT_ROOT/build-context"
    
    # Remove dangling images
    docker image prune -f
    
    log_success "Cleanup completed"
}

# Main function
main() {
    log_info "Starting secure Docker build process"
    
    parse_args "$@"
    check_prerequisites
    generate_build_context
    build_image
    security_scan
    test_image
    push_image
    generate_metadata
    cleanup
    
    log_success "Secure Docker build completed successfully!"
    log_info "Image: $IMAGE_NAME:$IMAGE_TAG"
    log_info "Size: $(docker images --format 'table {{.Size}}' "$IMAGE_NAME:$IMAGE_TAG" | tail -n1)"
}

# Trap for cleanup on script exit
trap cleanup EXIT

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi