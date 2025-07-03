import { City, GameState } from '../types/game';
import { Game } from '../game/Game';
import { getCivilization } from '../game/CivilizationDefinitions';
import { ProductionManager } from '../game/ProductionManager';
import { ProductionSelectionModal } from './ProductionSelectionModal';
import { UNIT_DEFINITIONS } from '../game/UnitDefinitions';
import { BUILDING_DEFINITIONS } from '../game/BuildingDefinitions';
import { TerrainManager } from '../terrain/index';

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
  private productionModal: ProductionSelectionModal;

  private keydownHandler: (event: KeyboardEvent) => void;

  constructor(game: Game) {
    this.game = game;
    this.productionModal = new ProductionSelectionModal(game);
    
    // Bind the keydown handler so we can remove it later
    this.keydownHandler = (event: KeyboardEvent) => this.handleKeydown(event);
    
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

    // Make current production box clickable
    this.currentProduction.addEventListener('click', () => this.handleChangeProduction());
    this.currentProduction.style.cursor = 'pointer';

    // Add click handler for city map
    this.cityMapCanvas.addEventListener('click', (event) => this.handleCityMapClick(event));
    this.cityMapCanvas.style.cursor = 'pointer';

    // Close on overlay click
    this.cityModal.addEventListener('click', (event) => {
      if (event.target === this.cityModal) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        // Check if production modal is open first
        const productionModal = document.getElementById('production-selection-modal');
        if (productionModal && productionModal.style.display === 'flex') {
          return; // Let production modal handle it
        }
        this.close();
      }
      // Handle Enter/Space to close (OK button)
      if ((event.key === 'Enter' || event.key === ' ') && this.isOpen()) {
        // Check if production modal is open first
        const productionModal = document.getElementById('production-selection-modal');
        if (productionModal && productionModal.style.display === 'flex') {
          return; // Let production modal handle it
        }
        event.preventDefault();
        this.close();
      }
    });

    // Add keyboard shortcuts for tile management
    document.addEventListener('keydown', this.keydownHandler);
  }

  public open(city: City): void {
    this.currentCity = city;
    this.updateCityInformation();
    
    // Auto-select optimal tiles if needed
    this.autoSelectOptimalTiles();
    
    this.renderCityMap();
    this.cityModal.style.display = 'flex';
  }

  public close(): void {
    this.cityModal.style.display = 'none';
    this.currentCity = null;
    // Clean up keyboard event listener
    document.removeEventListener('keydown', this.keydownHandler);
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
      // Get production cost for calculating progress
      let totalCost = 0;
      let productionName = this.currentCity.production.item as string;
      
      if (this.currentCity.production.type === 'unit') {
        // Get unit stats to determine cost
        const unitStats = this.getUnitStatsForProduction(this.currentCity.production.item as any);
        if (unitStats) {
          totalCost = unitStats.productionCost;
          productionName = this.formatUnitName(this.currentCity.production.item as string);
        }
      } else if (this.currentCity.production.type === 'building') {
        // Get building stats to determine cost
        const buildingStats = this.getBuildingStatsForProduction(this.currentCity.production.item as any);
        if (buildingStats) {
          totalCost = buildingStats.productionCost;
          productionName = buildingStats.name;
        }
      }
      
      // Show production with accumulated shields
      const accumulatedShields = this.currentCity.production_points || 0;
      this.currentProduction.textContent = `${productionName} (${accumulatedShields}/${totalCost} shields)`;
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

    // Calculate resources from worked tiles
    const workedTileYields = this.calculateWorkedTileYields();
    
    // Total yields from all worked tiles
    const totalFood = workedTileYields.food;
    const totalProduction = workedTileYields.production;
    const totalTrade = workedTileYields.trade;
    
    // Food calculation
    const foodConsumption = this.currentCity.population * 2; // Each citizen eats 2 food
    const foodSurplus = totalFood - foodConsumption;

    // Production (no consumption for now - all goes to surplus)
    const productionSurplus = totalProduction;
    
    // Trade breakdown (simplified government effects)
    const luxuries = Math.floor(totalTrade * 0.2); // 20% to luxuries
    const tax = Math.floor(totalTrade * 0.4);      // 40% to tax
    const science = totalTrade - luxuries - tax;   // Remainder to science

    return {
      food: totalFood,
      foodSurplus,
      production: totalProduction,
      productionSurplus,
      trade: totalTrade,
      luxuries,
      tax,
      science
    };
  }

  /**
   * Calculate total yields from all currently worked tiles
   */
  private calculateWorkedTileYields(): { food: number; production: number; trade: number } {
    if (!this.currentCity) {
      return { food: 0, production: 0, trade: 0 };
    }

    let totalFood = 0;
    let totalProduction = 0;
    let totalTrade = 0;

    // Always include city center yields
    const cityCenterYields = this.getCityCenterYields();
    totalFood += cityCenterYields.food;
    totalProduction += cityCenterYields.production;
    totalTrade += cityCenterYields.trade;

    // Add yields from worked tiles
    const workedTiles = this.getWorkedTilesList();
    for (const { dx, dy } of workedTiles) {
      const tileYields = this.getTileYieldsAt(dx, dy);
      if (tileYields) {
        totalFood += tileYields.food;
        totalProduction += tileYields.production;
        totalTrade += tileYields.trade;
      }
    }

    return { food: totalFood, production: totalProduction, trade: totalTrade };
  }

  /**
   * Get the list of currently worked tiles (excluding city center)
   */
  private getWorkedTilesList(): Array<{ dx: number; dy: number }> {
    if (!this.currentCity) return [];

    // If city has manual tile selection, use only those
    if (this.currentCity.workedTiles && this.currentCity.workedTiles.length > 0) {
      return this.currentCity.workedTiles;
    }

    // Otherwise, use automatic optimal tile selection
    const optimalTiles = this.getOptimalWorkedTiles();
    return optimalTiles.map(tile => ({ dx: tile.dx, dy: tile.dy }));
  }

  /**
   * Get yields for city center tile
   */
  private getCityCenterYields(): { food: number; production: number; trade: number } {
    if (!this.currentCity) {
      return { food: 0, production: 0, trade: 0 };
    }

    const gameState = this.game.getGameState();
    const cityTile = gameState.worldMap[this.currentCity.position.y][this.currentCity.position.x];
    const baseYields = this.getTerrainYields(cityTile);
    
    // City center gets minimum yields
    return {
      food: Math.max(2, baseYields.food),
      production: Math.max(1, baseYields.production),
      trade: Math.max(1, baseYields.trade)
    };
  }

  /**
   * Get yields for a tile at relative position from city center
   */
  private getTileYieldsAt(dx: number, dy: number): { food: number; production: number; trade: number } | null {
    if (!this.currentCity) return null;

    const tileX = this.currentCity.position.x + dx;
    const tileY = this.currentCity.position.y + dy;
    const gameState = this.game.getGameState();
    
    // Check bounds
    if (tileY < 0 || tileY >= gameState.worldMap.length) {
      return null;
    }
    
    // Handle world wrapping for X coordinate
    const normalizedX = tileX < 0 ? 
      tileX + gameState.worldMap[0].length : 
      tileX % gameState.worldMap[0].length;
    
    const tile = gameState.worldMap[tileY][normalizedX];
    return this.getTerrainYields(tile);
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
    const tileSize = 28; // Increased tile size to accommodate resource displays
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const gameState = this.game.getGameState();

    // Define the "L" shaped pattern: center + 2 out in cardinal directions + 1 left/right from those
    const workableTiles: Array<{dx: number, dy: number}> = [];
    
    // Center tile
    workableTiles.push({dx: 0, dy: 0});
    
    // Cardinal directions - 2 tiles out
    // North
    workableTiles.push({dx: 0, dy: -1}, {dx: 0, dy: -2});
    // South  
    workableTiles.push({dx: 0, dy: 1}, {dx: 0, dy: 2});
    // East
    workableTiles.push({dx: 1, dy: 0}, {dx: 2, dy: 0});
    // West
    workableTiles.push({dx: -1, dy: 0}, {dx: -2, dy: 0});
    
    // "L" extensions - 1 tile left/right from the cardinal extensions
    // From North extensions
    workableTiles.push({dx: -1, dy: -1}, {dx: 1, dy: -1}); // From (0,-1)
    workableTiles.push({dx: -1, dy: -2}, {dx: 1, dy: -2}); // From (0,-2)
    // From South extensions  
    workableTiles.push({dx: -1, dy: 1}, {dx: 1, dy: 1});   // From (0,1)
    workableTiles.push({dx: -1, dy: 2}, {dx: 1, dy: 2});   // From (0,2)
    // From East extensions
    workableTiles.push({dx: 1, dy: -1}, {dx: 1, dy: 1});   // From (1,0) - already added above
    workableTiles.push({dx: 2, dy: -1}, {dx: 2, dy: 1});   // From (2,0)
    // From West extensions
    workableTiles.push({dx: -1, dy: -1}, {dx: -1, dy: 1}); // From (-1,0) - already added above
    workableTiles.push({dx: -2, dy: -1}, {dx: -2, dy: 1}); // From (-2,0)

    // Remove duplicates by converting to Set and back
    const uniqueTiles = Array.from(new Set(workableTiles.map(t => `${t.dx},${t.dy}`)))
      .map(coord => {
        const [dx, dy] = coord.split(',').map(Number);
        return {dx, dy};
      });

    // Render each workable tile
    uniqueTiles.forEach(({dx, dy}) => {
      const worldX = this.currentCity!.position.x + dx;
      const worldY = this.currentCity!.position.y + dy;
      
      // Handle world wrapping for X coordinate
      const normalizedX = worldX < 0 ? 
        worldX + gameState.worldMap[0].length : 
        worldX % gameState.worldMap[0].length;
      
      if (worldY < 0 || worldY >= gameState.worldMap.length) return;

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
        case 'swamp':
          color = '#556B2F';
          break;
        case 'river':
          color = '#87CEEB';
          break;
        case 'arctic':
          color = '#E0E0E0';
          break;
        case 'tundra':
          color = '#C0C0C0';
          break;
      }

      ctx.fillStyle = color;
      ctx.fillRect(screenX, screenY, tileSize, tileSize);

      // Get terrain yields and calculate actual yields with improvements and variants
      const baseYields = this.getTerrainYields(terrain);
      
      // Render resource yields on the tile
      this.renderTileResources(ctx, screenX, screenY, tileSize, baseYields);

      // Highlight city center
      if (dx === 0 && dy === 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        
        // Draw city icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏛️', screenX + tileSize/2, screenY + tileSize/2 + 4);
      } else {
        // Check if this tile is being worked
        const isWorked = this.isTileWorked(dx, dy);
        
        if (isWorked) {
          // Worked tiles get a green border
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        } else {
          // Unworked tiles - show basic border
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    });
    
    // Add informational text below the minimap
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    
    const selectedCount = this.currentCity?.workedTiles?.length || 0;
    const totalWorkable = this.currentCity?.population || 0;
    const isCustom = selectedCount > 0;
    
    ctx.fillText(
      `Click tiles to select (${selectedCount}/${totalWorkable}) • R: Reset • ${isCustom ? 'Custom' : 'Auto'}`,
      canvas.width / 2,
      canvas.height - 5
    );
    
    // Simplified legend
    ctx.textAlign = 'left';
    ctx.font = '8px Arial';
    const legendY = canvas.height - 25;
    
    // Green square for worked tiles
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(5, legendY - 8, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Worked', 16, legendY);
  }

  /**
   * Get terrain yields including terrain variants (like shield grassland)
   */
  private getTerrainYields(terrain: any): { food: number; production: number; trade: number } {
    const baseYields = TerrainManager.getTerrainYields(terrain.terrain);
    
    // Add bonus for shield variants
    if (terrain.terrainVariant === 'shield') {
      baseYields.production += 1;
    }
    
    // Add bonus for special resources (simplified)
    if (terrain.resources && terrain.resources.length > 0) {
      // Different resources provide different bonuses
      for (const resource of terrain.resources) {
        switch (resource) {
          case 'wheat':
          case 'fish':
            baseYields.food += 1;
            break;
          case 'horses':
          case 'iron':
          case 'coal':
            baseYields.production += 1;
            break;
          case 'gold':
          case 'gem':
            baseYields.trade += 2;
            break;
        }
      }
    }
    
    return baseYields;
  }

  /**
   * Render resource yields on a tile
   */
  private renderTileResources(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number, yields: { food: number; production: number; trade: number }): void {
    const iconSize = 8;
    const margin = 2;
    
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    
    // Food (top-left) - wheat icon 🌾
    if (yields.food > 0) {
      ctx.fillStyle = '#FFD700'; // Gold background for food
      ctx.fillRect(x + margin, y + margin, iconSize, iconSize);
      ctx.fillStyle = '#000000';
      ctx.fillText('🌾', x + margin + iconSize/2, y + margin + iconSize - 1);
      if (yields.food > 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(yields.food.toString(), x + margin + iconSize/2, y + margin + iconSize + 8);
      }
    }
    
    // Production (top-right) - shield icon 🛡️
    if (yields.production > 0) {
      ctx.fillStyle = '#8B4513'; // Brown background for production
      ctx.fillRect(x + tileSize - iconSize - margin, y + margin, iconSize, iconSize);
      ctx.fillStyle = '#000000';
      ctx.fillText('🛡️', x + tileSize - iconSize/2 - margin, y + margin + iconSize - 1);
      if (yields.production > 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(yields.production.toString(), x + tileSize - iconSize/2 - margin, y + margin + iconSize + 8);
      }
    }
    
    // Trade (bottom-center) - trade icon 💱
    if (yields.trade > 0) {
      ctx.fillStyle = '#4169E1'; // Blue background for trade
      ctx.fillRect(x + tileSize/2 - iconSize/2, y + tileSize - iconSize - margin, iconSize, iconSize);
      ctx.fillStyle = '#000000';
      ctx.fillText('💱', x + tileSize/2, y + tileSize - margin - 1);
      if (yields.trade > 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(yields.trade.toString(), x + tileSize/2, y + tileSize - margin + 8);
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
    
    // Show the production selection modal
    this.productionModal.show(this.currentCity, (selectedOption) => {
      // Callback when user selects a production option
      this.game.changeCityProduction(this.currentCity!.id, selectedOption.name);
      this.updateCityInformation();
      this.productionModal.hide();
    });
  }

  private getUnitStatsForProduction(unitType: any): any {
    try {
      return UNIT_DEFINITIONS[unitType];
    } catch (error) {
      console.warn('Could not get unit stats for', unitType);
      return null;
    }
  }

  private getBuildingStatsForProduction(buildingType: any): any {
    try {
      return BUILDING_DEFINITIONS[buildingType];
    } catch (error) {
      console.warn('Could not get building stats for', buildingType);
      return null;
    }
  }

  private formatUnitName(unitType: string): string {
    // Convert enum value to display name
    return unitType.charAt(0).toUpperCase() + unitType.slice(1).replace(/_/g, ' ');
  }

  /**
   * Check if a tile is currently being worked by city population
   */
  private isTileWorked(dx: number, dy: number): boolean {
    if (!this.currentCity) return false;
    
    // City center is always worked
    if (dx === 0 && dy === 0) return true;
    
    // If city has manual tile selection, use only those
    if (this.currentCity.workedTiles && this.currentCity.workedTiles.length > 0) {
      return this.currentCity.workedTiles.some(tile => tile.dx === dx && tile.dy === dy);
    }
    
    // Otherwise, use automatic optimal tile selection
    const optimalTiles = this.getOptimalWorkedTiles();
    return optimalTiles.some(tile => tile.dx === dx && tile.dy === dy);
  }

  /**
   * Get the list of tiles that should be worked based on city population
   * Returns exactly (population) tiles (not including city center which is always worked)
   * Prioritizes food and production (shields) over trade
   */
  private getOptimalWorkedTiles(): Array<{dx: number, dy: number, yields: {food: number, production: number, trade: number}, totalYield: number}> {
    if (!this.currentCity) return [];
    
    // Collect all available tiles within working radius (2 tiles from city center)
    const availableTiles: Array<{dx: number, dy: number, yields: {food: number, production: number, trade: number}, totalYield: number, priority: number}> = [];
    
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        // Skip city center (always worked, handled separately)
        if (dx === 0 && dy === 0) continue;
        
        // Skip tiles outside the maximum working distance
        const distance = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance (max of x,y distances)
        if (distance > 2) continue;
        
        // Get the actual tile
        const tileX = this.currentCity.position.x + dx;
        const tileY = this.currentCity.position.y + dy;
        const gameState = this.game.getGameState();
        
        // Check bounds
        if (tileY < 0 || tileY >= gameState.worldMap.length) {
          continue;
        }
        
        // Handle world wrapping for X coordinate
        const normalizedX = tileX < 0 ? 
          tileX + gameState.worldMap[0].length : 
          tileX % gameState.worldMap[0].length;
        
        const tile = gameState.worldMap[tileY][normalizedX];
        const yields = this.getTerrainYields(tile);
        const totalYield = yields.food + yields.production + yields.trade;
        
        // Calculate priority: heavily weight food and production over trade
        // Food and production are worth 2x trade for city growth and development
        const priority = (yields.food * 2) + (yields.production * 2) + yields.trade;
        
        availableTiles.push({
          dx,
          dy,
          yields,
          totalYield,
          priority
        });
      }
    }
    
    // Sort tiles by priority (food/production focused), then by total yield
    availableTiles.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      if (a.totalYield !== b.totalYield) {
        return b.totalYield - a.totalYield;
      }
      // Final tie-breaker: prefer food, then production, then trade
      if (a.yields.food !== b.yields.food) {
        return b.yields.food - a.yields.food;
      }
      if (a.yields.production !== b.yields.production) {
        return b.yields.production - a.yields.production;
      }
      return b.yields.trade - a.yields.trade;
    });
    
    // Return the best tiles up to the population limit
    return availableTiles.slice(0, this.currentCity.population);
  }

  /**
   * Reset tile selection to automatic (optimal) selection
   */
  private resetToOptimalTileSelection(): void {
    if (!this.currentCity) return;
    
    this.currentCity.workedTiles = [];
    this.renderCityMap();
    this.updateCityResourceDisplay();
  }

  /**
   * Automatically select optimal tiles when city grows or when no manual selection exists
   */
  private autoSelectOptimalTiles(): void {
    if (!this.currentCity) return;

    // If user has made manual selections, don't interfere
    if (this.currentCity.workedTiles && this.currentCity.workedTiles.length > 0) {
      // Check if we need to add more tiles due to population growth
      const currentSelections = this.currentCity.workedTiles.length;
      const maxTiles = this.currentCity.population;
      
      if (currentSelections < maxTiles) {
        // Add optimal tiles to fill remaining slots
        this.fillRemainingWithOptimalTiles();
      }
      return;
    }

    // No manual selection - auto-select optimal tiles based on population
    const optimalTiles = this.getOptimalWorkedTiles();
    this.currentCity.workedTiles = optimalTiles
      .slice(0, this.currentCity.population)
      .map(tile => ({ dx: tile.dx, dy: tile.dy }));
    
    console.log(`Auto-selected ${this.currentCity.workedTiles.length} optimal tiles for city ${this.currentCity.name}`);
  }

  /**
   * Fill remaining tile slots with optimal choices
   */
  private fillRemainingWithOptimalTiles(): void {
    if (!this.currentCity || !this.currentCity.workedTiles) return;

    const currentSelections = this.currentCity.workedTiles;
    const maxTiles = this.currentCity.population;
    const slotsNeeded = maxTiles - currentSelections.length;

    if (slotsNeeded <= 0) return;

    // Get all optimal tiles
    const optimalTiles = this.getOptimalWorkedTiles();
    const currentTileSet = new Set(currentSelections.map(t => `${t.dx},${t.dy}`));

    // Add best tiles that aren't already selected
    let added = 0;
    for (const tile of optimalTiles) {
      if (!currentTileSet.has(`${tile.dx},${tile.dy}`) && added < slotsNeeded) {
        currentSelections.push({ dx: tile.dx, dy: tile.dy });
        added++;
      }
    }

    console.log(`Auto-filled ${added} additional tiles for city growth`);
  }

  /**
   * Handle city population change - auto-select new tiles or remove excess
   */
  public handlePopulationChange(newPopulation: number): void {
    if (!this.currentCity) return;

    const oldPopulation = this.currentCity.population;
    this.currentCity.population = newPopulation;

    if (!this.currentCity.workedTiles) {
      this.currentCity.workedTiles = [];
    }

    if (newPopulation > oldPopulation) {
      // City grew - auto-select additional optimal tiles
      this.fillRemainingWithOptimalTiles();
    } else if (newPopulation < oldPopulation) {
      // City shrunk - remove excess tiles (remove least valuable first)
      const maxTiles = newPopulation;
      if (this.currentCity.workedTiles.length > maxTiles) {
        // Get yields for all current tiles and sort by value
        const tilesWithYields = this.currentCity.workedTiles.map(({ dx, dy }) => {
          const yields = this.getTileYieldsAt(dx, dy) || { food: 0, production: 0, trade: 0 };
          const totalYield = yields.food + yields.production + yields.trade;
          // Prioritize food for tie-breaking
          const priority = totalYield * 10 + yields.food;
          return { dx, dy, priority };
        });

        // Sort by priority (highest first) and keep only the best ones
        tilesWithYields.sort((a, b) => b.priority - a.priority);
        this.currentCity.workedTiles = tilesWithYields
          .slice(0, maxTiles)
          .map(({ dx, dy }) => ({ dx, dy }));
        
        console.log(`City shrunk: removed ${tilesWithYields.length - maxTiles} least valuable tiles`);
      }
    }

    // Update displays
    this.renderCityMap();
    this.updateCityResourceDisplay();
  }

  /**
   * Handle clicks on the city minimap to select/deselect tiles
   */
  private handleCityMapClick(event: MouseEvent): void {
    if (!this.currentCity) return;

    const canvas = this.cityMapCanvas;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const tileSize = 28;
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    
    // Find which tile was clicked
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance > 2) continue; // Skip tiles outside working radius
        
        const screenX = centerX + dx * tileSize - tileSize / 2;
        const screenY = centerY + dy * tileSize - tileSize / 2;
        
        if (clickX >= screenX && clickX < screenX + tileSize &&
            clickY >= screenY && clickY < screenY + tileSize) {
          
          // Skip city center (always worked)
          if (dx === 0 && dy === 0) return;
          
          // Toggle tile selection
          this.toggleTileSelection(dx, dy);
          
          // Re-render to show the change
          this.renderCityMap();
          // Resource display is already updated in toggleTileSelection
          return;
        }
      }
    }
  }

  /**
   * Toggle the selection state of a tile
   */
  private toggleTileSelection(dx: number, dy: number): void {
    if (!this.currentCity) return;

    // Initialize workedTiles array if it doesn't exist
    if (!this.currentCity.workedTiles) {
      this.currentCity.workedTiles = [];
    }

    // Check if tile is currently selected
    const tileIndex = this.currentCity.workedTiles.findIndex(tile => tile.dx === dx && tile.dy === dy);
    
    if (tileIndex >= 0) {
      // Tile is selected, remove it
      this.currentCity.workedTiles.splice(tileIndex, 1);
    } else {
      // Tile is not selected, add it if we haven't reached the population limit
      if (this.currentCity.workedTiles.length < this.currentCity.population) {
        this.currentCity.workedTiles.push({dx, dy});
      } else {
        // Population limit reached - replace the oldest selected tile (queue behavior)
        this.currentCity.workedTiles.shift(); // Remove first (oldest)
        this.currentCity.workedTiles.push({dx, dy}); // Add new one at end
      }
    }

    console.log(`Tile (${dx}, ${dy}) selection toggled. Current worked tiles:`, this.currentCity.workedTiles);
    
    // Update resource calculations to reflect the new tile selection
    this.updateCityResourceDisplay();
  }

  /**
   * Update just the resource display without recalculating everything
   */
  private updateCityResourceDisplay(): void {
    if (!this.currentCity) return;
    
    const resources = this.calculateDetailedCityResources();
    this.updateResourceDisplay(resources);
  }

  /**
   * Handle keyboard shortcuts for tile management
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Only process if city modal is open
    if (!this.currentCity || this.cityModal.style.display === 'none') return;
    
    switch (event.key.toLowerCase()) {
      case 'r':
        // R key: Reset to automatic tile selection
        this.resetToOptimalTileSelection();
        event.preventDefault();
        break;
    }
  }

  /**
   * Public method to trigger auto-selection for a specific city
   * Can be called from game engine when cities grow
   */
  public autoSelectTilesForCity(city: City): void {
    const wasCurrentCity = this.currentCity === city;
    this.currentCity = city;
    
    this.autoSelectOptimalTiles();
    
    // If this was the currently viewed city, update the display
    if (wasCurrentCity && this.isOpen()) {
      this.renderCityMap();
      this.updateCityResourceDisplay();
    }
  }

  /**
   * Check if a city needs its worked tiles updated due to population change
   */
  public static shouldUpdateWorkedTiles(city: City): boolean {
    if (!city.workedTiles) return true;
    
    // If population can work more tiles than currently selected
    if (city.workedTiles.length < city.population) return true;
    
    // If population decreased and we have too many tiles
    if (city.workedTiles.length > city.population) return true;
    
    return false;
  }
}
