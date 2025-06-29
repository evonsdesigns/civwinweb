import { GameState, Unit, City, Position, UnitType, TerrainType, Player } from '../types/game';
import { getUnitStats } from './UnitDefinitions';
import { TerrainManager } from '../terrain/index';
import { getCivilization } from './CivilizationDefinitions';

export class AIPlayer {
  
  /**
   * Execute a full AI turn for the given player
   */
  public static async executeTurn(gameState: GameState, playerId: string): Promise<void> {
    console.log(`AI Player ${playerId} starting turn`);
    
    // Get all units for this AI player
    const aiUnits = gameState.units.filter(unit => unit.playerId === playerId);
    
    // Process each unit with AI decision making
    for (const unit of aiUnits) {
      if (unit.movementPoints > 0 && !unit.fortified && !unit.fortifying) {
        await this.processAIUnit(unit, gameState);
      }
    }
    
    // Process AI cities
    this.processAICities(gameState, playerId);
    
    console.log(`AI Player ${playerId} completed turn`);
  }
  
  /**
   * Process an individual AI unit
   */
  private static async processAIUnit(unit: Unit, gameState: GameState): Promise<void> {
    const unitStats = getUnitStats(unit.type);
    
    // Add minimal delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 50));
    
    switch (unit.type) {
      case UnitType.SETTLER:
        this.handleSettlerAI(unit, gameState);
        break;
      case UnitType.WARRIOR:
      case UnitType.PHALANX:
      case UnitType.LEGION:
        this.handleMilitaryAI(unit, gameState);
        break;
      default:
        this.handleDefaultUnitAI(unit, gameState);
        break;
    }
  }
  
  /**
   * AI logic for settler units - find good city locations
   */
  private static handleSettlerAI(unit: Unit, gameState: GameState): void {
    // In early game (first 10 turns), be more aggressive about founding cities
    const isEarlyGame = gameState.turn <= 10;
    
    // Check current position first - if it's decent and early game, just found here
    if (isEarlyGame && this.isValidCityLocation(unit.position, gameState)) {
      const currentScore = this.evaluateCityLocation(unit.position, gameState);
      // In early game, accept any location with score > 1 (very low threshold)
      if (currentScore > 1) {
        this.foundAICity(unit, gameState);
        return;
      }
    }
    
    // Look for good city founding locations
    const bestLocation = this.findBestCityLocation(unit.position, gameState, isEarlyGame);
    
    if (bestLocation) {
      if (this.isAtPosition(unit.position, bestLocation)) {
        // We're at a good location, found a city
        this.foundAICity(unit, gameState);
      } else {
        // Move towards the best location
        this.moveUnitTowards(unit, bestLocation, gameState);
      }
    } else {
      // No good location found
      if (isEarlyGame && this.isValidCityLocation(unit.position, gameState)) {
        // In early game, found city at current position if it's valid
        this.foundAICity(unit, gameState);
      } else {
        // Explore to find a better location
        this.exploreRandomly(unit, gameState);
      }
    }
  }
  
  /**
   * AI logic for military units - patrol and defend
   */
  private static handleMilitaryAI(unit: Unit, gameState: GameState): void {
    // Look for enemy units to attack
    const enemyTarget = this.findNearestEnemy(unit, gameState);
    
    if (enemyTarget && this.getDistance(unit.position, enemyTarget.position) <= 3) {
      // Move towards enemy
      this.moveUnitTowards(unit, enemyTarget.position, gameState);
    } else {
      // Patrol around cities or explore
      const nearestCity = this.findNearestFriendlyCity(unit, gameState);
      if (nearestCity && this.getDistance(unit.position, nearestCity.position) > 2) {
        // Move towards city to defend
        this.moveUnitTowards(unit, nearestCity.position, gameState);
      } else {
        // Patrol randomly
        this.exploreRandomly(unit, gameState);
      }
    }
  }
  
  /**
   * Default AI logic for other unit types
   */
  private static handleDefaultUnitAI(unit: Unit, gameState: GameState): void {
    // Simple exploration behavior
    this.exploreRandomly(unit, gameState);
  }
  
