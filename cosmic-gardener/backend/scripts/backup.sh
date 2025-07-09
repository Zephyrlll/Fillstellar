#!/bin/bash

# ===============================================
# Backup and Restore Script for Cosmic Gardener Backend
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/opt/cosmic-gardener/backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET:-cosmic-gardener-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[BACKUP]${NC} $1"
}

log_error() {
    echo -e "${RED}[BACKUP]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup        Create a backup"
    echo "  restore       Restore from backup"
    echo "  list          List available backups"
    echo "  cleanup       Clean up old backups"
    echo "  validate      Validate backup integrity"
    echo ""
    echo "Options:"
    echo "  --type TYPE           Backup type (full|database|config|logs)"
    echo "  --backup-id ID        Backup ID for restore operations"
    echo "  --environment ENV     Environment (production|staging|development)"
    echo "  --upload-s3           Upload backup to S3"
    echo "  --encrypt             Encrypt backup"
    echo "  --compress            Compress backup"
    echo "  --retention-days N    Number of days to retain backups"
    echo ""
    echo "Examples:"
    echo "  $0 backup --type full --upload-s3 --encrypt"
    echo "  $0 restore --backup-id 123e4567-e89b-12d3-a456-426614174000"
    echo "  $0 list --environment production"
    echo "  $0 cleanup --retention-days 30"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("pg_dump" "pg_restore" "tar" "gzip" "aws" "sha256sum")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check environment variables
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable not set"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    log_success "Prerequisites check passed"
}

# Create database backup
backup_database() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating database backup..."
    
    mkdir -p "$backup_path"
    
    # Create database dump
    local db_backup_file="$backup_path/database.sql"
    if ! pg_dump "$DATABASE_URL" \
        --no-password \
        --verbose \
        --format=custom \
        --file="$db_backup_file"; then
        log_error "Database backup failed"
        return 1
    fi
    
    # Create metadata
    cat > "$backup_path/database_metadata.json" << EOF
{
    "backup_type": "database",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "database_url": "${DATABASE_URL%%@*}@***",
    "file_size": $(stat -c%s "$db_backup_file"),
    "checksum": "$(sha256sum "$db_backup_file" | cut -d' ' -f1)"
}
EOF
    
    log_success "Database backup created: $db_backup_file"
}

# Create application backup
backup_application() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating application backup..."
    
    mkdir -p "$backup_path"
    
    # Application files to backup
    local app_files=(
        "/app/config"
        "/app/logs"
        "/app/data"
        "/opt/cosmic-gardener/config"
        "/opt/cosmic-gardener/.env*"
    )
    
    local app_backup_file="$backup_path/application.tar"
    if ! tar -cf "$app_backup_file" "${app_files[@]}" 2>/dev/null; then
        log_warning "Some application files may not exist, continuing..."
    fi
    
    # Create metadata
    cat > "$backup_path/application_metadata.json" << EOF
{
    "backup_type": "application",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "files_included": [$(printf '"%s",' "${app_files[@]}" | sed 's/,$//')],
    "file_size": $(stat -c%s "$app_backup_file" 2>/dev/null || echo 0),
    "checksum": "$(sha256sum "$app_backup_file" 2>/dev/null | cut -d' ' -f1 || echo 'unknown')"
}
EOF
    
    log_success "Application backup created: $app_backup_file"
}

# Create configuration backup
backup_configuration() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating configuration backup..."
    
    mkdir -p "$backup_path"
    
    # Configuration files to backup
    local config_files=(
        "/app/config"
        "/opt/cosmic-gardener/config"
        "/etc/nginx/sites-available/cosmic-gardener"
        "/opt/cosmic-gardener/.env*"
    )
    
    local config_backup_file="$backup_path/configuration.tar"
    if ! tar -cf "$config_backup_file" "${config_files[@]}" 2>/dev/null; then
        log_warning "Some configuration files may not exist, continuing..."
    fi
    
    # Create metadata
    cat > "$backup_path/configuration_metadata.json" << EOF
{
    "backup_type": "configuration",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "files_included": [$(printf '"%s",' "${config_files[@]}" | sed 's/,$//')],
    "file_size": $(stat -c%s "$config_backup_file" 2>/dev/null || echo 0),
    "checksum": "$(sha256sum "$config_backup_file" 2>/dev/null | cut -d' ' -f1 || echo 'unknown')"
}
EOF
    
    log_success "Configuration backup created: $config_backup_file"
}

