import { GameState, Unit, City, Player } from '../types/game';
import { getUnitStats, getUnitName } from '../game/UnitDefinitions';

export class Status {
  private window: HTMLElement;
  private isVisible = true;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private gameState: GameState | null = null;
  private selectedUnit: Unit | null = null;
  private selectedCity: City | null = null;

  constructor() {
    // Get the status window
    this.window = document.getElementById('status-window')!;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Window dragging
    const header = this.window.querySelector('.status-header') as HTMLElement;
    
    header.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.window.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      document.addEventListener('mousemove', this.onWindowDrag);
      document.addEventListener('mouseup', this.onWindowDragEnd);
      e.preventDefault();
    });

    // Close button
    const closeBtn = document.getElementById('status-close')!;
    closeBtn.addEventListener('click', () => {
      this.hide();
    });
  }

  private onWindowDrag = (e: MouseEvent) => {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    // Keep window within viewport bounds
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;
    
    this.window.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    this.window.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  };

  private onWindowDragEnd = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onWindowDrag);
    document.removeEventListener('mouseup', this.onWindowDragEnd);
  };

  public updateGameState(gameState: GameState): void {
    this.gameState = gameState;
    this.updateDisplay();
  }

  public setSelectedUnit(unit: Unit | null): void {
    this.selectedUnit = unit;
    this.selectedCity = null; // Clear city selection when unit is selected
    this.updateDisplay();
  }

  public setSelectedCity(city: City | null): void {
    this.selectedCity = city;
    this.selectedUnit = null; // Clear unit selection when city is selected
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.gameState || !this.isVisible) return;

    this.updatePopulationInfo();
    this.updateTechProgress();
    this.updateUnitDetails();
  }

  private updatePopulationInfo(): void {
    if (!this.gameState) return;

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    // Calculate total population from all cities
    const totalPopulation = this.gameState.cities
      .filter(city => city.playerId === currentPlayer.id)
      .reduce((total, city) => total + city.population, 0);

    // Update population display
    const populationElement = document.getElementById('status-population');
    if (populationElement) {
      populationElement.textContent = `${totalPopulation.toLocaleString()}♀`;
    }

    // Update year display
    const yearElement = document.getElementById('status-year');
    if (yearElement) {
      const year = 4000 - (this.gameState.turn - 1) * 20; // Each turn is 20 years
      const yearText = year > 0 ? `${year} BC` : `${Math.abs(year)} AD`;
      yearElement.textContent = yearText;
    }

    // Update gold display (placeholder for now)
    const goldElement = document.getElementById('status-gold');
    if (goldElement) {
      goldElement.textContent = `500💰`; // TODO: Implement actual gold system
    }
  }

  private updateTechProgress(): void {
    // TODO: Implement technology system
    // For now, show placeholder values
    const lightbulb = document.getElementById('tech-lightbulb');
    const techName = document.getElementById('tech-name');
    const techTurns = document.getElementById('tech-turns');

    if (lightbulb && techName && techTurns) {
      // Simulate tech progress based on turn number
      const progress = (this.gameState?.turn || 1) % 10;
      const turnsRemaining = 10 - progress;
      
      // Remove all existing turn classes
      lightbulb.className = lightbulb.className.replace(/\bturns-\d+(-plus)?\b/g, '');
      lightbulb.classList.remove('bright');
      
      // Add appropriate class based on turns remaining
      if (turnsRemaining === 1) {
        lightbulb.classList.add('turns-1');
      } else if (turnsRemaining === 2) {
        lightbulb.classList.add('turns-2');
      } else if (turnsRemaining === 3) {
        lightbulb.classList.add('turns-3');
      } else if (turnsRemaining === 4) {
        lightbulb.classList.add('turns-4');
      } else {
        lightbulb.classList.add('turns-5-plus');
      }
      
      techName.textContent = 'Pottery';
      techTurns.textContent = `${turnsRemaining} turns`;
    }
  }

  private updateUnitDetails(): void {
    const civilizationElement = document.getElementById('unit-civilization');
    const unitNameElement = document.getElementById('unit-name');
    const unitMovesElement = document.getElementById('unit-moves');
    const unitHomeElement = document.getElementById('unit-home');
    const unitTerrainElement = document.getElementById('unit-terrain');
    const unitSpecialElement = document.getElementById('unit-special');
    const unitFortificationElement = document.getElementById('unit-fortification');

    if (this.selectedCity) {
      // Viewing a city - clear unit details
      this.clearUnitDetails();
      return;
    }

    if (this.selectedUnit && this.gameState) {
      const currentPlayer = this.getCurrentPlayer();
      
      if (civilizationElement && currentPlayer) {
        civilizationElement.textContent = currentPlayer.name || 'Unknown';
      }

      if (unitNameElement) {
        unitNameElement.textContent = getUnitName(this.selectedUnit.type);
      }

      if (unitMovesElement) {
        unitMovesElement.textContent = this.selectedUnit.movementPoints.toString();
      }

      if (unitHomeElement) {
        // Find the home city by looking for cities in the same player that might support this unit
        // For now, we'll show the closest city or "None"
        const playerCities = this.gameState.cities.filter(city => city.playerId === this.selectedUnit?.playerId);
        if (playerCities.length > 0) {
          // Show the first city for now - TODO: implement proper home city tracking
          unitHomeElement.textContent = playerCities[0].name;
        } else {
          unitHomeElement.textContent = 'None';
        }
      }

      if (unitTerrainElement) {
        const tile = this.gameState.worldMap[this.selectedUnit.position.y]?.[this.selectedUnit.position.x];
        if (tile) {
          unitTerrainElement.textContent = `(${this.formatTerrainName(tile.terrain)})`;
        }
      }

      if (unitSpecialElement) {
        // TODO: Implement road system
        unitSpecialElement.textContent = '(Road)';
      }

      if (unitFortificationElement) {
        if (this.selectedUnit.fortified) {
          unitFortificationElement.textContent = '(Fortified)';
        } else {
          unitFortificationElement.textContent = '(Irrigation)'; // Placeholder
        }
      }
    } else {
      // No unit selected - clear details
      this.clearUnitDetails();
    }
  }

  private clearUnitDetails(): void {
    const elements = [
      'unit-civilization',
      'unit-name', 
      'unit-moves',
      'unit-home',
      'unit-terrain',
      'unit-special',
      'unit-fortification'
    ];

    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '';
      }
    });
  }

  private formatTerrainName(terrain: string): string {
    return terrain.charAt(0).toUpperCase() + terrain.slice(1);
  }

  private getCurrentPlayer(): Player | null {
    if (!this.gameState) return null;
    return this.gameState.players.find(p => p.id === this.gameState!.currentPlayer) || null;
  }

  public show(): void {
    this.isVisible = true;
    this.window.classList.remove('hidden');
    this.updateDisplay();
  }

  public hide(): void {
    this.isVisible = false;
    this.window.classList.add('hidden');
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isShowing(): boolean {
    return this.isVisible;
  }
}
