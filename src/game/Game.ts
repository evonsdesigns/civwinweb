import { GamePhase, GameState, Player, Position, Unit, City, GovernmentType, GOVERNMENTS, GovernmentEffects } from '../types/game';
import { MapGenerator } from './MapGenerator';
import { TurnManager } from './TurnManager';

export class Game {
  private gameState: GameState;
  private mapGenerator: MapGenerator;
  private turnManager: TurnManager;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.mapGenerator = new MapGenerator();
    this.turnManager = new TurnManager();
    
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

  // Initialize a new game
  public initializeGame(playerNames: string[]): void {
    // Create players
    this.gameState.players = this.createPlayers(playerNames);
    this.gameState.currentPlayer = this.gameState.players[0].id;

    // Generate world map (80x50 with horizontal wrapping)
    this.gameState.worldMap = this.mapGenerator.generateMap(80, 50);

    // Place initial units and cities for each player
    this.placeInitialUnits();

    // Set game phase to playing
    this.gameState.gamePhase = GamePhase.PLAYING;

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
      science: 0,
      gold: 50,
      culture: 0,
      technologies: [],
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
      
      // Create settler
      const settler: Unit = {
        id: `settler-${player.id}`,
        type: 'settler' as any,
        position: startPosition,
        movementPoints: 2,
        maxMovementPoints: 2,
        health: 100,
        maxHealth: 100,
        playerId: player.id,
        experience: 0
      };

      // Create warrior
      const warrior: Unit = {
        id: `warrior-${player.id}`,
        type: 'warrior' as any,
        position: { x: startPosition.x + 1, y: startPosition.y },
        movementPoints: 2,
        maxMovementPoints: 2,
        health: 100,
        maxHealth: 100,
        playerId: player.id,
        experience: 0
      };

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

    this.turnManager.processTurn(this.gameState);
    this.emit('turnEnded', this.gameState);
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
    if (!unit || unit.type !== 'settler') return false;

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
      const hasTech = player.technologies.some((tech: any) => tech.name === governmentData.requiredTechnology);
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
          player.technologies.some((tech: any) => tech.name === gov.requiredTechnology)) {
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