# Create logs backup
backup_logs() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating logs backup..."
    
    mkdir -p "$backup_path"
    
    # Logs to backup
    local log_dirs=(
        "/app/logs"
        "/var/log/nginx"
        "/opt/cosmic-gardener/logs"
    )
    
    local logs_backup_file="$backup_path/logs.tar"
    if ! tar -cf "$logs_backup_file" "${log_dirs[@]}" 2>/dev/null; then
        log_warning "Some log directories may not exist, continuing..."
    fi
    
    # Create metadata
    cat > "$backup_path/logs_metadata.json" << EOF
{
    "backup_type": "logs",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "directories_included": [$(printf '"%s",' "${log_dirs[@]}" | sed 's/,$//')],
    "file_size": $(stat -c%s "$logs_backup_file" 2>/dev/null || echo 0),
    "checksum": "$(sha256sum "$logs_backup_file" 2>/dev/null | cut -d' ' -f1 || echo 'unknown')"
}
EOF
    
    log_success "Logs backup created: $logs_backup_file"
}

# Create full backup
backup_full() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating full backup..."
    
    mkdir -p "$backup_path"
    
    # Create all backup types
    backup_database "$backup_name"
    backup_application "$backup_name"
    backup_configuration "$backup_name"
    backup_logs "$backup_name"
    
    # Create manifest
    cat > "$backup_path/manifest.json" << EOF
{
    "backup_id": "$(uuidgen)",
    "backup_type": "full",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "version": "$(grep '^version' "$PROJECT_ROOT/Cargo.toml" | cut -d'"' -f2)",
    "components": [
        "database",
        "application",
        "configuration",
        "logs"
    ]
}
EOF
    
    log_success "Full backup created: $backup_path"
}

# Compress backup
compress_backup() {
    local backup_path="$1"
    local compressed_path="${backup_path}.tar.gz"
    
    log_info "Compressing backup..."
    
    if ! tar -czf "$compressed_path" -C "$(dirname "$backup_path")" "$(basename "$backup_path")"; then
        log_error "Backup compression failed"
        return 1
    fi
    
    # Remove original directory
    rm -rf "$backup_path"
    
    log_success "Backup compressed: $compressed_path"
    echo "$compressed_path"
}

# Encrypt backup
encrypt_backup() {
    local backup_path="$1"
    local encrypted_path="${backup_path}.gpg"
    
    log_info "Encrypting backup..."
    
    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log_error "BACKUP_ENCRYPTION_KEY environment variable not set"
        return 1
    fi
    
    if ! gpg --batch --yes --cipher-algo AES256 --symmetric --passphrase "$BACKUP_ENCRYPTION_KEY" --output "$encrypted_path" "$backup_path"; then
        log_error "Backup encryption failed"
        return 1
    fi
    
    # Remove original file
    rm -f "$backup_path"
    
    log_success "Backup encrypted: $encrypted_path"
    echo "$encrypted_path"
}

# Upload backup to S3
upload_to_s3() {
    local backup_path="$1"
    local s3_key="$ENVIRONMENT/$(basename "$backup_path")"
    
    log_info "Uploading backup to S3..."
    
    if ! aws s3 cp "$backup_path" "s3://$S3_BUCKET/$s3_key" --region "$S3_REGION"; then
        log_error "S3 upload failed"
        return 1
    fi
    
    log_success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
}

# Restore database
restore_database() {
    local backup_path="$1"
    local db_backup_file="$backup_path/database.sql"
    
    log_info "Restoring database..."
    
    if [[ ! -f "$db_backup_file" ]]; then
        log_error "Database backup file not found: $db_backup_file"
        return 1
    fi
    
    # Create pre-restore backup
    log_info "Creating pre-restore backup..."
    local pre_restore_backup="pre_restore_$(date +%Y%m%d_%H%M%S)"
    backup_database "$pre_restore_backup"
    
    # Restore database
    if ! pg_restore --clean --if-exists --verbose --dbname "$DATABASE_URL" "$db_backup_file"; then
        log_error "Database restore failed"
        return 1
    fi
    
    log_success "Database restored successfully"
}

