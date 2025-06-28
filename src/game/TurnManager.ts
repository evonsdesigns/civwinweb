import type { GameState, Unit, City } from '../types/game';

export class TurnManager {
  
  // Process end of turn
  public processTurn(gameState: GameState): void {
    // Restore movement points for current player's units
    this.restoreMovementPoints(gameState);
    
    // Process cities for current player
    this.processCities(gameState);
    
    // Update player resources
    this.updatePlayerResources(gameState);
    
    // Move to next player
    this.nextPlayer(gameState);
    
    // If back to first player, increment turn counter
    if (gameState.currentPlayer === gameState.players[0].id) {
      gameState.turn++;
    }
  }

  // Restore movement points for all units of current player
  private restoreMovementPoints(gameState: GameState): void {
    const currentPlayer = gameState.currentPlayer;
    
    gameState.units
      .filter(unit => unit.playerId === currentPlayer)
      .forEach(unit => {
        unit.movementPoints = unit.maxMovementPoints;
      });
  }

  // Process all cities for current player
  private processCities(gameState: GameState): void {
    const currentPlayer = gameState.currentPlayer;
    
    gameState.cities
      .filter(city => city.playerId === currentPlayer)
      .forEach(city => {
        this.processCityGrowth(city);
        this.processCityProduction(city, gameState);
      });
  }

  // Process city growth
  private processCityGrowth(city: City): void {
    // Simple growth model - need enough food to grow
    const foodNeeded = city.population * 2;
    city.food += this.calculateFoodProduction(city);
    
    if (city.food >= foodNeeded) {
      city.population++;
      city.food -= foodNeeded;
    }
  }

  // Calculate food production for a city
  private calculateFoodProduction(city: City): number {
    // Base food production
    let food = 2;
    
    // Add food from buildings
    if (city.buildings.some(b => b.type === 'granary')) {
      food += 1;
    }
    
    return food;
  }

  // Process city production
  private processCityProduction(city: City, gameState: GameState): void {
    if (!city.production) return;

    const productionPerTurn = this.calculateProductionOutput(city);
    city.production_points += productionPerTurn;

    // Check if production is complete
    city.production.turnsRemaining--;
    
    if (city.production.turnsRemaining <= 0) {
      this.completeProduction(city, gameState);
    }
  }

  // Calculate production output for a city
  private calculateProductionOutput(city: City): number {
    // Base production
    let production = 1;
    
    // Add production from buildings
    if (city.buildings.some(b => b.type === 'barracks')) {
      production += 1;
    }
    
    return production;
  }

  // Complete a production item
  private completeProduction(city: City, gameState: GameState): void {
    if (!city.production) return;

    switch (city.production.type) {
      case 'unit':
        this.createUnit(city, city.production.item as any, gameState);
        break;
      case 'building':
        this.createBuilding(city, city.production.item as any);
        break;
      case 'wonder':
        // Handle wonder construction
        break;
    }

    // Clear current production
    city.production = null;
    city.production_points = 0;
  }

  // Create a new unit
  private createUnit(city: City, unitType: string, gameState: GameState): void {
    const newUnit: Unit = {
      id: `unit-${Date.now()}-${Math.random()}`,
      type: unitType as any,
      position: city.position,
      movementPoints: this.getUnitMovementPoints(unitType),
      maxMovementPoints: this.getUnitMovementPoints(unitType),
      health: 100,
      maxHealth: 100,
      playerId: city.playerId,
      experience: 0
    };

    gameState.units.push(newUnit);
  }

  // Get movement points for unit type
  private getUnitMovementPoints(unitType: string): number {
    switch (unitType) {
      case 'scout': return 3;
      case 'settler': return 2;
      case 'warrior': return 2;
      case 'archer': return 2;
      case 'spearman': return 2;
      case 'catapult': return 1;
      default: return 2;
    }
  }

  // Create a new building
  private createBuilding(city: City, buildingType: string): void {
    city.buildings.push({
      type: buildingType as any,
      completedTurn: 0 // Would be set to current turn
    });
  }

  // Update player resources (gold, science, culture)
  private updatePlayerResources(gameState: GameState): void {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer) return;

    // Calculate income from cities
    const playerCities = gameState.cities.filter(c => c.playerId === currentPlayer.id);
    
    let goldIncome = 0;
    let scienceIncome = 0;
    let cultureIncome = 0;

    playerCities.forEach(city => {
      goldIncome += this.calculateCityGoldIncome(city);
      scienceIncome += this.calculateCityScienceIncome(city);
      cultureIncome += this.calculateCityCultureIncome(city);
    });

    // Update player resources
    currentPlayer.gold += goldIncome;
    currentPlayer.science += scienceIncome;
    currentPlayer.culture += cultureIncome;
  }

  // Calculate gold income from a city
  private calculateCityGoldIncome(city: City): number {
    let income = city.population; // Base income per population
    
    // Building bonuses
    if (city.buildings.some(b => b.type === 'temple')) {
      income += 2;
    }
    
    return income;
  }

  // Calculate science income from a city
  private calculateCityScienceIncome(city: City): number {
    let income = Math.floor(city.population / 2);
    
    // Building bonuses
    if (city.buildings.some(b => b.type === 'library')) {
      income += 3;
    }
    
    return income;
  }

  // Calculate culture income from a city
  private calculateCityCultureIncome(city: City): number {
    let income = 1; // Base culture
    
    // Building bonuses
    if (city.buildings.some(b => b.type === 'temple')) {
      income += 2;
    }
    
    return income;
  }

  // Move to next player
  private nextPlayer(gameState: GameState): void {
    const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[nextIndex].id;
  }
}
