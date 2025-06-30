# Technology Selection Modal

This feature adds a comprehensive technology selection modal to the Civilization game, allowing players to browse and research available technologies.

## Features

- **Modal Interface**: Clean, Civilization 1-style modal dialog for technology selection
- **Era Organization**: Technologies are grouped by era (Ancient, Classical, Medieval, Renaissance, Industrial, Modern, Information)
- **Detailed Information**: Shows technology cost, prerequisites, description, and unlocks
- **Science Tracking**: Displays available science points and affordability indicators
- **Visual Feedback**: Highlights affordable technologies and shows insufficient science warnings

## How to Use

### Opening the Technology Modal

There are two ways to open the technology selection modal:

1. **Menu Bar**: Click "Advisors" → "Science Advisor"
2. **Keyboard Shortcut**: Press the `T` key during your turn

### Using the Modal

1. **Browse Technologies**: Technologies are organized by era. Scroll through the list to see what's available.
2. **Select Technology**: Click on any technology to see detailed information in the right panel.
3. **View Details**: The details panel shows:
   - Technology name and era
   - Research cost in science points
   - Prerequisites required
   - Description of the technology
   - What the technology unlocks (units, buildings, governments, etc.)
4. **Research**: Click the "Research" button to spend science points and acquire the technology.

### Technology Information

Each technology displays:
- **Name**: The technology's name
- **Era**: Which historical era it belongs to
- **Cost**: Science points required to research
- **Prerequisites**: Other technologies needed first
- **Unlocks**: New units, buildings, governments, or wonders it provides access to

## Implementation Details

### Files Created/Modified

1. **`/public/templates/technology-selection-modal.html`** - Modal HTML template
2. **`/src/renderer/TechnologySelectionModal.ts`** - Main modal logic
3. **`/src/utils/TechnologyUI.ts`** - Utility functions for technology UI
4. **`/src/style.css`** - Modal styling (added at the end)
5. **`/src/utils/UITemplateManager.ts`** - Added template loading
6. **`/src/main.ts`** - Added menu integration
7. **`/src/utils/InputHandler.ts`** - Added keyboard shortcut

### Integration Points

The modal integrates with:
- **Game class**: Uses `getAvailableTechnologies()` and `researchTechnology()` methods
- **Player data**: Reads science points and known technologies
- **Technology definitions**: Uses existing technology data structure
- **UI system**: Follows existing modal patterns

### CSS Classes

Key CSS classes for styling:
- `.technology-dialog` - Main modal container
- `.technology-item` - Individual technology list item
- `.technology-era-header` - Era section headers
- `.tech-cost.affordable/.unaffordable` - Cost styling
- `.insufficient-science` - Styling for unaffordable technologies

## Usage Examples

### Programmatic Usage

```typescript
import { TechnologyUI } from './utils/TechnologyUI.js';

// Open technology selection for current player
TechnologyUI.handleTechnologyShortcut(gameInstance);

// Open with custom callback
TechnologyUI.openTechnologySelection(gameInstance, player, (technology) => {
  console.log(`Player researched: ${technology}`);
  // Custom logic here
});

// Check if modal is open
if (TechnologyUI.isTechnologyModalOpen()) {
  // Handle modal state
}
```

### Adding Custom Technology Effects

To add special effects when technologies are researched, modify the callback in `TechnologyUI.openTechnologySelection()`:

```typescript
TechnologyUI.openTechnologySelection(game, player, (technology) => {
  // Research the technology
  const success = game.researchTechnology(player.id, technology);
  
  if (success) {
    // Add custom effects
    showTechnologyAnimation(technology);
    playTechnologySound();
    updateTechnologyProgress();
    
    // Trigger other systems that depend on this technology
    checkForNewUnits(technology);
    checkForNewBuildings(technology);
  }
});
```

## Future Enhancements

Potential improvements to consider:
- **Technology Tree Visualization**: Graphical tree showing technology relationships
- **Research Queue**: Allow players to queue multiple technologies
- **Technology Trading**: Diplomacy system for technology exchange
- **Research Bonuses**: Libraries, universities, and other science modifiers
- **Great Scientists**: Special units that provide research bonuses
- **Technology Prerequisites Highlighting**: Visual indication of prerequisite chains

## Technology Research System

The game uses a direct-purchase research system where:
- Players accumulate science points each turn
- Technologies have fixed costs
- Players can immediately research any technology they can afford (with prerequisites met)
- No gradual research progress - it's an instant purchase

This matches the simplified Civilization 1 research model where science is treated like a currency for buying technologies.
