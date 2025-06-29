import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Jungle terrain - dense tropical vegetation.
 * Difficult to traverse but rich in potential resources.
 */
export class JungleTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.JUNGLE, {
      name: 'Jungle',
      movementCost: 1,
      passable: true,
      color: '#14532d',
      possibleResources: [ResourceType.GOLD],
      foodYield: 1,
      productionYield: 1,
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

    // Base jungle color (very dark green)
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add dense vegetation layers
    const jungleColors = ['#166534', '#15803d', '#047857', '#065f46'];
    const vegetationDensity = Math.floor(tileSize * tileSize / 3);
    
    for (let i = 0; i < vegetationDensity; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      const colorIndex = Math.floor(Math.random() * jungleColors.length);
      ctx.fillStyle = jungleColors[colorIndex];
      
      // Create larger vegetation patches for jungle density
      const patchSize = 1 + Math.floor(Math.random() * 3);
      ctx.fillRect(x, y, patchSize, patchSize);
    }

    // Add some lighter highlights for leaf tips
    this.addRandomTexture(ctx, tileSize, ['#22c55e'], 0.025);

    // Add very dark shadows for jungle depth
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < Math.floor(tileSize / 3); i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      if (Math.random() < 0.4) {
        ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1);
      }
    }

    // Add tropical canopy patterns
    this.addCanopyPatterns(ctx, tileSize);

    return canvas;
  }

  private addCanopyPatterns(ctx: CanvasRenderingContext2D, tileSize: number): void {
    // Create dense canopy effect with overlapping circular patterns
    const canopyColors = ['#16a34a', '#15803d', '#166534'];
    const numCanopies = Math.floor(tileSize / 6) + 2;
    
    for (let i = 0; i < numCanopies; i++) {
      const centerX = Math.floor(Math.random() * tileSize);
      const centerY = Math.floor(Math.random() * tileSize);
      const radius = 2 + Math.floor(Math.random() * 4);
      const colorIndex = Math.floor(Math.random() * canopyColors.length);
      
      ctx.fillStyle = canopyColors[colorIndex];
      
      // Draw circular canopy
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const x = centerX + dx;
            const y = centerY + dy;
            if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
              if (Math.random() < 0.7) { // Add some randomness to make it organic
                ctx.fillRect(x, y, 1, 1);
              }
            }
          }
        }
      }
    }

    // Add vine-like patterns
    ctx.fillStyle = '#065f46';
    for (let i = 0; i < Math.floor(tileSize / 4); i++) {
      const startX = Math.floor(Math.random() * tileSize);
      const startY = Math.floor(Math.random() * tileSize);
      const length = 3 + Math.floor(Math.random() * 5);
      
      // Draw wavy vine
      for (let j = 0; j < length; j++) {
        const x = startX + Math.floor(Math.sin(j * 0.5) * 2);
        const y = startY + j;
        if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.GOLD:
        return 0.05; // 5% chance for gold in jungle (reduced by 50%)
      default:
        return 0;
    }
  }

  public getDescription(): string {
    return `${this.name}: Dense tropical vegetation that slows movement but may hide valuable resources. ` +
           `Food +${this.foodYield}, Production +${this.productionYield}, Trade +${this.tradeYield}`;
  }
}
