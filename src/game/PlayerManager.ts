/**
 * Manages player-related operations and state
 */
import { Player, Position, GameState } from '../types/game';
import { getAllCivilizations, getCivilization, CivilizationType } from './CivilizationDefinitions';

export class PlayerManager {
  private players: Map<string, Player> = new Map();

  /**
   * Create players for a new game
   */
  createPlayers(playerNames: string[]): Player[] {
    const availableCivTypes = getAllCivilizations();
    const players: Player[] = [];

    playerNames.forEach((name, index) => {
      const civilizationType = availableCivTypes[index % availableCivTypes.length];
      const civilization = getCivilization(civilizationType);
      
      const player: Player = {
        id: `player_${index + 1}`,
        name: name,
        civilizationType: civilizationType,
        color: civilization.color,
        isHuman: index === 0, // First player is human, rest are AI
        science: 0,
        gold: 50,
        culture: 0,
        technologies: [],
        government: 'despotism',
        usedCityNames: []
      };

      players.push(player);
      this.players.set(player.id, player);
    });

    return players;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get all players
   */
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Get human players
   */
  getHumanPlayers(): Player[] {
    return Array.from(this.players.values()).filter(p => p.isHuman);
  }

  /**
   * Get AI players
   */
  getAIPlayers(): Player[] {
    return Array.from(this.players.values()).filter(p => !p.isHuman);
  }

  /**
   * Update player data
   */
  updatePlayer(playerId: string, updates: Partial<Player>): void {
    const player = this.players.get(playerId);
    if (player) {
      Object.assign(player, updates);
    }
  }

  /**
   * Find optimal starting positions for players
   */
  findStartingPositions(worldMap: any[][], playerCount: number): Position[] {
    const positions: Position[] = [];
    const mapWidth = worldMap[0]?.length || 80;
    const mapHeight = worldMap.length || 50;
    
    // Simple distribution - spread players evenly
    for (let i = 0; i < playerCount; i++) {
      const angle = (i / playerCount) * 2 * Math.PI;
      const centerX = mapWidth / 2;
      const centerY = mapHeight / 2;
      const radius = Math.min(mapWidth, mapHeight) / 3;
      
      const x = Math.round(centerX + Math.cos(angle) * radius) % mapWidth;
      const y = Math.round(centerY + Math.sin(angle) * radius);
      
      positions.push({ x, y: Math.max(0, Math.min(y, mapHeight - 1)) });
    }
    
    return positions;
  }
}