  /**
   * Move a unit towards a target position
   */
  private static moveUnitTowards(unit: Unit, target: Position, gameState: GameState): void {
    if (unit.movementPoints <= 0) return;
    
    const possibleMoves = this.getValidMoves(unit.position, gameState);
    if (possibleMoves.length === 0) return;
    
    // Find the move that gets us closest to the target
    let bestMove = possibleMoves[0];
    let bestDistance = this.getDistance(bestMove, target);
    
    for (const move of possibleMoves) {
      const distance = this.getDistance(move, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMove = move;
      }
    }
    
    // Execute the move
    unit.position = bestMove;
    unit.movementPoints = Math.max(0, unit.movementPoints - 1);
  }
  
  /**
   * Make a unit explore randomly
   */
  private static exploreRandomly(unit: Unit, gameState: GameState): void {
    if (unit.movementPoints <= 0) return;
    
    const possibleMoves = this.getValidMoves(unit.position, gameState);
    if (possibleMoves.length === 0) return;
    
    // Choose a random valid move
    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    unit.position = randomMove;
    unit.movementPoints = Math.max(0, unit.movementPoints - 1);
  }
  
  /**
   * Get all valid moves from a position
   */
  private static getValidMoves(position: Position, gameState: GameState): Position[] {
    const moves: Position[] = [];
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];
    
    for (const [dx, dy] of directions) {
      const newPos = {
        x: position.x + dx,
        y: position.y + dy
      };
      
      if (this.isValidPosition(newPos, gameState)) {
        moves.push(newPos);
      }
    }
    