# Restore application
restore_application() {
    local backup_path="$1"
    local app_backup_file="$backup_path/application.tar"
    
    log_info "Restoring application..."
    
    if [[ ! -f "$app_backup_file" ]]; then
        log_error "Application backup file not found: $app_backup_file"
        return 1
    fi
    
    # Extract application backup
    if ! tar -xf "$app_backup_file" -C /; then
        log_error "Application restore failed"
        return 1
    fi
    
    log_success "Application restored successfully"
}

# Restore configuration
restore_configuration() {
    local backup_path="$1"
    local config_backup_file="$backup_path/configuration.tar"
    
    log_info "Restoring configuration..."
    
    if [[ ! -f "$config_backup_file" ]]; then
        log_error "Configuration backup file not found: $config_backup_file"
        return 1
    fi
    
    # Extract configuration backup
    if ! tar -xf "$config_backup_file" -C /; then
        log_error "Configuration restore failed"
        return 1
    fi
    
    # Restart nginx if config was restored
    if [[ -f "/etc/nginx/sites-available/cosmic-gardener" ]]; then
        log_info "Restarting nginx..."
        systemctl restart nginx || log_warning "Failed to restart nginx"
    fi
    
    log_success "Configuration restored successfully"
}

# Restore from backup
restore_from_backup() {
    local backup_id="$1"
    local restore_type="${2:-full}"
    
    log_info "Restoring from backup: $backup_id"
    
    # Find backup
    local backup_path="$BACKUP_DIR/$backup_id"
    if [[ ! -d "$backup_path" ]]; then
        # Try to find compressed backup
        local compressed_backup="$backup_path.tar.gz"
        if [[ -f "$compressed_backup" ]]; then
            log_info "Extracting compressed backup..."
            if ! tar -xzf "$compressed_backup" -C "$BACKUP_DIR"; then
                log_error "Failed to extract backup"
                return 1
            fi
        else
            log_error "Backup not found: $backup_id"
            return 1
        fi
    fi
    
    # Perform restore based on type
    case "$restore_type" in
        full)
            restore_database "$backup_path"
            restore_application "$backup_path"
            restore_configuration "$backup_path"
            ;;
        database)
            restore_database "$backup_path"
            ;;
        application)
            restore_application "$backup_path"
            ;;
        configuration)
            restore_configuration "$backup_path"
            ;;
        *)
            log_error "Unknown restore type: $restore_type"
            return 1
            ;;
    esac
    
    log_success "Restore completed successfully"
}

