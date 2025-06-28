# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a frontend web application for creating an online game similar to Civilization 1. The project uses:

- **Vite** for fast development and building
- **TypeScript** for type safety and better development experience
- **HTML5 Canvas** for rendering the top-down game view
- **Modern ES6+ features** for clean, maintainable code

## Game Architecture Guidelines

### Rendering System
- Use HTML5 Canvas for the main game view
- Implement a tile-based rendering system for the top-down perspective
- Use sprite sheets for efficient rendering of game assets
- Implement viewport/camera system for scrolling around the game world

### Game Structure
- Separate game logic from rendering code
- Use entity-component-system (ECS) pattern where appropriate
- Implement turn-based game mechanics similar to Civilization
- Create modular systems for different game aspects (units, cities, terrain, etc.)

### Code Style
- Use TypeScript interfaces for type definitions
- Prefer functional programming patterns where possible
- Use modern ES6+ features (arrow functions, destructuring, async/await)
- Keep functions small and focused on single responsibilities

### File Organization
- `/src/game/` - Core game logic and systems
- `/src/renderer/` - Rendering and graphics related code
- `/src/types/` - TypeScript type definitions
- `/src/utils/` - Utility functions and helpers
- `/src/assets/` - Game assets (sprites, sounds, etc.)

## Development Notes
- Focus on creating a solid foundation for multiplayer functionality
- Prioritize performance for smooth gameplay experience
- Design with extensibility in mind for future features
- Consider mobile-friendly design patterns
