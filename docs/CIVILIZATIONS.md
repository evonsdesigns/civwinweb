# Civilization System

This document describes the civilization system implemented in CivWin.

## Overview

The civilization system provides each player with a unique civilization that has its own characteristics:

- **Name**: The civilization's full name (e.g., "Roman Empire", "Americans")
- **Adjective**: How to refer to things belonging to this civilization (e.g., "Roman", "American")
- **Color**: Hex color code used for visual representation of units and cities
- **Leader**: Historical leader associated with the civilization
- **Cities**: List of default city names in order of preference
- **Description**: Brief description of the civilization

## Available Civilizations

The following civilizations are available, based on the original Civilization 1:

1. **Roman Empire** (Red) - Caesar
2. **Americans** (Dark Blue) - Abraham Lincoln
3. **Aztec Empire** (Forest Green) - Montezuma
4. **Babylonians** (Gold) - Hammurabi
5. **Chinese** (Crimson) - Mao Tse Tung
6. **Egyptians** (Dark Orange) - Cleopatra
7. **English** (Purple) - Elizabeth I
8. **French** (Royal Blue) - Napoleon
9. **Germans** (Dark Slate Gray) - Frederick
10. **Greeks** (Medium Blue) - Alexander
11. **Indians** (Tomato) - Gandhi
12. **Japanese** (Dark Magenta) - Tokugawa
13. **Mongols** (Saddle Brown) - Genghis Khan
14. **Russians** (Dark Olive Green) - Stalin
15. **Zulus** (Maroon) - Shaka

## City Names

Each civilization has a predefined list of city names that will be used when founding new cities. The first city uses the first name in the list (typically the capital), the second city uses the second name, and so on. When all names are exhausted, the game will append numbers to the capital name.

For example, Roman cities will be named in this order:
1. Rome
2. Caesarea
3. Carthage
4. Nicopolis
5. Byzantium
... and so on

## Usage in Game

### Player Creation
When players are created, they are automatically assigned civilizations in order. The first player gets the first civilization, the second player gets the second, etc.

### City Founding
When a settler founds a city, the game automatically assigns the next available city name from that player's civilization list.

### Visual Representation
- Units and cities are colored according to their civilization's color
- Player UI elements use the civilization colors
- City sprites are dynamically recolored to match the player's civilization

## API

### Core Functions

```typescript
// Get a civilization by type
getCivilization(CivilizationType.ROMANS) // Returns Civilization object

// Get a civilization by name
getCivilizationByName("Romans") // Returns Civilization object or undefined

// Get a random civilization
getRandomCivilization() // Returns random Civilization object

// Get all civilizations
getAllCivilizations() // Returns array of all Civilization objects

// Get color mapping
getCivilizationColors() // Returns Record<CivilizationType, string>
```

### Game Methods

```typescript
// Generate appropriate city name for a player
game.generateCityName(playerId) // Returns string

// Get civilization info for a player
game.getPlayerCivilization(playerId) // Returns Civilization object or null

// Get civilization adjective for a player
game.getPlayerCivilizationAdjective(playerId) // Returns string like "Roman"

// Get leader name for a player
game.getPlayerLeader(playerId) // Returns string like "Caesar"
```

## File Structure

- `src/game/CivilizationDefinitions.ts` - Core civilization definitions and helper functions
- `src/types/game.ts` - Type definitions (includes CivilizationType import)
- `docs/cities.txt` - Source data for city names (reference only)

## Integration

The civilization system is integrated with:

- **Player Creation**: Players are automatically assigned civilizations
- **City Naming**: Cities get appropriate names based on civilization
- **Visual System**: Colors are used throughout the rendering system
- **Game Logic**: Provides context for diplomatic interactions and cultural features

This system provides a foundation for more advanced civilization-specific features like unique units, buildings, or special abilities that could be added in the future.
