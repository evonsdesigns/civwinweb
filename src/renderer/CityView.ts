import { City, GameState } from '../types/game';
import { Game } from '../game/Game';
import { getCivilization } from '../game/CivilizationDefinitions';

// Enhanced resource calculation interface
interface CityResources {
  food: number;
  foodSurplus: number;
  production: number;
  productionSurplus: number;
  trade: number;
  luxuries: number;
  tax: number;
  science: number;
}

export class CityView {
  private cityModal: HTMLElement;
  private cityDialog: HTMLElement;
  private cityNameTitle: HTMLElement;
  private cityPopulationTitle: HTMLElement;
  private cityPopulation: HTMLElement;
  private cityFood: HTMLElement;
  private cityProduction: HTMLElement;
  private cityTrade: HTMLElement;
  private cityScience: HTMLElement;
  private cityLuxuries: HTMLElement;
  private cityTax: HTMLElement;
  private foodSurplus: HTMLElement;
  private productionSurplus: HTMLElement;
  private populationDetails: HTMLElement;
  private currentProduction: HTMLElement;
  private productionTurns: HTMLElement;
  private buildingsList: HTMLElement;
  private unitsList: HTMLElement;
  private cityMapCanvas: HTMLCanvasElement;
  private cityMapContext: CanvasRenderingContext2D;
  private game: Game;
  private currentCity: City | null = null;

