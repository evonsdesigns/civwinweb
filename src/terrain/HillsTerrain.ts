import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';
import { ConnectionPattern, ConnectionMask } from '../types/terrain.js';

/**
 * Hills terrain - elevated terrain that provides production bonus.
 * Good for mining and defensive positions.
 */
export class HillsTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.HILLS, {
      name: 'Hills',
      movementCost: 1,
      passable: true,
      color: '#84cc16',
      possibleResources: [ResourceType.IRON, ResourceType.HORSES],
      foodYield: 1,
      productionYield: 1,
      tradeYield: 0,
      canFoundCity: true,
      useConnections: true
    });
  }

  public createSprite(tileSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base hill color (brown-green)
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add hill contours as concentric shapes (top-down view)
    const centerX = tileSize / 2;
    const centerY = tileSize / 2;
    const maxRadius = Math.min(centerX, centerY) - 2;
    
    // Create multiple elevation levels
    for (let radius = maxRadius; radius > 0; radius -= 3) {
      const shade = radius / maxRadius;
      ctx.fillStyle = shade > 0.6 ? '#a3e635' : '#65a30d';
      
      // Draw irregular hill shape
      for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        const variance = 0.8 + Math.random() * 0.4; // Add irregularity
        const x = centerX + Math.cos(angle) * radius * variance;
        const y = centerY + Math.sin(angle) * radius * variance * 0.7; // Slightly flatten
        
        if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
          ctx.fillRect(Math.floor(x), Math.floor(y), 2, 1);
        }
      }
    }

    // Add some texture variations
    this.addRandomTexture(ctx, tileSize, ['#4d7c0f'], 0.04);

    // Add lighter highlights on elevated areas
    ctx.fillStyle = '#bef264';
    for (let i = 0; i < Math.floor(tileSize / 6); i++) {
      const x = Math.floor(Math.random() * (tileSize - 4)) + 2;
      const y = Math.floor(Math.random() * (tileSize - 4)) + 2;
      // Only add highlights near center (higher elevation)
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distFromCenter < maxRadius * 0.6) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    return canvas;
  }

  public createConnectedSprite(tileSize: number, connections: ConnectionPattern): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base hill color
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Create rolling elevation based on connections
    this.drawConnectedHillPattern(ctx, connections, tileSize);

    return canvas;
  }

  private drawConnectedHillPattern(ctx: CanvasRenderingContext2D, connections: ConnectionPattern, tileSize: number): void {
    const centerX = tileSize / 2;
    const centerY = tileSize / 2;

    // Create rolling elevation based on connections
    ctx.fillStyle = '#a3e635';

    // Draw elevation flows toward connected directions
    if (connections & ConnectionMask.NORTH) {
      this.drawHillFlow(ctx, centerX, centerY, 0, -1, tileSize);
    }
    if (connections & ConnectionMask.SOUTH) {
      this.drawHillFlow(ctx, centerX, centerY, 0, 1, tileSize);
    }
    if (connections & ConnectionMask.EAST) {
      this.drawHillFlow(ctx, centerX, centerY, 1, 0, tileSize);
    }
    if (connections & ConnectionMask.WEST) {
      this.drawHillFlow(ctx, centerX, centerY, -1, 0, tileSize);
    }

    // Add central hill mass
    const radius = Math.min(centerX, centerY) - 4;
    for (let r = radius; r > 0; r -= 2) {
      const shade = r / radius;
      ctx.fillStyle = shade > 0.5 ? '#a3e635' : '#65a30d';
      
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r * 0.8;
        
        if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
          ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
      }
    }
  }

  private drawHillFlow(ctx: CanvasRenderingContext2D, startX: number, startY: number, dirX: number, dirY: number, tileSize: number): void {
    const steps = tileSize / 2;
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const x = startX + dirX * i;
      const y = startY + dirY * i;
      
      if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
        const width = Math.max(1, (1 - progress) * 6);
        for (let w = -width/2; w <= width/2; w++) {
          const px = Math.floor(x + w);
          const py = Math.floor(y);
          if (px >= 0 && px < tileSize) {
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
    }
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.IRON:
        return 0.1; // 10% chance for iron in hills (reduced by 50%)
      case ResourceType.HORSES:
        return 0.025; // 2.5% chance for horses (reduced by 50%)
      default:
        return 0;
    }
  }

  public getDescription(): string {
    return `${this.name}: Elevated terrain good for mining and defense. ` +
           `Food +${this.foodYield}, Production +${this.productionYield}, Trade +${this.tradeYield}`;
  }
}
