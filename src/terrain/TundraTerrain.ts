import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Tundra terrain - cold, partially frozen ground with sparse vegetation.
 * Harsh climate with limited food production.
 */
export class TundraTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.TUNDRA, {
      name: 'Tundra',
      movementCost: 1, // Normal movement cost
      passable: true,
      color: '#C0C0C0', // Gray
      possibleResources: [ResourceType.GAME], // Tundra terrain has Game special resource in Civ1
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

    // Base tundra color (gray)
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add patches of sparse vegetation
    const vegetationColors = ['#A0A0A0', '#B0B0B0', '#909090', '#8B7D6B'];
    const vegetationPatches = Math.floor(tileSize * tileSize / 8);
    
    for (let i = 0; i < vegetationPatches; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * vegetationColors.length);
      ctx.fillStyle = vegetationColors[colorIndex];
      
      // Create small vegetation patches
      const patchSize = 1 + Math.floor(Math.random() * 3);
      ctx.fillRect(x, y, patchSize, patchSize);
    }

    // Add some frozen ground texture
    const frozenColors = ['#D0D0D0', '#DADADA', '#CECECE'];
    const frozenPatches = Math.floor(tileSize * tileSize / 10);
    
    for (let i = 0; i < frozenPatches; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * frozenColors.length);
      ctx.fillStyle = frozenColors[colorIndex];
      
      // Create small frozen patches
      ctx.fillRect(x, y, 2, 2);
    }

    // Add sparse vegetation (tiny grass tufts)
    const grassColor = '#7A8471';
    const grassCount = Math.floor(tileSize / 6);
    
    for (let i = 0; i < grassCount; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      ctx.fillStyle = grassColor;
      
      // Create small vertical lines for sparse grass
      if (Math.random() < 0.8) {
        const grassHeight = 1 + Math.floor(Math.random() * 3);
        ctx.fillRect(x, y, 1, grassHeight);
      } else {
        // Occasional small patch
        ctx.fillRect(x, y, 2, 1);
      }
    }

    // Add some rocks/stones
    const rockColor = '#999999';
    const rockCount = Math.floor(tileSize / 12);
    ctx.fillStyle = rockColor;
    
    for (let i = 0; i < rockCount; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      
      // Small rocky patches
      ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
    }

    return canvas;
  }

  /**
   * Get description for this terrain
   */
  public getDescription(): string {
    return "Cold, partially frozen ground with sparse vegetation. " +
           "Harsh climate with limited food production but may provide game. " +
           "Movement cost: 1, Food: 1, Production: 0, Trade: 0";
  }

  /**
   * Check if this terrain is difficult to traverse
   */
  public isDifficultTerrain(): boolean {
    return false; // Normal movement cost
  }

  /**
   * Check if this terrain provides defensive bonuses
   */
  public getDefenseBonus(): number {
    return 0; // No defensive bonus
  }
}