  constructor(game: Game) {
    this.game = game;
    
    // Get DOM elements
    this.cityModal = document.getElementById('city-modal')!;
    this.cityDialog = this.cityModal.querySelector('.city-dialog')!;
    this.cityNameTitle = document.getElementById('city-name-title')!;
    this.cityPopulationTitle = document.getElementById('city-population-title')!;
    this.cityPopulation = document.getElementById('city-population')!;
    this.cityFood = document.getElementById('city-food')!;
    this.cityProduction = document.getElementById('city-production')!;
    this.cityTrade = document.getElementById('city-trade')!;
    this.cityScience = document.getElementById('city-science')!;
    this.cityLuxuries = document.getElementById('city-luxuries')!;
    this.cityTax = document.getElementById('city-tax')!;
    this.foodSurplus = document.getElementById('food-surplus')!;
    this.productionSurplus = document.getElementById('production-surplus')!;
    this.populationDetails = document.getElementById('population-details')!;
    this.currentProduction = document.getElementById('current-production')!;
    this.productionTurns = document.getElementById('production-turns')!;
    this.buildingsList = document.getElementById('buildings-list')!;
    this.unitsList = document.getElementById('units-list')!;
    this.cityMapCanvas = document.getElementById('city-map-canvas') as HTMLCanvasElement;
    this.cityMapContext = this.cityMapCanvas.getContext('2d')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Close button
    const closeButton = document.getElementById('city-close')!;
    closeButton.addEventListener('click', () => this.close());

    // OK button
    const okButton = document.getElementById('city-ok')!;
    okButton.addEventListener('click', () => this.close());

    // Rename button
    const renameButton = document.getElementById('city-rename')!;
    renameButton.addEventListener('click', () => this.handleRename());

    // Buy button
    const buyButton = document.getElementById('city-buy')!;
    buyButton.addEventListener('click', () => this.handleBuy());

    // Change production button
    const changeProductionButton = document.getElementById('change-production')!;
    changeProductionButton.addEventListener('click', () => this.handleChangeProduction());

    // Close on overlay click
    this.cityModal.addEventListener('click', (event) => {
      if (event.target === this.cityModal) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  public open(city: City): void {
    this.currentCity = city;
    this.updateCityInformation();
    this.renderCityMap();
    this.cityModal.style.display = 'flex';
  }

  public close(): void {
    this.cityModal.style.display = 'none';
    this.currentCity = null;
  }

  public isOpen(): boolean {
    return this.cityModal.style.display === 'flex';
  }

  private updateCityInformation(): void {
    if (!this.currentCity || !this.game) return;

    const gameState = this.game.getGameState();
    
    // Apply civilization-specific background
    this.applyCivilizationBackground();

    // Update city name and population in title
    this.cityNameTitle.textContent = this.currentCity.name;
    this.cityPopulationTitle.textContent = `(Pop: ${this.currentCity.population})`;

    // Update basic city stats
    this.cityPopulation.textContent = this.currentCity.population.toString();
    
    // Calculate detailed city output
    const resources = this.calculateDetailedCityResources();
    
    // Update resource displays with icons and surplus/deficit indicators
    this.updateResourceDisplay(resources);
    
    // Update population breakdown
    this.updatePopulationBreakdown();
    
    // Update trade breakdown
    this.updateTradeBreakdown(resources);

    // Update current production
    if (this.currentCity.production) {
      this.currentProduction.textContent = this.currentCity.production.item as string;
      this.productionTurns.textContent = `(${this.currentCity.production.turnsRemaining} turns)`;
    } else {
      this.currentProduction.textContent = 'Nothing';
      this.productionTurns.textContent = '(-- turns)';
    }

    // Update buildings list
    this.updateBuildingsList();

    // Update units list
    this.updateUnitsList(gameState);
  }

  private applyCivilizationBackground(): void {
    if (!this.currentCity) return;

    const gameState = this.game.getGameState();
    const player = gameState.players.find(p => p.id === this.currentCity!.playerId);
    if (!player) return;

    // Get civilization information
    const civilization = getCivilization(player.civilizationType);
    
    // Remove all existing background classes
    this.cityDialog.className = this.cityDialog.className.replace(/\b\w+-bg\b/g, '');
    
    // Add civilization-specific background class
    const civName = civilization.name.toLowerCase().replace(/\s+/g, '');
    this.cityDialog.classList.add(`${civName}-bg`);
  }

  private calculateDetailedCityResources(): CityResources {
    if (!this.currentCity) {
      return {
        food: 0, foodSurplus: 0, production: 0, productionSurplus: 0,
        trade: 0, luxuries: 0, tax: 0, science: 0
      };
    }

    // Base food from terrain (simplified)
    const baseFood = Math.max(2, this.currentCity.population + 1);
    const foodConsumption = this.currentCity.population * 2; // Each citizen eats 2 food
    const foodSurplus = baseFood - foodConsumption;

    // Base production
    const baseProduction = Math.max(1, Math.floor(this.currentCity.population / 2));
    const productionSurplus = baseProduction; // Simplified - no consumption for now

    // Trade calculation
    const baseTrade = Math.max(0, this.currentCity.population - 1);
    
    // Trade breakdown (simplified government effects)
    const luxuries = Math.floor(baseTrade * 0.2); // 20% to luxuries
    const tax = Math.floor(baseTrade * 0.4);      // 40% to tax
    const science = baseTrade - luxuries - tax;   // Remainder to science

    return {
      food: baseFood,
      foodSurplus,
      production: baseProduction,
      productionSurplus,
      trade: baseTrade,
      luxuries,
      tax,
      science
    };
  }

  private updateResourceDisplay(resources: CityResources): void {
    // Update food display
    this.cityFood.textContent = resources.food.toString();
    if (this.foodSurplus) {
      this.updateSurplusDisplay(this.foodSurplus, resources.foodSurplus);
    }

    // Update production display
    this.cityProduction.textContent = resources.production.toString();
    if (this.productionSurplus) {
      this.updateSurplusDisplay(this.productionSurplus, resources.productionSurplus);
    }

    // Update trade display
    this.cityTrade.textContent = resources.trade.toString();
  }

  private updateSurplusDisplay(element: HTMLElement, surplus: number): void {
    element.textContent = surplus > 0 ? `+${surplus}` : surplus < 0 ? surplus.toString() : '0';
    element.className = 'resource-surplus ' + 
      (surplus > 0 ? 'positive' : surplus < 0 ? 'negative' : 'neutral');
  }

  private updatePopulationBreakdown(): void {
    if (!this.currentCity || !this.populationDetails) return;

    // Clear existing population units
    this.populationDetails.innerHTML = '';

    // Create population units (simplified - all workers for now)
    for (let i = 0; i < this.currentCity.population; i++) {
      const popUnit = document.createElement('div');
      popUnit.className = 'population-unit worker';
      popUnit.textContent = '👷';
      popUnit.title = 'Worker - produces food and resources';
      this.populationDetails.appendChild(popUnit);
    }
  }

  private updateTradeBreakdown(resources: CityResources): void {
    // Update trade breakdown elements
    if (this.cityLuxuries) {
      this.cityLuxuries.textContent = resources.luxuries.toString();
    }
    if (this.cityTax) {
      this.cityTax.textContent = resources.tax.toString();
    }
    if (this.cityScience) {
      this.cityScience.textContent = resources.science.toString();
    }
  }

  private calculateCityFood(): number {
    // Basic food calculation - population + terrain bonuses
    // This is simplified; you may want to implement more complex calculations
    return Math.max(1, this.currentCity!.population);
  }

  private calculateCityProduction(): number {
    // Basic production calculation
    return Math.max(1, Math.floor(this.currentCity!.population / 2));
  }

  private calculateCityTrade(): number {
    // Basic trade calculation
    return Math.max(0, this.currentCity!.population - 1);
  }

  private calculateCityScience(): number {
    // Basic science calculation
    return Math.max(0, Math.floor(this.calculateCityTrade() / 2));
  }

  private getProductionCost(production: string): number {
    // Simplified production costs
    const costs: { [key: string]: number } = {
      'Settler': 40,
      'Warrior': 10,
      'Phalanx': 20,
      'Archer': 30,
      'Palace': 100,
      'Granary': 60,
      'Barracks': 40,
    };
    return costs[production] || 20;
  }

  private updateBuildingsList(): void {
    if (!this.currentCity!.buildings || this.currentCity!.buildings.length === 0) {
      this.buildingsList.innerHTML = '<div class="building-item">None built yet</div>';
      return;
    }

    this.buildingsList.innerHTML = '';
    this.currentCity!.buildings.forEach(building => {
      const buildingItem = document.createElement('div');
      buildingItem.className = 'building-item';
      buildingItem.textContent = building.type;
      this.buildingsList.appendChild(buildingItem);
    });
  }

  private updateUnitsList(gameState: GameState): void {
    // Find units in the city
    const unitsInCity = gameState.units.filter(unit => 
      unit.position.x === this.currentCity!.position.x && 
      unit.position.y === this.currentCity!.position.y &&
      unit.playerId === this.currentCity!.playerId
    );

    if (unitsInCity.length === 0) {
      this.unitsList.innerHTML = '<div class="unit-item">No units present</div>';
      return;
    }

    this.unitsList.innerHTML = '';
    unitsInCity.forEach(unit => {
      const unitItem = document.createElement('div');
      unitItem.className = 'unit-item';
      unitItem.textContent = `${unit.type}${unit.fortified ? ' (Fortified)' : ''}`;
      this.unitsList.appendChild(unitItem);
    });
  }

  private renderCityMap(): void {
    if (!this.currentCity) return;

    const canvas = this.cityMapCanvas;
    const ctx = this.cityMapContext;
    const tileSize = 20;
    const radius = 2; // City work radius
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const gameState = this.game.getGameState();

    // Render tiles around the city
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > radius) continue;

        const worldX = this.currentCity.position.x + dx;
        const worldY = this.currentCity.position.y + dy;
        
        // Handle world wrapping for X coordinate
        const normalizedX = worldX < 0 ? 
          worldX + gameState.worldMap[0].length : 
          worldX % gameState.worldMap[0].length;
        
        if (worldY < 0 || worldY >= gameState.worldMap.length) continue;

        const terrain = gameState.worldMap[worldY][normalizedX];
        const screenX = centerX + dx * tileSize - tileSize / 2;
        const screenY = centerY + dy * tileSize - tileSize / 2;

        // Color based on terrain type
        let color = '#006600'; // Default green for grassland
        switch (terrain.terrain) {
          case 'ocean':
            color = '#0066cc';
            break;
          case 'desert':
            color = '#ffcc00';
            break;
          case 'forest':
            color = '#003300';
            break;
          case 'hills':
            color = '#996633';
            break;
          case 'mountains':
            color = '#666666';
            break;
          case 'plains':
            color = '#cccc66';
            break;
          case 'jungle':
            color = '#009900';
            break;
        }

        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Highlight city center
        if (dx === 0 && dy === 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
          
          // Draw city icon
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX + 6, screenY + 6, 8, 8);
        } else {
          // Draw border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }
  }

  private handleRename(): void {
    if (!this.currentCity) return;

    const newName = prompt('Enter new city name:', this.currentCity.name);
    if (newName && newName.trim() !== '' && newName !== this.currentCity.name) {
      // Update city name in game state
      this.game.renameCity(this.currentCity.id, newName.trim());
      this.currentCity.name = newName.trim();
      this.cityNameTitle.textContent = newName.trim();
    }
  }

  private handleBuy(): void {
    if (!this.currentCity) return;
    
    // Placeholder for buy functionality
    alert('Buy functionality not yet implemented');
  }

  private handleChangeProduction(): void {
    if (!this.currentCity) return;
    
    // Simplified production change - you may want to implement a proper production dialog
    const options = ['Settler', 'Warrior', 'Phalanx', 'Archer', 'Granary', 'Barracks'];
    const choice = prompt(`Choose production:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nEnter number (1-${options.length}):`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < options.length) {
        const newProduction = options[index];
        this.game.changeCityProduction(this.currentCity.id, newProduction);
        this.updateCityInformation();
      }
    }
  }
}
