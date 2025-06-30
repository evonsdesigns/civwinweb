# Technology Selection Modal

This feature adds a comprehensive technology selection modal to the Civilization game, allowing players to browse and research available technologies.

## Features

- **Modal Interface**: Clean, Civilization 1-style modal dialog for technology selection
- **Automatic Research Prompts**: After the first turn, players are automatically prompted to select research when they have no current technology being researched
- **Science Advisor**: Special modal styled like the classic Civilization Science Advisor for automatic prompts
- **Status Window Integration**: The technology lightbulb in the status window shows current research progress and is clickable
- **Smart Research**: Click the lightbulb to research immediately if you have enough science, or open the selection modal if not
- **Era Organization**: Technologies are grouped by era (Ancient, Classical, Medieval, Renaissance, Industrial, Modern, Information)
- **Detailed Information**: Shows technology cost, prerequisites, description, and unlocks
- **Science Tracking**: Displays available science points and affordability indicators
- **Visual Feedback**: Highlights affordable technologies and shows insufficient science warnings

## How to Use

### Opening the Technology Modal

There are four ways to access technology selection:

1. **Menu Bar**: Click "Advisors" → "Science Advisor" (opens full technology selection modal)
2. **Keyboard Shortcut**: Press the `T` key during your turn (opens full technology selection modal)
3. **Status Window Lightbulb**: Click the lightbulb (💡) in the status window
   - If you have enough science to research your current technology, it will research immediately
   - Otherwise, it opens the technology selection modal
4. **Automatic Prompt**: After the first turn, when you have no current research, the Science Advisor will automatically appear

### Status Window Integration

The status window shows your current research progress:

- **Technology Name**: The name of the currently researched technology (or "Select Research" if none)
- **Progress Display**: Shows science points needed or "Ready!" if you can research now
- **Lightbulb Indicator**: The lightbulb (💡) changes brightness based on research progress:
  - Bright and pulsing: Ready to research (enough science points)
  - Bright: 80%+ progress toward research cost
  - Medium: 60-80% progress
  - Dim: Less than 60% progress
- **Click to Research**: Click the lightbulb to:
  - Research immediately if you have enough science points
  - Open the technology selection modal if you need to choose or don't have enough science

### Automatic Research Selection

Starting from turn 2, if you don't have a current technology being researched and you have science points available, the Science Advisor will automatically appear with the message: "Which discovery should our wise men be pursuing, sire? Pick one..."

This ensures players always have research progress and matches the Civilization experience where advisors guide you through important decisions.

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

1. **`/public/templates/technology-selection-modal.html`** - Modal HTML template for manual selection
2. **`/public/templates/science-advisor-modal.html`** - Modal HTML template for automatic prompts
3. **`/src/renderer/TechnologySelectionModal.ts`** - Main modal logic for manual selection
4. **`/src/renderer/ScienceAdvisorModal.ts`** - Science Advisor modal logic for automatic prompts
5. **`/src/utils/TechnologyUI.ts`** - Utility functions for technology UI
6. **`/src/style.css`** - Modal styling (added at the end)
7. **`/src/utils/UITemplateManager.ts`** - Added template loading
8. **`/src/main.ts`** - Added menu integration and automatic research prompts
9. **`/src/utils/InputHandler.ts`** - Added keyboard shortcut and Escape key support
10. **`/src/game/Game.ts`** - Added research selection logic and current research tracking
11. **`/src/types/game.ts`** - Added currentResearch field to Player interface

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
