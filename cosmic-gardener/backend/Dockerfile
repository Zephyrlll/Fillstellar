# ===============================================
# Multi-stage Dockerfile for Cosmic Gardener Backend
# ===============================================

# ===============================================
# Stage 1: Chef Preparation
# Cached layer for dependencies
# ===============================================
FROM lukemathwalker/cargo-chef:latest-rust-1.75 AS chef
WORKDIR /app

# ===============================================
# Stage 2: Dependency Planning
# ===============================================
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ===============================================
# Stage 3: Dependency Building
# ===============================================
FROM chef AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency recipe and build dependencies
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Copy source code
COPY . .

# Set build-time environment variables
ENV CARGO_TERM_COLOR=always
ENV RUSTFLAGS="-C target-cpu=native"

# Build the application
RUN cargo build --release --bin cosmic-gardener-server

# Verify the binary exists and is executable
RUN ls -la target/release/ && \
    file target/release/cosmic-gardener-server && \
    target/release/cosmic-gardener-server --version || true

# ===============================================
# Stage 4: Runtime Image
# ===============================================
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r cosmic && useradd -r -g cosmic cosmic

# Create necessary directories
RUN mkdir -p /app/logs /app/config /app/data && \
    chown -R cosmic:cosmic /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/cosmic-gardener-server /usr/local/bin/cosmic-gardener-server
RUN chmod +x /usr/local/bin/cosmic-gardener-server

# Copy configuration files
COPY --from=builder /app/config/ /app/config/
COPY --from=builder /app/migrations/ /app/migrations/

# Set proper permissions
RUN chown -R cosmic:cosmic /app

# Switch to non-root user
USER cosmic

# Set working directory
WORKDIR /app

# Set runtime environment variables
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/cosmic-gardener-server"]

# Labels for metadata
LABEL maintainer="Cosmic Gardener Team <team@cosmic-gardener.com>" \
      version="1.0.0" \
      description="High-performance backend for Cosmic Gardener idle game" \
      org.opencontainers.image.title="Cosmic Gardener Backend" \
      org.opencontainers.image.description="High-performance backend for Cosmic Gardener idle game" \
      org.opencontainers.image.vendor="Cosmic Gardener Team" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/cosmic-gardener/backend"

# ===============================================
# Development Dockerfile
# ===============================================
FROM rust:1.75-bookworm AS development

# Install development dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    postgresql-client \
    redis-tools \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install cargo tools for development
RUN cargo install \
    cargo-watch \
    cargo-audit \
    cargo-tarpaulin \
    cargo-deny \
    sqlx-cli

# Create development user
RUN groupadd -r devuser && useradd -r -g devuser devuser && \
    mkdir -p /workspace && \
    chown -R devuser:devuser /workspace

USER devuser
WORKDIR /workspace

# Set development environment
ENV RUST_LOG=debug
ENV RUST_BACKTRACE=full

# Development command
CMD ["cargo", "watch", "-x", "run"]

# ===============================================
# Production optimized Dockerfile
# ===============================================
FROM gcr.io/distroless/cc-debian12:latest AS production

# Copy CA certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /app/target/release/cosmic-gardener-server /cosmic-gardener-server

# Copy configuration
COPY --from=builder /app/config/ /config/
COPY --from=builder /app/migrations/ /migrations/

# Set environment
ENV RUST_LOG=warn
ENV RUST_BACKTRACE=0

# Expose port
EXPOSE 8080

# Health check (using downloaded healthcheck binary)
COPY --from=builder /usr/bin/curl /usr/bin/curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/bin/curl", "-f", "http://localhost:8080/health"]

# Entrypoint
ENTRYPOINT ["/cosmic-gardener-server"]