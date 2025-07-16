# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cosmic Gardener (Fillstellar) - A 3D space simulation idle game where players create and manage cosmic objects from dust to stars.

### Project Structure
- **Root**: Main project configuration and documentation
- **cosmic-gardener/**: Main game directory
  - **frontend/**: TypeScript/Three.js game client
  - **backend/**: Rust backend server (Axum-based)
  - **database/**: PostgreSQL schema and migrations
  - **docs/**: Project documentation
  - **infra/**: Infrastructure and deployment scripts

### Key Technologies
- **Frontend**: TypeScript, Three.js, ES6 modules
- **Backend**: Rust (Axum framework), PostgreSQL, WebSocket
- **Build Tools**: TypeScript compiler, Cargo

## Development Commands

### Frontend Development
```bash
# Navigate to frontend
cd cosmic-gardener/frontend

# Install dependencies
npm install

# Build TypeScript
npm run build
# or
npx tsc

# Start local server
npm run serve
# or
起動.bat
# or
python -m http.server 8000
```

### Backend Development
```bash
# Navigate to backend
cd cosmic-gardener/backend

# Run development server
cargo run

# Run tests
cargo test

# Build for production
cargo build --release
```

### Git Operations
- **Commit Helper**: Use `コミット.bat` in various directories
- **Manual Commit**: Standard git commands

## Architecture Guidelines

### Frontend Architecture
- **Main Entry**: `cosmic-gardener/frontend/main.ts`
- **Modular Design**: Each system in separate TypeScript file
- **State Management**: Centralized in `state.ts`
- **Physics**: Custom N-body simulation in `physics.ts`
- **UI**: Tab-based interface in `ui.ts`
- **Sound**: Procedural audio in `sound.ts`

### Backend Architecture
- **Clean Architecture**: Domain/Application/Infrastructure layers
- **RESTful API**: Health, auth, game endpoints
- **WebSocket**: Real-time game state synchronization
- **Error Handling**: Comprehensive error types and middleware

### Code Style
- **TypeScript**: Strict typing, ES6+ features
- **Rust**: Follow Rust conventions, use Result<T, E>
- **Comments**: Minimal, code should be self-documenting

## Important Notes

### Performance Considerations
- UI updates throttled to 0.1s intervals
- Object pooling for Vector3 objects
- Fixed timestep physics with accumulator
- WebSocket backpressure handling

### Testing
- Frontend: Manual testing via browser
- Backend: `cargo test` for unit/integration tests
- Use `test_runner.bat` for automated backend tests

### Deployment
- Frontend: Static file hosting
- Backend: Docker containerization
- Database: PostgreSQL with migrations

## File Management

### Critical Files (Do NOT delete)
- All `.ts` and `.js` files in frontend
- All `.rs` files in backend
- `package.json`, `Cargo.toml` files
- Migration files in `database/`
- All `.bat` helper scripts

### Files to Exclude from Git
- `node_modules/`
- `target/` (Rust build)
- `.env` files (use `.env.example`)
- OS-specific files (`.DS_Store`, `Thumbs.db`)
- IDE directories (`.vscode/`, `.idea/`)

## Common Tasks

### Adding New Resources
1. Update `cosmic-gardener/frontend/js/constants.ts`
2. Add icon to `cosmic-gardener/frontend/icon/`
3. Update resource generation logic
4. Update UI display

### Creating New Celestial Bodies
1. Define in `celestialBody.ts`
2. Add creation logic
3. Update physics calculations
4. Add UI controls

### Implementing New Features
1. Create dedicated TypeScript module
2. Import in `main.ts`
3. Add UI elements if needed
4. Update save/load if adding persistent data

## Troubleshooting

### TypeScript Build Errors
- Check `tsconfig.json` configuration
- Ensure all imports use `.js` extension (for ES modules)
- Verify type definitions are installed

### WebSocket Connection Issues
- Check backend is running on correct port
- Verify CORS settings
- Check firewall/proxy settings

### Performance Issues
- Use browser DevTools Performance tab
- Check for excessive DOM updates
- Monitor Three.js draw calls
- Review physics calculation frequency