# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Game
- **Local Server**: Use `起動.bat` or `python -m http.server` (ES6 modules require HTTP server)
- **Direct Access**: Open `index.html` in browser after starting local server

### Git Operations
- **Commit and Push**: Use `コミット.bat` for automated git workflow
  - Automatically stages all changes
  - Uses fixed commit message "基盤"
  - Pushes to origin/master

### TypeScript Compilation
- **Build**: `npx tsc` to compile TypeScript files to JavaScript
- **Watch Mode**: `npx tsc --watch` for continuous compilation during development

## Architecture Overview

### Core Structure
This is a 3D space simulation idle game built with Three.js where players create and manage cosmic objects from dust to stars.

**Main Application File**: `main.ts` (~240 lines)
- Modular TypeScript architecture with ES6 imports
- Uses Three.js for 3D graphics with post-processing effects
- Real-time 3D physics simulation with orbital mechanics
- Entry point: `init()` function at end of file

### Key Systems

**Game State Management** (`state.ts`):
- Central state container for all game data
- Includes resources, celestial bodies, research progress, physics settings
- Auto-save to localStorage with versioning system (`saveVersion: '1.6-accumulator'`)
- Resource accumulators for smooth value updates
- Statistics tracking system with history

**Physics Engine** (`physics.ts`):
- Custom gravitational simulation with N-body physics
- `updatePhysics()` function handles force calculations
- Spatial grid optimization for collision detection
- Object pooling for THREE.Vector3 to reduce GC pressure
- Configurable physics constants (G, drag, simulation speed)

**Celestial Body System** (`celestialBody.ts`):
- Hierarchical structure: Black Hole → Stars → Planets/Moons/Asteroids
- `createCelestialBody()` function handles all body creation
- Dynamic creation with orbital mechanics
- Life evolution system: microbial → plant → animal → intelligent
- Mass-based gravitational interactions
- Each body has `userData` with type, mass, velocity, etc.

**UI Architecture** (`ui.ts`):
- Tab-based interface (Game, Research, Options, Star Management)
- Collapsible sections with smooth animations
- Real-time updates with performance throttling (0.1s intervals)
- Timeline log system for event tracking
- Statistics panel with graphs (Canvas-based)

**Sound System** (`sound.ts`):
- Web Audio API-based spatial audio system
- Interstellar-inspired ambient soundscape with orchestral harmonies
- 3D positional audio tied to camera and celestial bodies
- Categorized audio: ambient, effects, UI sounds
- Real-time procedural sound generation (no audio files)

**Resource System**:
- 6 main resources: Cosmic Dust, Energy, Organic Matter, Biomass, Dark Matter, Thought Points
- Progressive unlock system through research
- Rate-based generation tied to celestial body properties
- Resource icons in `icon/` directory

### Event System (`events.ts`)
- `setupEventListeners()` function manages all event listeners
- Mouse/keyboard controls for camera (WASD) and celestial body interaction
- Long-press support for continuous actions (creation, upgrades)
- Tab switching and panel toggling
- Sound effect integration for UI feedback

### Performance Considerations
- UI updates throttled to 0.1s intervals with dirty checking
- Galaxy map updates at 0.2s intervals
- Object pooling for frequently created/destroyed objects
- Fixed timestep physics with accumulator pattern
- `previousUIValues` cache to minimize DOM updates

### Visual Features
- Three.js with post-processing (UnrealBloomPass)
- Particle systems for space dust and starfield
- Dynamic planet textures with life indicators
- Glow effects for stars and special bodies
- Responsive design with mobile support

### Development Guidelines
From `プロンプト.md`:
- Prioritize accuracy over response speed (リグレッションに細心の注意を払うこと)
- Pay careful attention to preventing regressions
- Respond in Japanese even if input is English
- Challenge objectively strange requests

### Save System (`saveload.ts`)
- `saveGame()` and `loadGame()` functions handle persistence
- LocalStorage with key 'cosmicGardenerState'
- Handles backward compatibility with save version tracking
- Serializes Three.js objects to plain data structures
- Statistics data persistence with proper reinitialization

### Code Organization Notes

**Mathematical Cache** (`utils.ts`):
- `mathCache` object for expensive calculations
- Methods: `getDustUpgradeCost()`, `getDarkMatterConverterCost()`
- Reduces computation overhead in game loop

**Animation Loop** (`main.ts`):
- `animate()` function is the main game loop
- Handles physics updates, resource generation, UI updates
- Time multiplier support (1x, 2x, 5x, 10x - unlockable)
- Sound listener position updates tied to camera movement

**Key Functions to Know**:
- `createCelestialBody()` - Creates any type of space object
- `updateUI()` - Updates all UI elements (with dirty checking)
- `showMessage()` - Displays temporary messages to player
- `addTimelineLog()` - Adds entry to timeline log
- `updateStatistics()` - Updates statistics data
- `evolveLife()` - Handles life evolution on planets
- `soundManager.init()` - Initializes spatial audio system

The codebase uses modern TypeScript with strict typing, ES6 modules, and emphasizes maintainability through clear separation of concerns across focused modules.