# List available backups
list_backups() {
    log_info "Available backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory not found: $BACKUP_DIR"
        return 0
    fi
    
    local count=0
    for backup in "$BACKUP_DIR"/*; do
        if [[ -d "$backup" ]] || [[ "$backup" == *.tar.gz ]]; then
            local backup_name=$(basename "$backup")
            local backup_date=""
            
            if [[ -f "$backup/manifest.json" ]]; then
                backup_date=$(jq -r '.created_at' "$backup/manifest.json" 2>/dev/null || echo "unknown")
            elif [[ -f "$backup.tar.gz" ]]; then
                backup_date=$(stat -c %y "$backup.tar.gz" | cut -d' ' -f1)
            fi
            
            echo "  $backup_name ($backup_date)"
            ((count++))
        fi
    done
    
    if [[ $count -eq 0 ]]; then
        log_info "No backups found"
    else
        log_info "Total backups: $count"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    local retention_days="${1:-$RETENTION_DAYS}"
    
    log_info "Cleaning up backups older than $retention_days days..."
    
    local deleted_count=0
    local cutoff_date=$(date -d "$retention_days days ago" +%Y%m%d)
    
    for backup in "$BACKUP_DIR"/*; do
        if [[ -d "$backup" ]] || [[ "$backup" == *.tar.gz ]]; then
            local backup_name=$(basename "$backup")
            local backup_date=""
            
            # Extract date from backup name (assumes format: type_YYYYMMDD_HHMMSS)
            if [[ "$backup_name" =~ ([0-9]{8}) ]]; then
                backup_date="${BASH_REMATCH[1]}"
                
                if [[ "$backup_date" -lt "$cutoff_date" ]]; then
                    log_info "Deleting old backup: $backup_name"
                    rm -rf "$backup"
                    ((deleted_count++))
                fi
            fi
        fi
    done
    
    log_success "Cleanup completed. Deleted $deleted_count old backups"
}

# Validate backup integrity
validate_backup() {
    local backup_id="$1"
    local backup_path="$BACKUP_DIR/$backup_id"
    
    log_info "Validating backup: $backup_id"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup not found: $backup_id"
        return 1
    fi
    
    # Check manifest
    if [[ ! -f "$backup_path/manifest.json" ]]; then
        log_error "Backup manifest not found"
        return 1
    fi
    
    # Validate each component
    local components
    components=$(jq -r '.components[]' "$backup_path/manifest.json" 2>/dev/null)
    
    local validation_failed=false
    
    for component in $components; do
        case "$component" in
            database)
                if [[ ! -f "$backup_path/database.sql" ]]; then
                    log_error "Database backup file missing"
                    validation_failed=true
                fi
                ;;
            application)
                if [[ ! -f "$backup_path/application.tar" ]]; then
                    log_error "Application backup file missing"
                    validation_failed=true
                fi
                ;;
            configuration)
                if [[ ! -f "$backup_path/configuration.tar" ]]; then
                    log_error "Configuration backup file missing"
                    validation_failed=true
                fi
                ;;
            logs)
                if [[ ! -f "$backup_path/logs.tar" ]]; then
                    log_error "Logs backup file missing"
                    validation_failed=true
                fi
                ;;
        esac
    done
    
    if [[ "$validation_failed" == true ]]; then
        log_error "Backup validation failed"
        return 1
    fi
    
    log_success "Backup validation passed"
}

# Main function
main() {
    local command="${1:-}"
    shift || true
    
    case "$command" in
        backup)
            local backup_type="full"
            local upload_s3=false
            local encrypt=false
            local compress=true
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --type)
                        backup_type="$2"
                        shift 2
                        ;;
                    --upload-s3)
                        upload_s3=true
                        shift
                        ;;
                    --encrypt)
                        encrypt=true
                        shift
                        ;;
                    --compress)
                        compress=true
                        shift
                        ;;
                    --no-compress)
                        compress=false
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            check_prerequisites
            
            local backup_name="${backup_type}_backup_$(date +%Y%m%d_%H%M%S)"
            local backup_path="$BACKUP_DIR/$backup_name"
            
            case "$backup_type" in
                full)
                    backup_full "$backup_name"
                    ;;
                database)
                    backup_database "$backup_name"
                    ;;
                application)
                    backup_application "$backup_name"
                    ;;
                configuration)
                    backup_configuration "$backup_name"
                    ;;
                logs)
                    backup_logs "$backup_name"
                    ;;
                *)
                    log_error "Unknown backup type: $backup_type"
                    exit 1
                    ;;
            esac
            
            # Post-process backup
            local final_backup_path="$backup_path"
            
            if [[ "$compress" == true ]]; then
                final_backup_path=$(compress_backup "$backup_path")
            fi
            
            if [[ "$encrypt" == true ]]; then
                final_backup_path=$(encrypt_backup "$final_backup_path")
            fi
            
            if [[ "$upload_s3" == true ]]; then
                upload_to_s3 "$final_backup_path"
            fi
            
            log_success "Backup completed: $final_backup_path"
            ;;
        
        restore)
            local backup_id=""
            local restore_type="full"
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --backup-id)
                        backup_id="$2"
                        shift 2
                        ;;
                    --type)
                        restore_type="$2"
                        shift 2
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if [[ -z "$backup_id" ]]; then
                log_error "Backup ID is required for restore"
                show_usage
                exit 1
            fi
            
            check_prerequisites
            restore_from_backup "$backup_id" "$restore_type"
            ;;
        
        list)
            list_backups
            ;;
        
        cleanup)
            local retention_days="$RETENTION_DAYS"
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --retention-days)
                        retention_days="$2"
                        shift 2
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            cleanup_old_backups "$retention_days"
            ;;
        
        validate)
            local backup_id=""
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --backup-id)
                        backup_id="$2"
                        shift 2
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if [[ -z "$backup_id" ]]; then
                log_error "Backup ID is required for validation"
                show_usage
                exit 1
            fi
            
            validate_backup "$backup_id"
            ;;
        
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi