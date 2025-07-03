import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Arctic terrain - permanently frozen ice and snow.
 * Cold and hostile terrain with limited resources.
 */
export class ArcticTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.ARCTIC, {
      name: 'Arctic',
      movementCost: 2, // Difficult terrain to traverse
      passable: true,
      color: '#E0E0E0', // Light gray/white
      possibleResources: [ResourceType.SEAL], // Arctic terrain has Seal special resource in Civ1
      foodYield: 1,
      productionYield: 0,
      tradeYield: 0,
      canFoundCity: true,
      useConnections: false
    });
  }

  public createSprite(tileSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base arctic color (light gray/white)
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add ice and snow patches
    const iceColors = ['#F0F0F0', '#FFFFFF', '#E8E8E8', '#F8F8F8'];
    const icePatches = Math.floor(tileSize * tileSize / 6);
    
    for (let i = 0; i < icePatches; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * iceColors.length);
      ctx.fillStyle = iceColors[colorIndex];
      
      // Create irregular ice patches
      const patchSize = 2 + Math.floor(Math.random() * 4);
      ctx.fillRect(x, y, patchSize, patchSize);
    }

    // Add some darker cracks and crevices
    const crackColors = ['#C0C0C0', '#D0D0D0', '#B8B8B8'];
    const crackCount = Math.floor(tileSize * tileSize / 12);
    
    for (let i = 0; i < crackCount; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * crackColors.length);
      ctx.fillStyle = crackColors[colorIndex];
      
      // Create thin cracks
      if (Math.random() < 0.7) {
        const crackLength = 3 + Math.floor(Math.random() * 6);
        ctx.fillRect(x, y, Math.random() < 0.5 ? crackLength : 1, Math.random() < 0.5 ? 1 : crackLength);
      } else {
        // Small dark spots
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Add some sparkle effects for ice crystals
    const sparkleCount = Math.floor(tileSize / 12);
    ctx.fillStyle = '#FFFFFF';
    
    for (let i = 0; i < sparkleCount; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      
      // Small bright spots
      ctx.fillRect(x, y, 1, 1);
      // Optional cross pattern for sparkle
      if (Math.random() < 0.3) {
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }

    return canvas;
  }

  /**
   * Get description for this terrain
   */
  public getDescription(): string {
    return "Permanently frozen ice and snow. " +
           "Cold and hostile terrain with limited resources but may provide seal hunting. " +
           "Movement cost: 2, Food: 1, Production: 0, Trade: 0";
  }

  /**
   * Check if this terrain is difficult to traverse
   */
  public isDifficultTerrain(): boolean {
    return true;
  }

  /**
   * Check if this terrain provides defensive bonuses
   */
  public getDefenseBonus(): number {
    return 0; // No defensive bonus
  }
}
