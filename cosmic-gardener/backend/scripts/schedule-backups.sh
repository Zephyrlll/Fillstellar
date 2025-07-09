#!/bin/bash

# ===============================================
# Backup Scheduler for Cosmic Gardener Backend
# ===============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/var/log/cosmic-gardener/backup-scheduler.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[SCHEDULER]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SCHEDULER]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[SCHEDULER]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[SCHEDULER]${NC} $1" | tee -a "$LOG_FILE"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  install     Install cron jobs for automated backups"
    echo "  uninstall   Remove cron jobs for automated backups"
    echo "  status      Show current backup schedule status"
    echo "  run-hourly  Run hourly backup tasks"
    echo "  run-daily   Run daily backup tasks"
    echo "  run-weekly  Run weekly backup tasks"
    echo ""
    echo "Options:"
    echo "  --environment ENV     Environment (production|staging|development)"
    echo "  --dry-run            Show what would be done without executing"
    echo ""
    echo "Examples:"
    echo "  $0 install --environment production"
    echo "  $0 run-daily --dry-run"
    echo "  $0 status"
}

# Create log directory
setup_logging() {
    local log_dir=$(dirname "$LOG_FILE")
    mkdir -p "$log_dir"
    
    # Rotate log file if it's too large (>10MB)
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -c%s "$LOG_FILE") -gt 10485760 ]]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
        touch "$LOG_FILE"
    fi
}

# Generate cron entries
generate_cron_entries() {
    local environment="$1"
    
    cat << EOF
# Cosmic Gardener Backup Scheduler - $environment
# Environment variables
ENVIRONMENT=$environment
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
SHELL=/bin/bash

# Hourly: Database backup (every 2 hours during business hours)
0 8-20/2 * * * $SCRIPT_DIR/schedule-backups.sh run-hourly

# Daily: Full backup (daily at 2 AM)
0 2 * * * $SCRIPT_DIR/schedule-backups.sh run-daily

# Weekly: Full backup with S3 upload (Sunday at 3 AM)
0 3 * * 0 $SCRIPT_DIR/schedule-backups.sh run-weekly

# Monthly: Cleanup old backups (first day of month at 4 AM)
0 4 1 * * $SCRIPT_DIR/schedule-backups.sh cleanup-monthly

# Health check: Validate recent backups (daily at 6 AM)
0 6 * * * $SCRIPT_DIR/schedule-backups.sh validate-recent
EOF
}

# Install cron jobs
install_cron_jobs() {
    local environment="$1"
    local dry_run="${2:-false}"
    
    log_info "Installing backup cron jobs for $environment environment..."
    
    # Generate cron entries
    local cron_entries
    cron_entries=$(generate_cron_entries "$environment")
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would install the following cron entries:"
        echo "$cron_entries"
        return 0
    fi
    
    # Install cron jobs
    local temp_crontab=$(mktemp)
    
    # Get existing crontab (excluding our entries)
    if crontab -l 2>/dev/null | grep -v "Cosmic Gardener Backup Scheduler" | grep -v "$SCRIPT_DIR/schedule-backups.sh" > "$temp_crontab"; then
        echo "" >> "$temp_crontab"
    fi
    
    # Add our entries
    echo "$cron_entries" >> "$temp_crontab"
    
    # Install new crontab
    if crontab "$temp_crontab"; then
        rm -f "$temp_crontab"
        log_success "Backup cron jobs installed successfully"
    else
        rm -f "$temp_crontab"
        log_error "Failed to install backup cron jobs"
        return 1
    fi
}

# Uninstall cron jobs
uninstall_cron_jobs() {
    local dry_run="${1:-false}"
    
    log_info "Removing backup cron jobs..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would remove all Cosmic Gardener backup cron entries"
        return 0
    fi
    
    # Remove our cron entries
    local temp_crontab=$(mktemp)
    
    if crontab -l 2>/dev/null | grep -v "Cosmic Gardener Backup Scheduler" | grep -v "$SCRIPT_DIR/schedule-backups.sh" > "$temp_crontab"; then
        if crontab "$temp_crontab"; then
            rm -f "$temp_crontab"
            log_success "Backup cron jobs removed successfully"
        else
            rm -f "$temp_crontab"
            log_error "Failed to remove backup cron jobs"
            return 1
        fi
    else
        rm -f "$temp_crontab"
        log_info "No backup cron jobs found to remove"
    fi
}

# Show cron status
show_cron_status() {
    log_info "Current backup cron schedule:"
    
    if crontab -l 2>/dev/null | grep -A10 -B2 "Cosmic Gardener Backup Scheduler"; then
        echo ""
        log_info "Backup cron jobs are installed"
    else
        log_warning "No backup cron jobs found"
    fi
    
    # Show recent backup logs
    echo ""
    log_info "Recent backup log entries:"
    if [[ -f "$LOG_FILE" ]]; then
        tail -20 "$LOG_FILE"
    else
        log_info "No backup logs found"
    fi
}

