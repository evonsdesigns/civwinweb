import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Ocean terrain - water terrain that blocks land units.
 * Source of fish resources and trade routes.
 */
export class OceanTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.OCEAN, {
      name: 'Ocean',
      movementCost: 999, // Impassable for land units
      passable: false,
      color: '#1e3a8a',
      possibleResources: [ResourceType.FISH],
      foodYield: 1,
      productionYield: 0,
      tradeYield: 2,
      canFoundCity: false,
      useConnections: false
    });
  }

  public createSprite(tileSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base ocean color
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add wave patterns using dithering
    ctx.fillStyle = '#2563eb'; // Lighter blue
    for (let y = 0; y < tileSize; y += 4) {
      for (let x = 0; x < tileSize; x += 8) {
        const offset = (y / 4) % 2 === 0 ? 0 : 4;
        ctx.fillRect(x + offset, y, 2, 2);
      }
    }

    // Add some lighter highlights
    ctx.fillStyle = '#3b82f6';
    for (let y = 2; y < tileSize; y += 8) {
      for (let x = 2; x < tileSize; x += 16) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Add wave crests
    this.addWavePatterns(ctx, tileSize);

    return canvas;
  }

  private addWavePatterns(ctx: CanvasRenderingContext2D, tileSize: number): void {
    // Create wave patterns for more realistic ocean look
    ctx.fillStyle = '#60a5fa';
    
    // Horizontal wave lines
    for (let y = 0; y < tileSize; y += 6) {
      for (let x = 0; x < tileSize; x += 3) {
        const wave = Math.sin((x / tileSize) * Math.PI * 4 + (y / tileSize) * Math.PI * 2) > 0.5;
        if (wave && Math.random() < 0.6) {
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }

    // Add some foam/whitecaps
    ctx.fillStyle = '#93c5fd';
    for (let i = 0; i < Math.floor(tileSize / 3); i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      if (Math.random() < 0.3) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.FISH:
        return 0.2; // 20% chance for fish in ocean (reduced by 50%)
      default:
        return 0;
    }
  }

  public getDescription(): string {
    return `${this.name}: Deep water that blocks land units but provides fish and trade opportunities. ` +
           `Food +${this.foodYield}, Production +${this.productionYield}, Trade +${this.tradeYield}`;
  }
}
