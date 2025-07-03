import { GamePhase, GameState, Player, Position, Unit, City, GovernmentType, GOVERNMENTS, GovernmentEffects, MapScenario, UnitType, TechnologyType, UnitCategory, TerrainType, ImprovementType } from '../types/game';
import { MapGenerator } from './MapGenerator';
import { TurnManager } from './TurnManager';
import { createUnit } from './Units';
import { getUnitStats, canUnitSleep } from './UnitDefinitions';
import { CombatSystem, CombatResult } from './CombatSystem';
import { getTechnology, canResearch, getResearchCost } from './TechnologyDefinitions';
import { TerrainManager } from '../terrain/index';
import { CIVILIZATION_DEFINITIONS, CivilizationType, getAllCivilizations, getCivilization, Civilization } from './CivilizationDefinitions';
import { AIPlayer } from './AIPlayer';
import { SoundEffects } from '../utils/SoundEffects';
import { ProductionManager } from './ProductionManager';

export class Game {
  private gameState: GameState;
  private mapGenerator: MapGenerator;
  private turnManager: TurnManager;
  private combatSystem: CombatSystem;
  private eventListeners: Map<string, Function[]> = new Map();
  
  // Unit queue system
  private unitQueue: Unit[] = [];
  private currentUnitIndex: number = 0;
  private blinkIntervalId: number | null = null;

  constructor() {
    this.mapGenerator = new MapGenerator();
    this.turnManager = new TurnManager();
    this.combatSystem = new CombatSystem();
    
    // Initialize game state
    this.gameState = {
      turn: 1,
      currentPlayer: '',
      players: [],
      worldMap: [],
      units: [],
      cities: [],
      gamePhase: GamePhase.SETUP,
      score: 0
    };
  }

  // Initialize a new game with scenario
  public initializeGame(playerNames: string[], scenario: MapScenario = 'earth'): void {
    // Create players
    this.gameState.players = this.createPlayers(playerNames);
    this.gameState.currentPlayer = this.gameState.players[0].id;

    // Generate world map based on scenario (80x50 with horizontal wrapping)
    this.gameState.worldMap = this.mapGenerator.generateMap(80, 50, scenario);

    // Place initial units and cities for each player
    this.placeInitialUnits();

    // Set game phase to playing
    this.gameState.gamePhase = GamePhase.PLAYING;

    // Build initial unit queue and select first unit
    this.buildUnitQueue();
    if (this.unitQueue.length > 0) {
      this.selectCurrentUnit();
    }

    this.emit('gameInitialized', this.gameState);
  }

  // Create players with default settings
  private createPlayers(playerNames: string[]): Player[] {
    const availableCivs = getAllCivilizations();
    console.log('createPlayers: Available civilizations:', availableCivs.map(c => c.name));
    
    return playerNames.map((name, index) => {
      // Assign different civilizations to each player
      const civIndex = index % availableCivs.length;
      const civilization = availableCivs[civIndex];
      
      console.log(`createPlayers: Assigning ${civilization.name} to player ${name} (index ${index})`);
      
      return {
        id: `player-${index}`,
        name,
        civilizationType: civilization.id,
        color: civilization.color,
        isHuman: index === 0, // First player is human, others are AI
        science: 0, // Start with 0 science points - accumulate each turn
        gold: 50,
        culture: 0,
        technologies: [], // Start with no technologies - can research basic ones
        currentResearchProgress: 0, // Start with 0 progress toward any research
        government: GovernmentType.DESPOTISM, // Start with Despotism
        usedCityNames: [] // Initialize empty array for tracking used city names
      };
    });
  }

  // Place initial settler and warrior for each player
  private placeInitialUnits(): void {
    const mapWidth = this.gameState.worldMap[0].length;
    const mapHeight = this.gameState.worldMap.length;

    this.gameState.players.forEach((player: Player, index: number) => {
      // Find a suitable starting position
      const startPosition = this.findStartingPosition(mapWidth, mapHeight, index);
      
      // Create settler using the new unit factory
      const settler = createUnit(
        `settler-${player.id}`,
        UnitType.SETTLERS,
        startPosition,
        player.id
      );
      const warrior = createUnit(
        `warrior-${player.id}`,
        UnitType.WARRIOR,
        startPosition,
        player.id
      );

      this.gameState.units.push(settler, warrior);
    });
  }

