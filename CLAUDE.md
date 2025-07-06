# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Game
- **Local Server**: Use `起動.bat` or `python -m http.server` (ES6 modules require HTTP server)
- **Direct Access**: Open `index.html` in browser after starting local server

### Git Operations
- **Commit and Push**: Use `コミット.bat` for automated git workflow
- **Manual**: Standard git commands work normally

## Architecture Overview

### Core Structure
This is a 3D space simulation idle game built with Three.js where players create and manage cosmic objects from dust to stars.

**Main Application File**: `main.js` (~2,900 lines)
- Monolithic architecture with all game logic in single file
- Uses ES6 modules for Three.js imports
- Real-time 3D physics simulation with orbital mechanics

### Key Systems

**Game State Management** (`gameState` object):
- Central state container for all game data
- Includes resources, celestial bodies, research progress, physics settings
- Auto-save to localStorage with versioning system
- Resource accumulators for smooth value updates

**Physics Engine**:
- Custom gravitational simulation with N-body physics
- Uses leapfrog integration for orbital calculations
- Object pooling for THREE.Vector3 to reduce GC pressure
- Performance optimizations with dirty checking and batched updates

**Celestial Body System**:
- Hierarchical structure: Black Hole → Stars → Planets/Moons/Asteroids
- Dynamic creation with orbital mechanics
- Evolution system for life on planets
- Mass-based gravitational interactions

**UI Architecture**:
- Tab-based interface (Game, Research, Options, Star Management)
- Collapsible sections with smooth animations
- Real-time updates with performance throttling
- Timeline log system for event tracking

**Resource System**:
- 6 main resources: Cosmic Dust, Energy, Organic Matter, Biomass, Dark Matter, Thought Points
- Progressive unlock system through research
- Rate-based generation tied to celestial body properties

### Performance Considerations
- UI updates throttled to 0.1s intervals with dirty checking
- Galaxy map updates at 0.2s intervals
- Object pooling for frequently created/destroyed objects
- Fixed timestep physics with accumulator pattern

### Visual Features
- Three.js with post-processing (UnrealBloomPass)
- Particle systems for space dust and effects
- Dynamic lighting and materials
- Responsive design with mobile support

### Development Guidelines
From `プロンプト.md`:
- Prioritize accuracy over response speed
- Pay careful attention to preventing regressions
- Respond in Japanese even if input is English
- Challenge objectively strange requests

### Save System
- LocalStorage persistence with version migration
- Handles backward compatibility with save version tracking
- Serializes Three.js objects to plain data structures

## Code Organization Notes

### Event System
- Event listeners managed through `setupEventListeners()` function
- Mouse/keyboard controls for camera and celestial body interaction
- Long-press support for continuous actions (creation, upgrades)

### Mathematical Cache
- `mathCache` object for expensive calculations
- Cached results for upgrade costs, generation rates
- Reduces computation overhead in game loop

### Timeline Log System
- Tracks game events with year timestamps
- Stores up to 100 entries with automatic cleanup
- Connected to major game events (creation, evolution, etc.)

The codebase prioritizes functionality over modularity, with most logic centralized in `main.js` for this prototype-stage game.