    return moves;
  }
  
  /**
   * Check if a position is valid for movement
   */
  private static isValidPosition(position: Position, gameState: GameState): boolean {
    const mapWidth = gameState.worldMap[0]?.length || 80;
    const mapHeight = gameState.worldMap.length || 50;
    
    // Handle horizontal wrapping
    let { x, y } = position;
    x = ((x % mapWidth) + mapWidth) % mapWidth;
    
    // Check vertical bounds
    if (y < 0 || y >= mapHeight) return false;
    
    // Check terrain
    const tile = gameState.worldMap[y]?.[x];
    if (!tile) return false;
    
    // Can't move to ocean (simple check for land units)
    if (tile.terrain === TerrainType.OCEAN) return false;
    
    return TerrainManager.isPassable(tile.terrain);
  }
  
  /**
   * Find the best location for founding a city
   */
  private static findBestCityLocation(currentPos: Position, gameState: GameState, isEarlyGame: boolean = false): Position | null {
    const searchRadius = isEarlyGame ? 2 : 5; // Much smaller search radius in early game
    let bestLocation: Position | null = null;
    let bestScore = isEarlyGame ? 1 : 3; // Much lower threshold in early game
    
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const pos = {
          x: currentPos.x + dx,
          y: currentPos.y + dy
        };
        
        if (this.isValidCityLocation(pos, gameState)) {
          const score = this.evaluateCityLocation(pos, gameState);
          if (score > bestScore) {
            bestScore = score;
            bestLocation = pos;
          }
        }
      }
    }
    
    return bestLocation;
  }
  
  /**
   * Check if a location is valid for founding a city
   */
  private static isValidCityLocation(position: Position, gameState: GameState): boolean {
    const mapWidth = gameState.worldMap[0]?.length || 80;
    const mapHeight = gameState.worldMap.length || 50;
    
    // Handle wrapping
    let { x, y } = position;
    x = ((x % mapWidth) + mapWidth) % mapWidth;
    
    if (y < 0 || y >= mapHeight) return false;
    
    const tile = gameState.worldMap[y]?.[x];
    if (!tile) return false;
    
    // Check if terrain allows city founding
    if (!TerrainManager.canFoundCity(tile.terrain)) return false;
    
    // Check if there's already a city nearby
    // Reduce minimum distance in early game to allow more aggressive expansion
    const isEarlyGame = gameState.turn <= 10;
    const minDistance = isEarlyGame ? 2 : 3;
    
    for (const city of gameState.cities) {
      if (this.getDistance(position, city.position) < minDistance) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate how good a location is for a city
   */
  private static evaluateCityLocation(position: Position, gameState: GameState): number {
    let score = 0;
    
    const tile = gameState.worldMap[position.y]?.[position.x];
    if (!tile) return 0;
    
    // Base score for any valid land
    score += 2;
    
    // Prefer certain terrain types
    switch (tile.terrain) {
      case TerrainType.GRASSLAND:
        score += 3;
        break;
      case TerrainType.RIVER:
        score += 5;
        break;
      case TerrainType.HILLS:
        score += 2;
        break;
      default:
        score += 1;
        break;
    }
    
    // Bonus for being near water but not on it
    const nearWater = this.isNearTerrain(position, TerrainType.OCEAN, gameState);
    if (nearWater) score += 2;
    
    // Small bonus for being near rivers
    const nearRiver = this.isNearTerrain(position, TerrainType.RIVER, gameState);
    if (nearRiver) score += 1;
    
    return score;
  }
  
  /**
   * Check if a position is near a specific terrain type
   */
  private static isNearTerrain(position: Position, terrainType: TerrainType, gameState: GameState): boolean {
    const neighbors = this.getValidMoves(position, gameState);
    for (const neighbor of neighbors) {
      const tile = gameState.worldMap[neighbor.y]?.[neighbor.x];
      if (tile && tile.terrain === terrainType) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Generate a city name for an AI player based on their civilization
   */
  private static generateCityNameForPlayer(player: Player): string {
    const civilization = getCivilization(player.civilizationType);
    
    // Get available city names (not yet used)
    const availableCityNames = civilization.cities.filter(cityName => 
      !player.usedCityNames.includes(cityName)
    );
    
    // If we have available civilization-specific names, use the first one
    if (availableCityNames.length > 0) {
      return availableCityNames[0];
    }
    
    // If all civilization names are used, generate a random name
    const cityPrefixes = [
      'New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'North', 'South', 'East', 'West',
      'Fort', 'Port', 'Mount', 'Lake', 'River', 'Valley', 'Hill', 'Stone', 'Golden', 'Silver'
    ];
    
    const citySuffixes = [
      'town', 'city', 'burg', 'holm', 'ford', 'haven', 'port', 'field', 'wood', 'hill',
      'vale', 'stead', 'bridge', 'marsh', 'grove', 'ridge', 'fall', 'glen', 'moor', 'wick'
    ];
    
    let randomName: string;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops
    
    do {
      const prefix = cityPrefixes[Math.floor(Math.random() * cityPrefixes.length)];
      const suffix = citySuffixes[Math.floor(Math.random() * citySuffixes.length)];
      randomName = `${prefix} ${suffix}`;
      attempts++;
    } while (player.usedCityNames.includes(randomName) && attempts < maxAttempts);
    
    // If we still have a duplicate after max attempts, add a number
    if (player.usedCityNames.includes(randomName)) {
      randomName = `${randomName} ${player.usedCityNames.length + 1}`;
    }
    
    return randomName;
  }
  
  /**
   * Found a city with an AI settler
   */
  private static foundAICity(settler: Unit, gameState: GameState): void {
    // Get the player to access their civilization for proper city naming
    const player = gameState.players.find(p => p.id === settler.playerId);
    if (!player) {
      console.warn('foundAICity: Player not found for settler', settler.playerId);
      return;
    }

    // Generate a proper city name based on the AI player's civilization
    const cityName = this.generateCityNameForPlayer(player);
    
    // Create the city
    const city: City = {
      id: `city-${Date.now()}-${Math.random()}`,
      name: cityName,
      position: settler.position,
      population: 1,
      playerId: settler.playerId,
      buildings: [],
      production: null,
      food: 0,
      production_points: 0,
      science: 0,
      culture: 0
    };
    
    gameState.cities.push(city);
    
    // Mark the city name as used
    if (!player.usedCityNames.includes(cityName)) {
      player.usedCityNames.push(cityName);
    }
    
    // Remove the settler
    gameState.units = gameState.units.filter(u => u.id !== settler.id);
  }
  
  /**
   * Find the nearest enemy unit
   */
  private static findNearestEnemy(unit: Unit, gameState: GameState): Unit | null {
    let nearestEnemy: Unit | null = null;
    let nearestDistance = Infinity;
    
    for (const otherUnit of gameState.units) {
      if (otherUnit.playerId !== unit.playerId) {
        const distance = this.getDistance(unit.position, otherUnit.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = otherUnit;
        }
      }
    }
    
    return nearestEnemy;
  }
  
  /**
   * Find the nearest friendly city
   */
  private static findNearestFriendlyCity(unit: Unit, gameState: GameState): City | null {
    let nearestCity: City | null = null;
    let nearestDistance = Infinity;
    
    for (const city of gameState.cities) {
      if (city.playerId === unit.playerId) {
        const distance = this.getDistance(unit.position, city.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestCity = city;
        }
      }
    }
    
    return nearestCity;
  }
  
  /**
   * Calculate distance between two positions (considering map wrapping)
   */
  private static getDistance(pos1: Position, pos2: Position): number {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx + dy; // Manhattan distance
  }
  
  /**
   * Check if two positions are the same
   */
  private static isAtPosition(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }
  
  /**
   * Process AI cities - set production, etc.
   */
  private static processAICities(gameState: GameState, playerId: string): void {
    const aiCities = gameState.cities.filter(city => city.playerId === playerId);
    
    for (const city of aiCities) {
      if (!city.production) {
        // Choose what to produce
        this.setAICityProduction(city, gameState);
      }
    }
  }
  
  /**
   * Set production for an AI city
   */
  private static setAICityProduction(city: City, gameState: GameState): void {
    const playerUnits = gameState.units.filter(u => u.playerId === city.playerId);
    const playerCities = gameState.cities.filter(c => c.playerId === city.playerId);
    
    const settlerCount = playerUnits.filter(u => u.type === UnitType.SETTLER).length;
    const militaryCount = playerUnits.filter(u => 
      u.type === UnitType.WARRIOR || u.type === UnitType.PHALANX || u.type === UnitType.LEGION
    ).length;
    
    // Count settlers already in production
    const settlersInProduction = playerCities.filter(c => 
      c.production && c.production.type === 'unit' && c.production.item === UnitType.SETTLER
    ).length;
    
    // Total settlers (existing + in production)
    const totalSettlers = settlerCount + settlersInProduction;
    
    // Determine optimal settler count based on game stage and cities
    const isEarlyGame = gameState.turn <= 15;
    const isMidGame = gameState.turn > 15 && gameState.turn <= 50;
    
    let maxDesiredSettlers: number;
    if (isEarlyGame) {
      // Early game: 1 settler per city + 1 spare
      maxDesiredSettlers = Math.min(playerCities.length + 1, 4);
    } else if (isMidGame) {
      // Mid game: fewer settlers, focus on expansion completion
      maxDesiredSettlers = Math.max(2, Math.floor(playerCities.length * 0.5));
    } else {
      // Late game: minimal settlers, focus on infrastructure
      maxDesiredSettlers = Math.max(1, Math.floor(playerCities.length * 0.25));
    }
    
    // Production priority logic
    if (totalSettlers < maxDesiredSettlers && isEarlyGame) {
      // Need more settlers for expansion
      city.production = {
        type: 'unit',
        item: UnitType.SETTLER,
        turnsRemaining: 3
      };
    } else if (militaryCount < Math.max(2, playerCities.length)) {
      // Need basic military defense (at least 1 per city, minimum 2)
      city.production = {
        type: 'unit',
        item: UnitType.WARRIOR,
        turnsRemaining: 2
      };
    } else if (totalSettlers < maxDesiredSettlers) {
      // Mid/late game settler needs
      city.production = {
        type: 'unit',
        item: UnitType.SETTLER,
        turnsRemaining: 3
      };
    } else {
      // Focus on infrastructure and buildings
      city.production = {
        type: 'building',
        item: 'granary',
        turnsRemaining: 4
      };
    }
  }
}
