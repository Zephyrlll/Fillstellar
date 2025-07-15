# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cosmic Gardener is a sophisticated 3D space idle/incremental game with real-time multiplayer capabilities. The project consists of:
- **Original version**: Simple frontend-only game in the root directory
- **Modern version**: Full-stack implementation in `cosmic-gardener/` with Rust backend

## Commands

### Development
```bash
# Frontend-only (root directory)
npx tsc                    # Compile TypeScript
python -m http.server      # Serve locally

# Full-stack (cosmic-gardener/)
make dev                   # Start full Docker environment
make dev-local             # Start without Docker
make stop                  # Stop all services
```

### Build & Test
```bash
# Backend
cd cosmic-gardener/backend
make build                 # Development build
make build-release         # Production build
make test                  # Unit tests
make test-all              # All tests including integration
make lint                  # Run clippy
make fmt                   # Format code

# Frontend  
cd cosmic-gardener/frontend
npm run build              # Build for production
npm test                   # Run tests (not yet implemented)
```

### Database
```bash
cd cosmic-gardener/backend
make migrate               # Run migrations
make seed                  # Load test data
make db-reset              # Reset database
```

## Architecture

### Frontend (`cosmic-gardener/frontend/`)
- **Core**: TypeScript + Three.js for 3D graphics
- **Entry**: `main.ts` → `init()` function
- **State**: `gameState` object in `state.ts` with auto-save
- **Physics**: Custom N-body simulation in `physics.ts`
- **UI**: Tab-based interface with throttled updates (0.1s)
- **Sound**: Web Audio API spatial audio system
- **WebSocket**: Real-time multiplayer support

### Backend (`cosmic-gardener/backend/`)
- **Architecture**: Clean Architecture/DDD with Rust + Actix Web
- **Layers**:
  - `domain/`: Core entities (CelestialBody, Player, etc.)
  - `application/`: Use cases and services
  - `infrastructure/`: Database, WebSocket, external APIs
  - `presentation/`: HTTP/WS handlers
- **Auth**: JWT-based with Argon2 password hashing
- **Database**: PostgreSQL 15+ with PostGIS for spatial data
- **Caching**: Redis for sessions and hot data
- **WebSocket**: Optimized with delta sync, view culling, compression

### Key Design Patterns
- **Physics**: Spatial grid optimization, object pooling
- **WebSocket**: Priority queuing, backpressure management
- **Database**: Spatial indexing (R-Tree), player-based sharding
- **UI**: Dirty checking, fixed timestep with accumulator

## Development Guidelines

1. **TypeScript (Frontend)**:
   - Strict mode enabled
   - ES6 modules required
   - Prefer modular architecture

2. **Rust (Backend)**:
   - Follow Clean Architecture principles
   - Use `Result<T, E>` for error handling
   - Implement comprehensive tests

3. **Database**:
   - Use migrations for schema changes
   - Leverage PostGIS for spatial queries
   - Consider partitioning for scale

4. **Performance**:
   - Frontend: 60 FPS target, object pooling
   - Backend: <100ms API response (95%ile)
   - WebSocket: 10,000 concurrent connections

## Resource System
- **Cosmic Dust**: Base resource from space
- **Energy**: From stars and reactions
- **Organic Matter**: From life-supporting planets
- **Biomass**: From evolved life
- **Dark Matter**: Special resource
- **Thought Points**: From intelligent civilizations

## Key Functions

### Frontend
- `createCelestialBody()`: Creates any space object
- `updatePhysics()`: N-body gravity simulation
- `updateUI()`: Throttled UI updates
- `saveGame()`/`loadGame()`: Persistence to localStorage

### Backend
- JWT endpoints: `/api/auth/*`
- Game endpoints: `/api/game/*`
- WebSocket: `/api/ws` for real-time
- Rate limits: 30/min (auth), 120/min (game)

## Deployment
```bash
make deploy-staging        # Deploy to staging
make deploy-production     # Deploy to production (manual approval)
```

Services run on:
- Frontend: Port 3000
- Backend: Port 8080
- PostgreSQL: Port 5432
- Redis: Port 6379
- Monitoring: Grafana (3001), Prometheus (9090)

あなたは絶対git操作をしないでください。