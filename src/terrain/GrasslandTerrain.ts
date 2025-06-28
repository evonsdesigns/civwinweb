import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Grassland terrain - the most basic and common terrain type.
 * Provides good balance of food and allows city founding.
 */
export class GrasslandTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.GRASSLAND, {
      name: 'Grassland',
      movementCost: 1,
      passable: true,
      color: '#16a34a',
      possibleResources: [ResourceType.WHEAT, ResourceType.HORSES],
      foodYield: 2,
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

    // Base grass color
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add grass texture using random dots and small patches (top-down view)
    const grassColors = ['#22c55e', '#15803d', '#166534', '#10b981'];
    const dotCount = Math.floor(tileSize * tileSize / 6);
    
    for (let i = 0; i < dotCount; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * grassColors.length);
      ctx.fillStyle = grassColors[colorIndex];
      
      // Vary the size of grass patches for more organic look
      const patchSize = Math.random() < 0.7 ? 1 : 2;
      ctx.fillRect(x, y, patchSize, patchSize);
    }

    // Add some scattered darker grass areas
    ctx.fillStyle = '#14532d';
    for (let i = 0; i < Math.floor(tileSize / 4); i++) {
      const x = Math.floor(Math.random() * (tileSize - 3));
      const y = Math.floor(Math.random() * (tileSize - 3));
      ctx.fillRect(x, y, 2 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
    }

    return canvas;
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.WHEAT:
        return 0.075; // 7.5% chance for wheat (reduced by 50%)
      case ResourceType.HORSES:
        return 0.025; // 2.5% chance for horses (reduced by 50%)
      default:
        return 0;
    }
  }
}
