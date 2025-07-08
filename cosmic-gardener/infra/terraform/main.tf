# Cosmic Gardener Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

# Lightsail Instance for Backend
resource "aws_lightsail_instance" "cosmic_gardener_backend" {
  name              = "cosmic-gardener-${var.environment}"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_20_04"
  bundle_id         = "nano_2_0"
  
  tags = {
    Environment = var.environment
    Project     = "cosmic-gardener"
    Component   = "backend"
  }
}

# Lightsail Database
resource "aws_lightsail_database" "cosmic_gardener_db" {
  name                 = "cosmic-gardener-db-${var.environment}"
  availability_zone    = "${var.aws_region}a"
  master_database_name = "cosmic_gardener"
  master_username      = "postgres"
  master_password      = var.db_password
  blueprint_id         = "postgres_12"
  bundle_id            = "micro_1_0"
  
  tags = {
    Environment = var.environment
    Project     = "cosmic-gardener"
    Component   = "database"
  }
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Outputs
output "backend_public_ip" {
  value = aws_lightsail_instance.cosmic_gardener_backend.public_ip_address
}

output "database_endpoint" {
  value = aws_lightsail_database.cosmic_gardener_db.master_endpoint
}