# Run hourly backup tasks
run_hourly_tasks() {
    local dry_run="${1:-false}"
    
    log_info "Running hourly backup tasks..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would create database backup"
        return 0
    fi
    
    # Database backup every 2 hours
    if ! "$BACKUP_SCRIPT" backup --type database --compress; then
        log_error "Hourly database backup failed"
        return 1
    fi
    
    log_success "Hourly backup tasks completed"
}

# Run daily backup tasks
run_daily_tasks() {
    local dry_run="${1:-false}"
    
    log_info "Running daily backup tasks..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would create full backup and cleanup old backups"
        return 0
    fi
    
    # Full backup daily
    if ! "$BACKUP_SCRIPT" backup --type full --compress; then
        log_error "Daily full backup failed"
        return 1
    fi
    
    # Cleanup old backups (keep 7 days)
    if ! "$BACKUP_SCRIPT" cleanup --retention-days 7; then
        log_warning "Daily cleanup failed"
    fi
    
    log_success "Daily backup tasks completed"
}

# Run weekly backup tasks
run_weekly_tasks() {
    local dry_run="${1:-false}"
    
    log_info "Running weekly backup tasks..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would create full backup with S3 upload"
        return 0
    fi
    
    # Full backup with S3 upload
    if ! "$BACKUP_SCRIPT" backup --type full --compress --upload-s3; then
        log_error "Weekly full backup with S3 upload failed"
        return 1
    fi
    
    log_success "Weekly backup tasks completed"
}

# Cleanup monthly
cleanup_monthly() {
    local dry_run="${1:-false}"
    
    log_info "Running monthly cleanup tasks..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would cleanup old backups (30 days retention)"
        return 0
    fi
    
    # Cleanup old backups (keep 30 days)
    if ! "$BACKUP_SCRIPT" cleanup --retention-days 30; then
        log_error "Monthly cleanup failed"
        return 1
    fi
    
    log_success "Monthly cleanup completed"
}

# Validate recent backups
validate_recent_backups() {
    local dry_run="${1:-false}"
    
    log_info "Validating recent backups..."
    
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run - would validate recent backups"
        return 0
    fi
    
    # Get list of recent backups and validate them
    local backup_dir="/opt/cosmic-gardener/backups"
    local validation_failed=false
    
    # Find backups from last 24 hours
    for backup in $(find "$backup_dir" -name "*backup*" -type d -mtime -1); do
        local backup_id=$(basename "$backup")
        
        if ! "$BACKUP_SCRIPT" validate --backup-id "$backup_id"; then
            log_error "Validation failed for backup: $backup_id"
            validation_failed=true
        else
            log_info "Validation passed for backup: $backup_id"
        fi
    done
    
    if [[ "$validation_failed" == true ]]; then
        log_error "Some backup validations failed"
        return 1
    fi
    
    log_success "All recent backups validated successfully"
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
            "title": "Cosmic Gardener Backup Scheduler",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$message",
                    "short": false
                }
            ],
            "footer": "Backup Scheduler",
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

# Main function
main() {
    local command="${1:-}"
    shift || true
    
    setup_logging
    
    case "$command" in
        install)
            local environment="$ENVIRONMENT"
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --environment)
                        environment="$2"
                        shift 2
                        ;;
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            install_cron_jobs "$environment" "$dry_run"
            ;;
        
        uninstall)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            uninstall_cron_jobs "$dry_run"
            ;;
        
        status)
            show_cron_status
            ;;
        
        run-hourly)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if run_hourly_tasks "$dry_run"; then
                send_notification "success" "Hourly backup tasks completed"
            else
                send_notification "error" "Hourly backup tasks failed"
                exit 1
            fi
            ;;
        
        run-daily)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if run_daily_tasks "$dry_run"; then
                send_notification "success" "Daily backup tasks completed"
            else
                send_notification "error" "Daily backup tasks failed"
                exit 1
            fi
            ;;
        
        run-weekly)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if run_weekly_tasks "$dry_run"; then
                send_notification "success" "Weekly backup tasks completed"
            else
                send_notification "error" "Weekly backup tasks failed"
                exit 1
            fi
            ;;
        
        cleanup-monthly)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if cleanup_monthly "$dry_run"; then
                send_notification "success" "Monthly cleanup completed"
            else
                send_notification "error" "Monthly cleanup failed"
                exit 1
            fi
            ;;
        
        validate-recent)
            local dry_run=false
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --dry-run)
                        dry_run=true
                        shift
                        ;;
                    *)
                        log_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            if validate_recent_backups "$dry_run"; then
                send_notification "success" "Recent backup validation completed"
            else
                send_notification "error" "Recent backup validation failed"
                exit 1
            fi
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