  // Find a suitable starting position for a player
  private findStartingPosition(mapWidth: number, mapHeight: number, playerIndex: number): Position {
    // Simple placement algorithm - spread players across the map
    const spacing = Math.floor(mapWidth / this.gameState.players.length);
    const initialX = Math.min(spacing * playerIndex + 5, mapWidth - 1);
    const initialY = Math.floor(mapHeight / 2);
    
    // Check if the initial position is suitable
    if (this.isValidStartingPosition(initialX, initialY, mapWidth, mapHeight)) {
      return { x: initialX, y: initialY };
    }
    
    // If initial position is not suitable, search in expanding circles
    const maxSearchRadius = Math.min(mapWidth, mapHeight) / 4;
    
    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions on the current radius circle
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = initialX + dx;
          const y = initialY + dy;
          
          if (this.isValidStartingPosition(x, y, mapWidth, mapHeight)) {
            return { x, y };
          }
        }
      }
    }
    
    // Fallback: search entire map for any valid position
    console.warn(`Could not find suitable starting position for player ${playerIndex}, searching entire map`);
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (this.isValidStartingPosition(x, y, mapWidth, mapHeight)) {
          console.warn(`Using fallback position for player ${playerIndex}: (${x}, ${y})`);
          return { x, y };
        }
      }
    }
    
    // Ultimate fallback: find any passable non-ocean terrain (even if can't found city)
    console.error(`No valid starting positions found for player ${playerIndex}, using emergency fallback`);
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const terrainType = this.gameState.worldMap[y][x].terrain;
        if (terrainType !== TerrainType.OCEAN && TerrainManager.isPassable(terrainType)) {
          console.error(`Using emergency position for player ${playerIndex}: (${x}, ${y}) on ${terrainType}`);
          return { x, y };
        }
      }
    }
    
    // This should never happen unless the entire map is ocean
    console.error(`CRITICAL: No land found on map for player ${playerIndex}, using center position`);
    return { x: Math.floor(mapWidth / 2), y: Math.floor(mapHeight / 2) };
  }
  
  // Check if a position is valid for starting (passable terrain that allows city founding)
  private isValidStartingPosition(x: number, y: number, mapWidth: number, mapHeight: number): boolean {
    // Check bounds
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
      return false;
    }
    
    // Get terrain at this position
    const terrainType = this.gameState.worldMap[y][x].terrain;
    
    // Explicitly exclude ocean terrain (cannot spawn units on water)
    if (terrainType === TerrainType.OCEAN) {
      return false;
    }
    
    // Check if terrain is passable and allows city founding
    return TerrainManager.isPassable(terrainType) && TerrainManager.canFoundCity(terrainType);
  }

  // Game turn management
  public async endTurn(): Promise<void> {
    if (this.gameState.gamePhase !== GamePhase.PLAYING) return;

    // Clear current unit selection and stop blinking
    this.clearCurrentUnit();
    
    // Process the turn (restore movement points, handle cities, advance to next player)
    this.turnManager.processTurn(this.gameState);
    
    // Check if the new current player is AI and handle automatically
    await this.processCurrentPlayerTurn();
    
    this.emit('turnEnded', this.gameState);
  }

  // Process the current player's turn (human or AI)
  private async processCurrentPlayerTurn(): Promise<void> {
    while (this.isCurrentPlayerAI()) {
      // Execute AI turn
      const currentPlayer = this.getCurrentPlayer();
      if (currentPlayer) {
        this.emit('aiTurnStarted', { playerId: currentPlayer.id, playerName: currentPlayer.name });
        
        // Execute AI logic
        await AIPlayer.executeTurn(this.gameState, currentPlayer.id);
        
        // Process the turn end for AI
        this.turnManager.processTurn(this.gameState);
        
        this.emit('aiTurnEnded', { playerId: currentPlayer.id, playerName: currentPlayer.name });
      }
    }
    
    // Now it's a human player's turn - emit event and setup
    this.emit('humanTurnStarted', { playerId: this.gameState.currentPlayer });
    
    // Check if player needs to select research (after first turn)
    this.checkForResearchSelection();
    
    this.buildUnitQueue();
    if (this.unitQueue.length > 0) {
      this.selectCurrentUnit();
    }
  }

  // Check if the current player is AI
  private isCurrentPlayerAI(): boolean {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer ? !currentPlayer.isHuman : false;
  }

  // Get the current player object
  private getCurrentPlayer(): Player | null {
    return this.gameState.players.find(p => p.id === this.gameState.currentPlayer) || null;
  }

  // Build queue of units that can move for current player
  private buildUnitQueue(): void {
    const currentPlayer = this.gameState.currentPlayer;
    
    // Get all units for current player that have movement points and are not fortified, sleeping, or building roads
    // Fortified, sleeping, and road-building units are excluded from the queue unless manually awakened
    this.unitQueue = this.gameState.units.filter(unit => 
      unit.playerId === currentPlayer && 
      unit.movementPoints > 0 && 
      !unit.fortified && 
      !unit.fortifying && 
      !unit.sleeping &&
      !unit.buildingRoad
    );
    
    this.currentUnitIndex = 0;
    
    console.log(`Built unit queue for player ${currentPlayer}:`, this.unitQueue.length, 'units');
    
    // If no units are available to move and this is a human player, emit end of turn
    if (this.unitQueue.length === 0) {
      const player = this.getCurrentPlayer();
      if (player && player.isHuman) {
        console.log('No units available to move for human player - emitting endOfTurn');
        this.emit('endOfTurn');
      }
    }
  }

  // Select next unit in queue
  public selectNextUnit(): void {
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
      return;
    }

    const startIndex = this.currentUnitIndex;
    
    do {
      // Move to next unit
      this.currentUnitIndex++;
      if (this.currentUnitIndex >= this.unitQueue.length) {
        this.currentUnitIndex = 0;
      }

      const currentUnit = this.unitQueue[this.currentUnitIndex];
      
      // If we find a unit that can move (not fortified or building roads), select it
      if (currentUnit.movementPoints > 0 && !currentUnit.fortified && !currentUnit.fortifying && !currentUnit.buildingRoad) {
        this.setCurrentUnit(currentUnit);
        return;
      }
      
      // If we've cycled through all units and they're all busy, 
      // just select the current one (player can activate manually)
      if (this.currentUnitIndex === startIndex) {
        this.setCurrentUnit(currentUnit);
        return;
      }
    } while (this.currentUnitIndex !== startIndex);
  }

  // Select current unit (used when unit is removed from queue)
  private selectCurrentUnit(): void {
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
      return;
    }

    // Ensure index is within bounds
    if (this.currentUnitIndex >= this.unitQueue.length) {
      this.currentUnitIndex = 0;
    }

    const currentUnit = this.unitQueue[this.currentUnitIndex];
    this.setCurrentUnit(currentUnit);
  }

  // Select previous unit in queue
  public selectPreviousUnit(): void {
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
      return;
    }

    this.currentUnitIndex--;
    if (this.currentUnitIndex < 0) {
      this.currentUnitIndex = this.unitQueue.length - 1;
    }

    const currentUnit = this.unitQueue[this.currentUnitIndex];
    this.setCurrentUnit(currentUnit);
  }

  // Set the current unit and emit events
  private setCurrentUnit(unit: Unit): void {
    // Only start blinking if unit is not fortified, fortifying, or building roads
    if (!unit.fortified && !unit.fortifying && !unit.buildingRoad) {
      this.startUnitBlinking();
    }
    this.emit('unitSelected', {
      unit: unit,
      unitIndex: this.currentUnitIndex,
      totalUnits: this.unitQueue.length
    });
  }

  // Clear current unit selection
  private clearCurrentUnit(): void {
    this.stopUnitBlinking();
    this.emit('unitDeselected');
    
    // Check if this means end of turn (no more units to move)
    if (this.unitQueue.length === 0) {
      this.emit('endOfTurn');
    }
  }

  // Start blinking effect for current unit
  private startUnitBlinking(): void {
    this.stopUnitBlinking();
    this.blinkIntervalId = window.setInterval(() => {
      this.emit('unitBlink');
    }, 750); // Blink every second
  }

  // Stop blinking effect
  private stopUnitBlinking(): void {
    if (this.blinkIntervalId !== null) {
      clearInterval(this.blinkIntervalId);
      this.blinkIntervalId = null;
    }
  }

  // Get current unit
  public getCurrentUnit(): Unit | null {
    if (this.unitQueue.length === 0 || this.currentUnitIndex >= this.unitQueue.length) {
      return null;
    }
    return this.unitQueue[this.currentUnitIndex];
  }

  // Remove unit from queue when it can no longer move
  public removeUnitFromQueue(unitId: string): void {
    const unitIndex = this.unitQueue.findIndex(unit => unit.id === unitId);
    if (unitIndex === -1) return;

    this.unitQueue.splice(unitIndex, 1);
    
    // Adjust current index if necessary
    if (this.currentUnitIndex >= unitIndex) {
      this.currentUnitIndex = Math.max(0, this.currentUnitIndex - 1);
    }

    // If no units left in queue, clear selection and emit end of turn for human players
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
      
      const player = this.getCurrentPlayer();
      if (player && player.isHuman) {
        console.log('All units exhausted movement - emitting endOfTurn');
        this.emit('endOfTurn');
      }
    } else {
      // Select the unit that's now at the current position (or wrap to start)
      this.selectCurrentUnit();
    }
  }

  // Move a unit
  public moveUnit(unitId: string, newPosition: Position): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.movementPoints <= 0) {
      SoundEffects.playInvalidActionSound();
      return false;
    }

    // Normalize position with horizontal wrapping
    const normalizedPosition = this.normalizePosition(newPosition);

    // Check if target tile is valid
    if (!this.isValidPosition(normalizedPosition)) {
      SoundEffects.playInvalidActionSound();
      return false;
    }

    // Check terrain-based movement restrictions
    if (!this.canUnitMoveToTerrain(unit, normalizedPosition)) {
      SoundEffects.playInvalidActionSound();
      return false;
    }

    // Calculate actual movement cost including terrain
    const movementCost = this.calculateMovementCost(unit.position, normalizedPosition);
    
    // Classic Civ rule: A unit can always move into a terrain square even if the movement cost 
    // exceeds remaining movement points. In that case, it drains all remaining movement to 0.
    // However, unit must have at least some movement points to move
    if (unit.movementPoints <= 0) {
      SoundEffects.playInvalidActionSound();
      return false;
    }

    // Move unit
    unit.position = normalizedPosition;
    
    // Break fortification and road building when unit moves
    if (unit.fortified || unit.fortifying) {
      unit.fortified = false;
      unit.fortifying = false;
      unit.fortificationTurns = 0;
    }
    
    if (unit.buildingRoad) {
      unit.buildingRoad = false;
      unit.roadBuildingTurns = 0;
      console.log('buildRoad: Road building cancelled due to unit movement');
    }
    
    // If movement cost exceeds remaining points, drain all remaining movement
    if (movementCost > unit.movementPoints) {
      unit.movementPoints = 0;
    } else {
      unit.movementPoints -= movementCost;
    }

    // If unit can no longer move, remove from queue
    if (unit.movementPoints <= 0) {
      this.removeUnitFromQueue(unitId);
    }

    this.emit('unitMoved', { unit, newPosition: normalizedPosition });
    return true;
  }

  // Calculate movement cost including terrain and roads
  private calculateMovementCost(fromPosition: Position, toPosition: Position): number {
    // For now, this is a simplified implementation for adjacent moves only
    const distance = this.calculateWrappedDistance(fromPosition, toPosition);
    if (distance !== 1) {
      // For non-adjacent moves, use distance (this would need pathfinding for proper implementation)
      return distance;
    }

    // Get tiles at both positions
    const fromTile = this.gameState.worldMap[fromPosition.y]?.[fromPosition.x];
    const toTile = this.gameState.worldMap[toPosition.y]?.[toPosition.x];
    if (!fromTile || !toTile) return 999; // Invalid tile

    // Check if both tiles have roads - if so, movement cost is 1/3 regardless of terrain
    const fromHasRoad = fromTile.improvements?.some(imp => imp.type === ImprovementType.ROAD);
    const toHasRoad = toTile.improvements?.some(imp => imp.type === ImprovementType.ROAD);
    
    if (fromHasRoad && toHasRoad) {
      return 1/3; // Road movement bonus
    }

    // Otherwise use normal terrain movement cost
    return TerrainManager.getMovementCost(toTile.terrain);
  }

  // Check if unit can move to a specific terrain type
  private canUnitMoveToTerrain(unit: Unit, position: Position): boolean {
    const tile = this.gameState.worldMap[position.y]?.[position.x];
    if (!tile) return false;

    // First, check if there's a city at the target position
    const cityAtPosition = this.gameState.cities.find(city => 
      city.position.x === position.x && city.position.y === position.y
    );

    // If there's a city and the unit belongs to the same player, allow movement
    if (cityAtPosition && cityAtPosition.playerId === unit.playerId) {
      return true;
    }

    // Get unit stats to determine category
    const unitStats = getUnitStats(unit.type);
    const targetTerrain = tile.terrain;

    // Naval units can move freely in ocean
    if (unitStats.category === UnitCategory.NAVAL) {
      return true;
    }

    // Air units can move over any terrain
    if (unitStats.category === UnitCategory.AIR) {
      return true;
    }

    // Check if target is ocean
    if (targetTerrain === TerrainType.OCEAN) {
      // Non-naval units cannot move to ocean unless there's a transport ship
      return this.hasAvailableTransport(position, unit);
    }

    // For other terrain types, use TerrainManager
    return TerrainManager.isPassable(targetTerrain);
  }

  // Check if there's an available transport ship at the given position
  private hasAvailableTransport(position: Position, unitToTransport: Unit): boolean {
    // Find naval units at the target position
    const navalUnitsAtPosition = this.gameState.units.filter(u => 
      u.position.x === position.x && 
      u.position.y === position.y &&
      u.playerId === unitToTransport.playerId && // Same player
      getUnitStats(u.type).category === UnitCategory.NAVAL &&
      getUnitStats(u.type).canCarryUnits && // Has transport capacity
      getUnitStats(u.type).canCarryUnits! > 0
    );

    // Check if any naval unit has available capacity
    for (const navalUnit of navalUnitsAtPosition) {
      const stats = getUnitStats(navalUnit.type);
      const maxCapacity = stats.canCarryUnits || 0;
      
      // Count currently carried units (we'd need to track this in the naval unit)
      // For now, assume naval units are available if they have transport capacity
      const currentlyCarried = 0; // TODO: Implement proper tracking of carried units
      
      if (currentlyCarried < maxCapacity) {
        return true;
      }
    }

    return false;
  }

  // Normalize position coordinates with horizontal wrapping
  private normalizePosition(position: Position): Position {
    const mapWidth = this.gameState.worldMap[0]?.length || 80;
    const mapHeight = this.gameState.worldMap.length || 50;

    let { x, y } = position;
    
    // Wrap horizontally
    x = ((x % mapWidth) + mapWidth) % mapWidth;
    
    // Clamp vertically (no wrapping)
    y = Math.max(0, Math.min(y, mapHeight - 1));

    return { x, y };
  }

  // Calculate distance considering horizontal wrapping
  private calculateWrappedDistance(pos1: Position, pos2: Position): number {
    const mapWidth = this.gameState.worldMap[0]?.length || 80;
    
    // Calculate direct distance
    const directDx = Math.abs(pos1.x - pos2.x);
    
    // Calculate wrapped distance
    const wrappedDx = mapWidth - directDx;
    
    // Use shorter distance
    const dx = Math.min(directDx, wrappedDx);
    const dy = Math.abs(pos1.y - pos2.y);
    
    return dx + dy;
  }

  // Check if a position is valid (considering wrapping)
  private isValidPosition(position: Position): boolean {
    const { y } = position;
    const mapHeight = this.gameState.worldMap.length || 50;
    
    // Y must be within bounds (no vertical wrapping)
    if (y < 0 || y >= mapHeight) return false;
    
    // X is always valid due to horizontal wrapping
    return true;
  }

  // Random word components for generating city names when civilization list is exhausted
  private readonly cityPrefixes = [
    'New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'North', 'South', 'East', 'West',
    'Fort', 'Port', 'Mount', 'Lake', 'River', 'Valley', 'Hill', 'Stone', 'Golden', 'Silver'
  ];

  private readonly citySuffixes = [
    'town', 'city', 'burg', 'holm', 'ford', 'haven', 'port', 'field', 'wood', 'hill',
    'vale', 'stead', 'bridge', 'marsh', 'grove', 'ridge', 'fall', 'glen', 'moor', 'wick'
  ];

  // Generate a random city name when civilization names are exhausted
  private generateRandomCityName(): string {
    const prefix = this.cityPrefixes[Math.floor(Math.random() * this.cityPrefixes.length)];
    const suffix = this.citySuffixes[Math.floor(Math.random() * this.citySuffixes.length)];
    return `${prefix}${suffix}`;
  }

  // Generate a default city name for a player based on their civilization
  public generateCityName(playerId: string): string {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.warn('generateCityName: Player not found for ID:', playerId);
      return 'New City';
    }

    const civilization = getCivilization(player.civilizationType);
    console.log('generateCityName: Player civilization:', civilization.name, 'Available cities:', civilization.cities.length);
    console.log('generateCityName: Player used city names:', player.usedCityNames);
    
    // Get available city names (not yet used)
    const availableCityNames = civilization.cities.filter(cityName => 
      !player.usedCityNames.includes(cityName)
    );
    
    console.log('generateCityName: Available city names:', availableCityNames);
    
    // If we have available civilization-specific names, use the first one
    if (availableCityNames.length > 0) {
      const cityName = availableCityNames[0];
      console.log('generateCityName: Returning civilization city name:', cityName);
      // We'll mark it as used when the city is actually founded
      return cityName;
    }
    
    console.log('generateCityName: All civilization names exhausted, generating random name');
    
    // If all civilization names are used, generate a random name
    let randomName: string;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops
    
    do {
      randomName = this.generateRandomCityName();
      attempts++;
    } while (player.usedCityNames.includes(randomName) && attempts < maxAttempts);
    
    // If we still have a duplicate after max attempts, add a number
    if (player.usedCityNames.includes(randomName)) {
      randomName = `${randomName} ${player.usedCityNames.length + 1}`;
    }
    
    console.log('generateCityName: Returning random city name:', randomName);
    return randomName;
  }

  // Found a city
  public foundCity(unitId: string, cityName?: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLERS) return false;

    // Check if position allows city founding (terrain validation)
    if (!this.isValidPosition(unit.position)) {
      console.log('foundCity: Cannot found city - invalid terrain');
      return false;
    }

    // Check minimum distance requirement (3 squares between cities)
    const minDistance = 3;
    for (const city of this.gameState.cities) {
      if (this.calculateWrappedDistance(unit.position, city.position) < minDistance) {
        console.log('foundCity: Cannot found city - too close to existing city');
        return false;
      }
    }

    console.log('foundCity: Founding city for player:', unit.playerId);
    
    // Generate city name if not provided
    const finalCityName = cityName || this.generateCityName(unit.playerId);
    console.log('foundCity: Final city name chosen:', finalCityName);

    // Mark the city name as used by this player
    const player = this.gameState.players.find(p => p.id === unit.playerId);
    if (player && !player.usedCityNames.includes(finalCityName)) {
      player.usedCityNames.push(finalCityName);
      console.log('foundCity: Marked city name as used. Player used names now:', player.usedCityNames);
    }

    // Create new city
    const city: City = {
      id: `city-${Date.now()}`,
      name: finalCityName,
      position: unit.position,
      population: 1,
      playerId: unit.playerId,
      buildings: [],
      production: null,
      food: 0,
      production_points: 0,
      science: 0,
      culture: 0
    };

    this.gameState.cities.push(city);
    
    // Set initial production to the best defensive unit
    const bestDefensiveUnit = this.getBestDefensiveUnit(unit.playerId);
    if (bestDefensiveUnit) {
      city.production = {
        type: 'unit',
        item: bestDefensiveUnit.type as any,
        turnsRemaining: bestDefensiveUnit.turns
      };
    }
    
    // Remove the settler unit from game state
    this.gameState.units = this.gameState.units.filter((u: Unit) => u.id !== unitId);
    
    // Remove the settler unit from the queue system as well
    this.removeUnitFromQueue(unitId);

    // Play city founding sound effect
    SoundEffects.playCityFoundingSound();

    this.emit('cityFounded', city);
    return true;
  }

  // Rename a city
  public renameCity(cityId: string, newName: string): boolean {
    const city = this.gameState.cities.find(c => c.id === cityId);
    if (!city) return false;

    const oldName = city.name;
    city.name = newName;
    
    // Update the player's used city names
    const player = this.gameState.players.find(p => p.id === city.playerId);
    if (player) {
      // Remove old name and add new name
      const oldNameIndex = player.usedCityNames.indexOf(oldName);
      if (oldNameIndex !== -1) {
        player.usedCityNames.splice(oldNameIndex, 1);
      }
      if (!player.usedCityNames.includes(newName)) {
        player.usedCityNames.push(newName);
      }
    }

    this.emit('cityRenamed', { city, oldName, newName });
    return true;
  }

  // Change city production
  public changeCityProduction(cityId: string, production: string): boolean {
    const city = this.gameState.cities.find(c => c.id === cityId);
    if (!city) return false;

    // Get the current player to check technologies
    const player = this.gameState.players.find(p => p.id === city.playerId);
    if (!player) return false;

    // Validate the production choice
    const existingBuildings = city.buildings.map(b => b.type as any);
    const availableOptions = ProductionManager.getAvailableProduction(
      player.technologies,
      existingBuildings,
      2,
      city.production_points
    );

    // Find the selected option
    const selectedOption = availableOptions.find(opt => 
      opt.name === production || opt.id === production.toLowerCase()
    );

    if (!selectedOption) {
      console.warn(`Production option '${production}' is not available for this city`);
      return false;
    }

    // In Civilization 1, shields are typically transferred when switching production
    // Only reset shields in specific cases (like switching from units to buildings)
    // For now, keep the shields to allow for the "shield transfer" mechanic
    // city.production_points = 0; // Comment out - keep accumulated shields
    
    // Set up production item with proper cost calculation
    const productionItem = {
      type: selectedOption.type,
      item: selectedOption.id,
      turnsRemaining: selectedOption.turns
    };

    city.production = productionItem as any;
    this.emit('cityProductionChanged', { city, production });
    return true;
  }

  // Get production time for an item
  private getProductionTime(item: string): number {
    const productionTimes: { [key: string]: number } = {
      'Settler': 4,
      'Warrior': 2,
      'Phalanx': 3,
      'Archer': 3,
      'Legion': 4,
      'Scout': 2,
      'Granary': 6,
      'Barracks': 4,
      'Library': 8,
      'Temple': 6,
      'Walls': 10,
    };
    return productionTimes[item] || 3;
  }

  // Attack another unit
  public attackUnit(attackerUnitId: string, defenderUnitId: string): CombatResult | null {
    const attacker = this.gameState.units.find(u => u.id === attackerUnitId);
    const defender = this.gameState.units.find(u => u.id === defenderUnitId);

    if (!attacker || !defender) return null;

    // Check if defender is on a fortress tile
    const defenderTile = this.gameState.worldMap[defender.position.y]?.[defender.position.x];
    const defenderHasFortress = defenderTile?.improvements?.some(imp => imp.type === ImprovementType.FORTRESS) || false;

    const result = this.combatSystem.executeAttack(attacker, defender, defenderHasFortress);
    
    if (result) {
      // Remove destroyed units
      if (!result.attackerSurvived) {
        this.gameState.units = this.gameState.units.filter(u => u.id !== attackerUnitId);
      }
      if (!result.defenderSurvived) {
        this.gameState.units = this.gameState.units.filter(u => u.id !== defenderUnitId);
      }

      this.emit('combatResolved', result);
    }

    return result;
  }

  // Fortify a unit
  public fortifyUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    const stats = getUnitStats(unit.type);
    if (!stats.canFortify) return false;

    // Get the terrain at the unit's position
    const tile = this.gameState.worldMap[unit.position.y]?.[unit.position.x];
    if (!tile) return false;

    // Determine fortification timing based on terrain and city presence
    const isInCity = this.isUnitInCity(unit.position);
    const terrainType = tile.terrain;
    const requiredTurns = isInCity ? 1 : this.getFortificationTurns(terrainType);

    // Initialize fortification state
    unit.fortificationTurns = unit.fortificationTurns || 0;

    if (requiredTurns === 1) {
      // Instant fortification (1 turn)
      unit.fortified = true;
      unit.fortifying = false;
      unit.fortificationTurns = 1;
    } else {
      // 2-turn fortification
      if (unit.fortificationTurns === 0) {
        // First turn - start fortifying
        unit.fortifying = true;
        unit.fortified = false;
        unit.fortificationTurns = 1;
      } else if (unit.fortificationTurns === 1 && unit.fortifying) {
        // Second turn - complete fortification
        unit.fortified = true;
        unit.fortifying = false;
        unit.fortificationTurns = 2;
      }
    }

    unit.movementPoints = 0; // End turn when fortifying

    // Remove the unit from the move queue since fortification ends the turn
    this.removeUnitFromQueue(unitId);

    this.emit('unitFortified', unit);
    return true;
  }

  // Wake up (unfortify) a unit
  public wakeUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    unit.fortified = false;
    unit.fortifying = false;
    unit.fortificationTurns = 0;

    this.emit('unitWoken', unit);
    return true;
  }

  // Wake a unit and add it back to the move queue
  public wakeAndActivateUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    // Can only activate units belonging to current player
    if (unit.playerId !== this.gameState.currentPlayer) return false;

    // Wake the unit
    this.wakeUnit(unitId);

    // Restore movement points if it doesn't have any
    if (unit.movementPoints <= 0) {
      const stats = getUnitStats(unit.type);
      unit.movementPoints = stats.movement;
    }

    // Add unit to the move queue if it's not already there
    if (!this.unitQueue.find(u => u.id === unitId)) {
      this.unitQueue.push(unit);
    }

    // Make this unit the current unit
    const unitIndex = this.unitQueue.findIndex(u => u.id === unitId);
    if (unitIndex >= 0) {
      this.currentUnitIndex = unitIndex;
      this.setCurrentUnit(unit);
    }

    this.emit('unitActivated', unit);
    return true;
  }

  // Put a unit to sleep
  public sleepUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    // Check if this unit type can sleep (air units cannot sleep)
    if (!canUnitSleep(unit.type)) return false;

    // Put unit to sleep
    unit.sleeping = true;
    unit.movementPoints = 0; // End turn when sleeping

    // Remove the unit from the move queue since sleeping ends the turn
    this.removeUnitFromQueue(unitId);

    this.emit('unitSlept', unit);
    return true;
  }

  // Wake up a sleeping unit
  public wakeUpUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    // Only wake units that are actually sleeping
    if (!unit.sleeping) return false;

    unit.sleeping = false;

    this.emit('unitWokeUp', unit);
    return true;
  }

  // Wake up a sleeping unit and add it back to the move queue
  public wakeUpAndActivateUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    // Can only activate units belonging to current player
    if (unit.playerId !== this.gameState.currentPlayer) return false;

    // Wake the unit
    this.wakeUpUnit(unitId);

    // Restore movement points
    const stats = getUnitStats(unit.type);
    unit.movementPoints = stats.movement;

    // Add unit to the move queue if it's not already there
    if (!this.unitQueue.find(u => u.id === unitId)) {
      this.unitQueue.push(unit);
    }

    // Make this unit the current unit
    const unitIndex = this.unitQueue.findIndex(u => u.id === unitId);
    if (unitIndex >= 0) {
      this.currentUnitIndex = unitIndex;
      this.setCurrentUnit(unit);
    }

    this.emit('unitActivated', unit);
    return true;
  }

  // Create a unit of specified type at specified position
  public createUnit(unitType: UnitType, position: Position, playerId: string): Unit | null {
    // Check if player has required technology
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    const stats = getUnitStats(unitType);
    if (stats.requiredTechnology) {
      const hasTech = player.technologies.includes(stats.requiredTechnology);
      if (!hasTech) return null;
    }

    const unit = createUnit(
      `unit-${Date.now()}-${Math.random()}`,
      unitType,
      position,
      playerId
    );

    this.gameState.units.push(unit);
    this.emit('unitCreated', unit);
    return unit;
  }

  // Get available unit types for a player based on their technology
  public getAvailableUnits(playerId: string): UnitType[] {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    return Object.values(UnitType).filter(unitType => {
      const stats = getUnitStats(unitType);
      return !stats.requiredTechnology || player.technologies.includes(stats.requiredTechnology);
    });
  }

  // Get unit information including stats
  public getUnitInfo(unitType: UnitType) {
    return getUnitStats(unitType);
  }

  // Get current game state
  public getGameState(): GameState {
    return { ...this.gameState };
  }

  // Pause/unpause game
  public togglePause(): void {
    this.gameState.gamePhase = this.gameState.gamePhase === GamePhase.PAUSED 
      ? GamePhase.PLAYING 
      : GamePhase.PAUSED;
    
    this.emit('gamePhaseChanged', this.gameState.gamePhase);
  }

  // Start a revolution to change government
  public startRevolution(playerId: string): boolean {
    const player = this.gameState.players.find((p: Player) => p.id === playerId);
    if (!player || this.gameState.gamePhase !== GamePhase.PLAYING) return false;

    // Check if already in anarchy
    if (player.government === GovernmentType.ANARCHY) return false;

    // Start anarchy period (2-5 turns based on Civilization mechanics)
    player.government = GovernmentType.ANARCHY;
    player.revolutionTurns = Math.floor(Math.random() * 4) + 2; // 2-5 turns

    this.emit('revolutionStarted', { playerId, turnsRemaining: player.revolutionTurns });
    return true;
  }

  // Change government after revolution
  public changeGovernment(playerId: string, newGovernment: GovernmentType): boolean {
    const player = this.gameState.players.find((p: Player) => p.id === playerId);
    if (!player || player.government !== GovernmentType.ANARCHY) return false;

    // Check if player has required technology
    const governmentData = GOVERNMENTS[newGovernment];
    if (governmentData.requiredTechnology) {
      const hasTech = player.technologies.includes(governmentData.requiredTechnology);
      if (!hasTech) return false;
    }

    // Change government
    player.government = newGovernment;
    player.revolutionTurns = undefined;

    this.emit('governmentChanged', { playerId, newGovernment });
    return true;
  }

  // Get available governments for a player
  public getAvailableGovernments(playerId: string): GovernmentType[] {
    const player = this.gameState.players.find((p: Player) => p.id === playerId);
    if (!player) return [];

    const available: GovernmentType[] = [GovernmentType.DESPOTISM]; // Always available

    // Check technology requirements for other governments
    Object.values(GOVERNMENTS).forEach((gov: any) => {
      if (gov.type === GovernmentType.DESPOTISM || gov.type === GovernmentType.ANARCHY) return;
      
      if (!gov.requiredTechnology || 
          player.technologies.includes(gov.requiredTechnology)) {
        available.push(gov.type);
      }
    });

    return available;
  }

  // Get current government effects for a player
  public getGovernmentEffects(playerId: string): GovernmentEffects | null {
    const player = this.gameState.players.find((p: Player) => p.id === playerId);
    if (!player) return null;

    return GOVERNMENTS[player.government as GovernmentType].effects;
  }

  // Get available technologies for research
  public getAvailableTechnologies(playerId: string): TechnologyType[] {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    return Object.values(TechnologyType).filter(techType => {
      // Don't show already known technologies
      if (player.technologies.includes(techType)) return false;
      
      // Check if prerequisites are met
      return canResearch(techType, player.technologies);
    });
  }

  // Check if current player needs to select research technology
  private checkForResearchSelection(): void {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isHuman) return;

    // Only prompt after the first turn to give players time to understand the game
    if (this.gameState.turn <= 1) return;

    // Check if player has no current research and has science points
    if (!currentPlayer.currentResearch && currentPlayer.science > 0) {
      // Check if there are any technologies available to research
      const availableTechs = this.getAvailableTechnologies(currentPlayer.id);
      if (availableTechs.length > 0) {
        // Emit event to trigger the research selection modal
        this.emit('researchSelectionRequired', { 
          playerId: currentPlayer.id, 
          player: currentPlayer 
        });
      }
    }
  }

  // Research a technology
  public researchTechnology(playerId: string, technologyType: TechnologyType): boolean {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if already researched
    if (player.technologies.includes(technologyType)) return false;

    // Check if this is the current research and player has enough progress
    const cost = getResearchCost(technologyType);
    const progress = player.currentResearch === technologyType ? (player.currentResearchProgress || 0) : 0;
    
    if (progress < cost) return false;

    // Research the technology
    player.technologies.push(technologyType);
    player.currentResearch = undefined; // Clear current research
    player.currentResearchProgress = 0; // Reset progress

    this.emit('technologyResearched', { playerId, technologyType });
    return true;
  }

  // Set current research for a player (without immediately researching)
  public setCurrentResearch(playerId: string, technologyType: TechnologyType): boolean {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if already researched
    if (player.technologies.includes(technologyType)) return false;

    // Check if prerequisites are met
    if (!canResearch(technologyType, player.technologies)) return false;

    // Set as current research and reset progress
    player.currentResearch = technologyType;
    player.currentResearchProgress = 0; // Start fresh progress toward this technology
    return true;
  }

  // Get technology information
  public getTechnologyInfo(technologyType: TechnologyType) {
    return getTechnology(technologyType);
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Get the number of turns required to fully fortify on a terrain type
  private getFortificationTurns(terrainType: TerrainType): number {
    // 1 turn fortification: city, plains, desert, grassland
    // 2 turn fortification: forest, jungle, mountain, hills, rivers
    switch (terrainType) {
      case TerrainType.GRASSLAND:
      case TerrainType.DESERT:
        return 1;
      case TerrainType.FOREST:
      case TerrainType.JUNGLE:
      case TerrainType.MOUNTAINS:
      case TerrainType.HILLS:
      case TerrainType.RIVER:
        return 2;
      default:
        return 1; // Default to 1 turn for unknown terrain
    }
  }

  // Check if a unit is on a city tile (which provides 1-turn fortification)
  private isUnitInCity(unitPosition: Position): boolean {
    const tile = this.gameState.worldMap[unitPosition.y]?.[unitPosition.x];
    return tile?.city !== undefined;
  }

  // Get civilization information for a player
  public getPlayerCivilization(playerId: string): Civilization | null {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return null;
    return getCivilization(player.civilizationType);
  }

  // Get the adjective for a player's civilization (e.g., "Roman", "American")
  public getPlayerCivilizationAdjective(playerId: string): string {
    const civilization = this.getPlayerCivilization(playerId);
    return civilization ? civilization.adjective : 'Unknown';
  }

  // Get the leader name for a player's civilization
  public getPlayerLeader(playerId: string): string {
    const civilization = this.getPlayerCivilization(playerId);
    return civilization ? civilization.leader : 'Unknown Leader';
  }

  // Get the best defensive unit available to a player
  private getBestDefensiveUnit(playerId: string): { type: string; turns: number } | null {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    // Defensive units in order of preference (best to worst)
    const defensiveUnits = [
      UnitType.RIFLEMEN,    // Industrial era
      UnitType.MUSKETEERS,  // Gunpowder era  
      UnitType.PHALANX,     // Classical era
      UnitType.MILITIA      // Ancient era (starting unit)
    ];

    // Find the best unit the player can build
    for (const unitType of defensiveUnits) {
      if (ProductionManager.canProduce('unit', unitType, player.technologies, [])) {
        // Calculate production turns (simplified - using base production of 1)
        const cost = ProductionManager.getProductionCost('unit', unitType);
        const turns = Math.ceil(cost / 1); // Base production capacity
        
        return {
          type: unitType,
          turns: turns
        };
      }
    }

    return null;
  }

  // Terrain improvement methods
  public buildRoad(unitId: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLERS) {
      console.log('buildRoad: Only Settlers can build roads');
      return false;
    }

    if (unit.playerId !== this.gameState.currentPlayer) {
      console.log('buildRoad: Unit does not belong to current player');
      return false;
    }

    const tile = this.gameState.worldMap[unit.position.y]?.[unit.position.x];
    if (!tile) {
      console.log('buildRoad: Invalid tile position');
      return false;
    }

    // Check if roads can be built over rivers - requires Bridge Building technology
    if (tile.terrain === TerrainType.RIVER) {
      const player = this.gameState.players.find(p => p.id === unit.playerId);
      if (!player?.technologies.includes(TechnologyType.BRIDGE_BUILDING)) {
        console.log('buildRoad: Bridge Building technology required to build roads over rivers');
        return false;
      }
    }

    // Check if road already exists
    const hasRoad = tile.improvements?.some(imp => imp.type === ImprovementType.ROAD);
    if (hasRoad) {
      console.log('buildRoad: Road already exists on this tile');
      return false;
    }

    // Determine how many turns are required for this terrain
    const requiredTurns = this.getRoadBuildingTurns(tile.terrain);
    
    // Initialize road building state
    unit.roadBuildingTurns = unit.roadBuildingTurns || 0;

    if (requiredTurns === 1) {
      // Instant road building (1 turn)
      if (!tile.improvements) {
        tile.improvements = [];
      }
      
      tile.improvements.push({
        type: ImprovementType.ROAD,
        completedTurn: this.gameState.turn
      });

      // Clear building state
      unit.buildingRoad = false;
      unit.roadBuildingTurns = 0;
      unit.movementPoints = 0; // End turn when building

      console.log(`buildRoad: Road built instantly at (${unit.position.x}, ${unit.position.y})`);
      this.emit('terrainImproved', { 
        position: unit.position, 
        improvement: 'road',
        playerId: unit.playerId 
      });

      // Remove unit from queue since turn ends
      this.removeUnitFromQueue(unitId);
    } else {
      // 2-turn road building
      if (unit.roadBuildingTurns === 0) {
        // First turn - start building road
        unit.buildingRoad = true;
        unit.roadBuildingTurns = 1;
        unit.movementPoints = 0; // End turn when starting road building

        console.log(`buildRoad: Started building road at (${unit.position.x}, ${unit.position.y}) - turn 1 of 2`);
        this.emit('roadBuildingStarted', { 
          unit,
          position: unit.position,
          turnsRemaining: 1
        });

        // Remove unit from queue since turn ends
        this.removeUnitFromQueue(unitId);
      } else if (unit.roadBuildingTurns === 1 && unit.buildingRoad) {
        // Second turn - complete road
        if (!tile.improvements) {
          tile.improvements = [];
        }
        
        tile.improvements.push({
          type: ImprovementType.ROAD,
          completedTurn: this.gameState.turn
        });

        // Clear building state
        unit.buildingRoad = false;
        unit.roadBuildingTurns = 0;
        unit.movementPoints = 0; // End turn when completing

        console.log(`buildRoad: Road completed at (${unit.position.x}, ${unit.position.y})`);
        this.emit('terrainImproved', { 
          position: unit.position, 
          improvement: 'road',
          playerId: unit.playerId 
        });

        // Remove unit from queue since turn ends
        this.removeUnitFromQueue(unitId);
      }
    }

    return true;
  }

  public buildIrrigation(unitId: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLERS) {
      console.log('buildIrrigation: Only Settlers can build irrigation');
      return false;
    }

    if (unit.playerId !== this.gameState.currentPlayer) {
      console.log('buildIrrigation: Unit does not belong to current player');
      return false;
    }

    const tile = this.gameState.worldMap[unit.position.y]?.[unit.position.x];
    if (!tile) {
      console.log('buildIrrigation: Invalid tile position');
      return false;
    }

    // Check if terrain can be irrigated
    const irrigatableTerrains = [
      TerrainType.DESERT,
      TerrainType.GRASSLAND,
      TerrainType.HILLS,
      TerrainType.PLAINS,
      TerrainType.RIVER
    ];

    if (!irrigatableTerrains.includes(tile.terrain)) {
      console.log('buildIrrigation: This terrain cannot be irrigated');
      return false;
    }

    // Check if irrigation already exists
    const hasIrrigation = tile.improvements?.some(imp => imp.type === ImprovementType.IRRIGATION);
    if (hasIrrigation) {
      console.log('buildIrrigation: Irrigation already exists on this tile');
      return false;
    }

    // Check water access requirement
    if (!this.hasWaterAccess(unit.position.x, unit.position.y)) {
      console.log('buildIrrigation: No water access - must be adjacent to river, ocean, or irrigated tile');
      return false;
    }

    // Add irrigation improvement
    if (!tile.improvements) {
      tile.improvements = [];
    }
    
    tile.improvements.push({
      type: ImprovementType.IRRIGATION,
      completedTurn: this.gameState.turn
    });

    console.log(`buildIrrigation: Irrigation built at (${unit.position.x}, ${unit.position.y})`);
    this.emit('terrainImproved', { 
      position: unit.position, 
      improvement: 'irrigation',
      playerId: unit.playerId 
    });

    return true;
  }

  public buildMine(unitId: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLERS) {
      console.log('buildMine: Only Settlers can build mines');
      return false;
    }

    if (unit.playerId !== this.gameState.currentPlayer) {
      console.log('buildMine: Unit does not belong to current player');
      return false;
    }

    const tile = this.gameState.worldMap[unit.position.y]?.[unit.position.x];
    if (!tile) {
      console.log('buildMine: Invalid tile position');
      return false;
    }

    // Check if terrain can be mined
    const mineableTerrains = [
      TerrainType.DESERT,   // +1 production
      TerrainType.HILLS,    // +3 production  
      TerrainType.MOUNTAINS // +1 production
    ];

    if (!mineableTerrains.includes(tile.terrain)) {
      console.log('buildMine: This terrain cannot be mined');
      return false;
    }

    // Check if mine already exists
    const hasMine = tile.improvements?.some(imp => imp.type === ImprovementType.MINE);
    if (hasMine) {
      console.log('buildMine: Mine already exists on this tile');
      return false;
    }

    // Add mine improvement
    if (!tile.improvements) {
      tile.improvements = [];
    }
    
    tile.improvements.push({
      type: ImprovementType.MINE,
      completedTurn: this.gameState.turn
    });

    console.log(`buildMine: Mine built at (${unit.position.x}, ${unit.position.y})`);
    this.emit('terrainImproved', { 
      position: unit.position, 
      improvement: 'mine',
      playerId: unit.playerId 
    });

    return true;
  }

  // Helper method to check water access for irrigation
  private hasWaterAccess(x: number, y: number): boolean {
    const mapWidth = this.gameState.worldMap[0].length;
    const mapHeight = this.gameState.worldMap.length;

    // Check adjacent tiles (not diagonal)
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 },  // East
      { dx: 0, dy: 1 },  // South
      { dx: -1, dy: 0 }  // West
    ];

    for (const dir of directions) {
      let checkX = x + dir.dx;
      let checkY = y + dir.dy;

      // Handle horizontal wrapping
      if (checkX < 0) checkX = mapWidth - 1;
      if (checkX >= mapWidth) checkX = 0;

      // Skip if out of vertical bounds
      if (checkY < 0 || checkY >= mapHeight) continue;

      const adjacentTile = this.gameState.worldMap[checkY]?.[checkX];
      if (!adjacentTile) continue;

      // Water access sources:
      // 1. River or Ocean terrain
      if (adjacentTile.terrain === TerrainType.RIVER || adjacentTile.terrain === TerrainType.OCEAN) {
        return true;
      }

      // 2. Another irrigated tile
      const hasIrrigation = adjacentTile.improvements?.some(imp => imp.type === ImprovementType.IRRIGATION);
      if (hasIrrigation) {
        return true;
      }
    }

    return false;
  }

  // Get terrain yields with improvements
  public getTerrainYieldsWithImprovements(x: number, y: number): { food: number; production: number; trade: number } {
    const tile = this.gameState.worldMap[y]?.[x];
    if (!tile) {
      return { food: 0, production: 0, trade: 0 };
    }

    // Get base yields
    const baseYields = TerrainManager.getTerrainYields(tile.terrain);
    let yields = { ...baseYields };

    // Apply improvement bonuses
    if (tile.improvements) {
      for (const improvement of tile.improvements) {
        switch (improvement.type) {
          case ImprovementType.IRRIGATION:
            yields.food += 1;
            break;

          case ImprovementType.MINE:
            if (tile.terrain === TerrainType.DESERT) {
              yields.production += 1;
            } else if (tile.terrain === TerrainType.HILLS) {
              yields.production += 3;
            } else if (tile.terrain === TerrainType.MOUNTAINS) {
              yields.production += 1;
            }
            break;

          case ImprovementType.ROAD:
            // Roads increase trade for specific terrains
            if (tile.terrain === TerrainType.GRASSLAND || 
                tile.terrain === TerrainType.PLAINS ||
                tile.terrain === TerrainType.DESERT) {
              yields.trade += 1;
            }
            break;
        }
      }
    }

    return yields;
  }

  // Get the number of turns required to build a road on a terrain type
  private getRoadBuildingTurns(terrainType: TerrainType): number {
    // 1 turn: grassland, desert, plains
    // 2 turns: forest, jungle, hills, mountains, rivers
    switch (terrainType) {
      case TerrainType.GRASSLAND:
      case TerrainType.DESERT:
      case TerrainType.PLAINS:
        return 1;
      case TerrainType.FOREST:
      case TerrainType.JUNGLE:
      case TerrainType.HILLS:
      case TerrainType.MOUNTAINS:
      case TerrainType.RIVER:
        return 2;
      default:
        return 1; // Default to 1 turn for unknown terrain
    }
  }

  // Cancel road building for a unit
  public cancelRoadBuilding(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    if (unit.buildingRoad) {
      unit.buildingRoad = false;
      unit.roadBuildingTurns = 0;
      console.log('cancelRoadBuilding: Road building cancelled');
      this.emit('roadBuildingCancelled', unit);
    }

    return true;
  }

  // Cancel road building and activate the unit
  public cancelRoadBuildingAndActivateUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    // Can only activate units belonging to current player
    if (unit.playerId !== this.gameState.currentPlayer) return false;

    // Cancel road building
    this.cancelRoadBuilding(unitId);

    // Restore movement points if it doesn't have any
    if (unit.movementPoints <= 0) {
      const stats = getUnitStats(unit.type);
      unit.movementPoints = stats.movement;
    }

    // Add unit to the move queue if it's not already there
    if (!this.unitQueue.find(u => u.id === unitId)) {
      this.unitQueue.push(unit);
    }

    // Make this unit the current unit
    const unitIndex = this.unitQueue.findIndex(u => u.id === unitId);
    if (unitIndex >= 0) {
      this.currentUnitIndex = unitIndex;
      this.setCurrentUnit(unit);
    }

    this.emit('unitActivated', unit);
    return true;
  }

  public buildFortress(unitId: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLERS) {
      console.log('buildFortress: Only Settlers can build fortresses');
      return false;
    }

    if (unit.playerId !== this.gameState.currentPlayer) {
      console.log('buildFortress: Unit does not belong to current player');
      return false;
    }

    // Check if player has Construction technology
    const player = this.gameState.players.find(p => p.id === unit.playerId);
    if (!player?.technologies.includes(TechnologyType.CONSTRUCTION)) {
      console.log('buildFortress: Construction technology required to build fortress');
      return false;
    }

    const tile = this.gameState.worldMap[unit.position.y]?.[unit.position.x];
    if (!tile) {
      console.log('buildFortress: Invalid tile position');
      return false;
    }

    // Check if position is in a city square - fortresses cannot be built in cities
    const cityAtPosition = this.gameState.cities.find(city => 
      city.position.x === unit.position.x && city.position.y === unit.position.y
    );
    if (cityAtPosition) {
      console.log('buildFortress: Fortress cannot be built in a city square');
      return false;
    }

    // Check if fortress already exists
    const hasFortress = tile.improvements?.some(imp => imp.type === ImprovementType.FORTRESS);
    if (hasFortress) {
      console.log('buildFortress: Fortress already exists on this tile');
      return false;
    }

    // Check if terrain allows fortress building (cannot build on ocean)
    if (tile.terrain === TerrainType.OCEAN) {
      console.log('buildFortress: Fortress cannot be built on ocean');
      return false;
    }

    // Add fortress improvement
    if (!tile.improvements) {
      tile.improvements = [];
    }
    
    tile.improvements.push({
      type: ImprovementType.FORTRESS,
      completedTurn: this.gameState.turn
    });

    // End unit's turn
    unit.movementPoints = 0;
    this.removeUnitFromQueue(unitId);

    console.log(`buildFortress: Fortress built at (${unit.position.x}, ${unit.position.y})`);
    this.emit('terrainImproved', { 
      position: unit.position, 
      improvement: 'fortress',
      playerId: unit.playerId 
    });

    return true;
  }
}
