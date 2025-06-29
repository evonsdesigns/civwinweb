# CivWin - Civilization-like Game

A browser-based strategy game inspired by Civilization 1, built with Vite, TypeScript, and HTML5 Canvas.

## Features

- **Top-down tile-based world view** - Navigate through a procedurally generated world
- **Turn-based gameplay** - Classic Civilization-style turn management
- **Multiple terrain types** - Grassland, desert, forest, hills, mountains, ocean, and rivers
- **Resource management** - Find and utilize wheat, gold, iron, horses, and fish
- **Unit system** - Control settlers, warriors, scouts, archers, and more
- **City building** - Found cities and manage their growth and production
- **Modern UI** - Clean, responsive interface built for the web

## Game Controls

### Mouse Controls
- **Left Click**: Select units or tiles
- **Right Click**: Move selected unit to target location
- **Mouse Wheel**: Zoom in/out
- **Drag**: Pan around the map

### Keyboard Controls
- **Arrow Keys**: Pan around the map
- **Spacebar**: End turn
- **B**: Build city (with settler selected)
- **P**: Pause/unpause game
- **Escape**: Clear selections
- **+/-**: Zoom in/out

## Getting Started

### Prerequisites
- Node.js (v20.19.0 or higher)
- npm

### Installation

1. Clone the repository or download the source code
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the displayed local URL (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── game/           # Core game logic
│   ├── Game.ts            # Main game class
│   ├── MapGenerator.ts    # World map generation
│   └── TurnManager.ts     # Turn processing logic
├── renderer/       # Rendering and graphics
│   ├── Renderer.ts        # Core rendering system
│   └── GameRenderer.ts    # Game-specific rendering
├── types/          # TypeScript type definitions
│   └── game.ts            # Game-related types
├── utils/          # Utility functions
│   └── InputHandler.ts    # User input handling
├── assets/         # Game assets (sprites, sounds)
└── main.ts         # Application entry point
```

## Game Mechanics

### Units
- **Settler**: Found new cities (2 movement points)
- **Warrior**: Basic military unit (2 movement points)
- **Scout**: Fast exploration unit (3 movement points)
- **Archer**: Ranged combat unit (2 movement points)
- **Spearman**: Defensive military unit (2 movement points)
- **Catapult**: Siege weapon (1 movement point)

### Terrain Types
- **Grassland**: Basic fertile land, good for cities
- **Desert**: Harsh terrain, may contain gold
- **Forest**: Provides resources but blocks movement
- **Hills**: Elevated terrain, good for mining
- **Mountains**: Impassable terrain, rich in gold
- **Ocean**: Water terrain, may contain fish
- **River**: Fresh water, provides fish resources

### Resources
- **Wheat**: Food production bonus
- **Gold**: Economic resource
- **Iron**: Military production bonus
- **Horses**: Cavalry unit requirement
- **Fish**: Food from water sources

## Development

This project uses:
- **Vite** for fast development and building
- **TypeScript** for type safety
- **HTML5 Canvas** for rendering
- **ES6+ modules** for clean architecture

### Adding New Features

1. Game logic goes in `src/game/`
2. Rendering code goes in `src/renderer/`
3. Type definitions go in `src/types/`
4. Utility functions go in `src/utils/`

### Code Style Guidelines

- Use TypeScript interfaces for type definitions
- Prefer functional programming patterns
- Keep functions small and focused
- Use modern ES6+ features
- Separate game logic from rendering code

## Future Enhancements

- Multiplayer support
- Technology tree
- Diplomacy system
- Combat system
- Wonder construction
- Advanced AI
- Sound effects and music
- Mobile touch controls
- Save/load functionality

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Enhanced City Dialog

The city dialog now features a detailed Civilization 1-style interface with:

### Visual Design
- **Pastel civilization color backgrounds** - Each civilization's cities have subtle color-themed backgrounds
- **Resource icons** - Visual representation with wheat (🌾), shields (🛡️), and trade arrows (➡️)
- **Surplus/deficit indicators** - Color-coded displays showing positive (green), negative (red), or neutral (gray) resource flow

### City Information Display
- **Population breakdown** - Visual representation of population allocation with worker icons
- **Detailed resource calculations** - Enhanced food, production, and trade calculations
- **Trade breakdown** - Split into:
  - Luxuries (💎) - Improves happiness
  - Tax (🪙) - Generates gold income  
  - Science (💡) - Contributes to research

### Interactive Features
- **City renaming** - Click "Rename" to change city names
- **Production management** - Change what the city is building
- **Visual city radius** - See the tiles your city works
- **Unit management** - View units stationed in the city

The dialog automatically adapts to show each civilization's unique visual theme while maintaining the classic Civilization 1 aesthetic.
