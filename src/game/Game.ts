import { GamePhase, GameState, Player, Position, Unit, City, GovernmentType, GOVERNMENTS, GovernmentEffects, MapScenario, UnitType, TechnologyType } from '../types/game';
import { MapGenerator } from './MapGenerator';
import { TurnManager } from './TurnManager';
import { createUnit } from './Units';
import { getUnitStats } from './UnitDefinitions';
import { CombatSystem, CombatResult } from './CombatSystem';
import { getTechnology, canResearch, getResearchCost } from './TechnologyDefinitions';

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
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
    
    return playerNames.map((name, index) => ({
      id: `player-${index}`,
      name,
      color: colors[index] || '#FFFFFF',
      isHuman: index === 0, // First player is human, others are AI
      science: 20, // Start with some science points for testing
      gold: 50,
      culture: 0,
      technologies: [], // Start with no technologies - can research basic ones
      government: GovernmentType.DESPOTISM // Start with Despotism
    }));
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
        UnitType.SETTLER,
        startPosition,
        player.id
      );

      // Create warrior using the new unit factory
      const warrior = createUnit(
        `warrior-${player.id}`,
        UnitType.WARRIOR,
        { x: startPosition.x + 1, y: startPosition.y },
        player.id
      );

      this.gameState.units.push(settler, warrior);
    });
  }

  // Find a suitable starting position for a player
  private findStartingPosition(mapWidth: number, mapHeight: number, playerIndex: number): Position {
    // Simple placement algorithm - spread players across the map
    const spacing = Math.floor(mapWidth / this.gameState.players.length);
    const x = Math.min(spacing * playerIndex + 5, mapWidth - 1);
    const y = Math.floor(mapHeight / 2);
    
    return { x, y };
  }

  // Game turn management
  public endTurn(): void {
    if (this.gameState.gamePhase !== GamePhase.PLAYING) return;

    // Clear current unit selection and stop blinking
    this.clearCurrentUnit();
    
    // Process the turn (restore movement points, handle cities, advance to next player)
    this.turnManager.processTurn(this.gameState);
    
    // Build queue for the new current player and select first unit
    this.buildUnitQueue();
    if (this.unitQueue.length > 0) {
      this.selectCurrentUnit();
    }
    
    this.emit('turnEnded', this.gameState);
  }

  // Build queue of units that can move for current player
  private buildUnitQueue(): void {
    const currentPlayer = this.gameState.currentPlayer;
    
    // Get all units for current player that have movement points
    this.unitQueue = this.gameState.units.filter(unit => 
      unit.playerId === currentPlayer && unit.movementPoints > 0
    );
    
    this.currentUnitIndex = 0;
    
    console.log(`Built unit queue for player ${currentPlayer}:`, this.unitQueue.length, 'units');
  }

  // Select next unit in queue
  public selectNextUnit(): void {
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
      return;
    }

    // Move to next unit
    this.currentUnitIndex++;
    if (this.currentUnitIndex >= this.unitQueue.length) {
      this.currentUnitIndex = 0;
    }

    const currentUnit = this.unitQueue[this.currentUnitIndex];
    this.setCurrentUnit(currentUnit);
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
    this.startUnitBlinking();
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
    }, 1000); // Blink every second
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

    // If no units left in queue, clear selection
    if (this.unitQueue.length === 0) {
      this.clearCurrentUnit();
    } else {
      // Select the unit that's now at the current position (or wrap to start)
      this.selectCurrentUnit();
    }
  }

  // Move a unit
  public moveUnit(unitId: string, newPosition: Position): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.movementPoints <= 0) return false;

    // Normalize position with horizontal wrapping
    const normalizedPosition = this.normalizePosition(newPosition);

    // Validate move (simplified - would need path finding)
    const distance = this.calculateWrappedDistance(unit.position, normalizedPosition);
    if (distance > unit.movementPoints) return false;

    // Check if target tile is valid
    if (!this.isValidPosition(normalizedPosition)) return false;

    // Move unit
    unit.position = normalizedPosition;
    unit.movementPoints -= distance;

    // If unit can no longer move, remove from queue
    if (unit.movementPoints <= 0) {
      this.removeUnitFromQueue(unitId);
    }

    this.emit('unitMoved', { unit, newPosition: normalizedPosition });
    return true;
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

  // Found a city
  public foundCity(unitId: string, cityName: string): boolean {
    const unit = this.gameState.units.find((u: Unit) => u.id === unitId);
    if (!unit || unit.type !== UnitType.SETTLER) return false;

    // Create new city
    const city: City = {
      id: `city-${Date.now()}`,
      name: cityName,
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
    
    // Remove the settler unit
    this.gameState.units = this.gameState.units.filter((u: Unit) => u.id !== unitId);

    this.emit('cityFounded', city);
    return true;
  }

  // Attack another unit
  public attackUnit(attackerUnitId: string, defenderUnitId: string): CombatResult | null {
    const attacker = this.gameState.units.find(u => u.id === attackerUnitId);
    const defender = this.gameState.units.find(u => u.id === defenderUnitId);

    if (!attacker || !defender) return null;

    const result = this.combatSystem.executeAttack(attacker, defender);
    
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

    unit.fortified = true;
    unit.movementPoints = 0; // End turn when fortifying

    this.emit('unitFortified', unit);
    return true;
  }

  // Wake up (unfortify) a unit
  public wakeUnit(unitId: string): boolean {
    const unit = this.gameState.units.find(u => u.id === unitId);
    if (!unit) return false;

    unit.fortified = false;

    this.emit('unitWoken', unit);
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

  // Research a technology
  public researchTechnology(playerId: string, technologyType: TechnologyType): boolean {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if already researched
    if (player.technologies.includes(technologyType)) return false;

    // Check if prerequisites are met
    if (!canResearch(technologyType, player.technologies)) return false;

    // Check if player has enough science points
    const cost = getResearchCost(technologyType);
    if (player.science < cost) return false;

    // Research the technology
    player.science -= cost;
    player.technologies.push(technologyType);

    this.emit('technologyResearched', { playerId, technologyType });
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
}
