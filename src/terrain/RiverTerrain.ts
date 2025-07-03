import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';
import { ConnectionPattern, ConnectionMask } from '../types/terrain.js';

/**
 * River terrain - flowing water that provides fish and fresh water.
 * Creates connected waterways across the map.
 */
export class RiverTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.RIVER, {
      name: 'River',
      movementCost: 1, // Normal movement cost for land units
      passable: true,
      color: '#0ea5e9',
      possibleResources: [], // River has no special resources in Civ1 (Shield is a terrain variant)
      foodYield: 2,
      productionYield: 0,
      tradeYield: 1,
      canFoundCity: true, // Rivers are excellent for founding cities
      useConnections: true
    });
  }

  public createSprite(tileSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base river color (lighter blue than ocean)
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add flowing water pattern
    ctx.fillStyle = '#38bdf8';
    for (let y = 0; y < tileSize; y += 2) {
      for (let x = 0; x < tileSize; x += 4) {
        const flow = Math.sin((x / tileSize + y / tileSize) * Math.PI * 4) > 0;
        if (flow) {
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }

    // Add some ripples
    this.addRandomTexture(ctx, tileSize, ['#7dd3fc'], 0.05);

    // Add darker water depths
    ctx.fillStyle = '#0284c7';
    for (let y = 0; y < tileSize; y += 6) {
      for (let x = 1; x < tileSize; x += 8) {
        ctx.fillRect(x, y, 1, 2);
      }
    }

    return canvas;
  }

  public createConnectedSprite(tileSize: number, connections: ConnectionPattern): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Base river color
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Create flowing river based on connections
    this.drawConnectedRiverPattern(ctx, connections, tileSize);

    return canvas;
  }

  private drawConnectedRiverPattern(ctx: CanvasRenderingContext2D, connections: ConnectionPattern, tileSize: number): void {
    const centerX = tileSize / 2;
    const centerY = tileSize / 2;

    // Draw river channels based on connections
    ctx.fillStyle = '#38bdf8';

    // Horizontal flow (East-West)
    if ((connections & ConnectionMask.EAST) || (connections & ConnectionMask.WEST)) {
      this.drawRiverChannel(ctx, 0, tileSize, centerY - 2, centerY + 2, true, tileSize);
    }

    // Vertical flow (North-South)
    if ((connections & ConnectionMask.NORTH) || (connections & ConnectionMask.SOUTH)) {
      this.drawRiverChannel(ctx, 0, tileSize, centerX - 2, centerX + 2, false, tileSize);
    }

    // Draw curves for diagonal connections
    if (connections & (ConnectionMask.NORTHEAST | ConnectionMask.NORTHWEST | ConnectionMask.SOUTHEAST | ConnectionMask.SOUTHWEST)) {
      this.drawRiverCurves(ctx, connections, tileSize);
    }

    // Add water effects
    this.addRandomTexture(ctx, tileSize, ['#7dd3fc'], 0.025);
  }

  private drawRiverChannel(ctx: CanvasRenderingContext2D, start: number, end: number, width1: number, width2: number, horizontal: boolean, tileSize: number): void {
    for (let i = start; i < end; i++) {
      for (let w = width1; w <= width2; w++) {
        if (horizontal) {
          if (w >= 0 && w < tileSize && i >= 0 && i < tileSize) {
            ctx.fillRect(i, w, 1, 1);
          }
        } else {
          if (i >= 0 && i < tileSize && w >= 0 && w < tileSize) {
            ctx.fillRect(w, i, 1, 1);
          }
        }
      }
    }
  }

  private drawRiverCurves(ctx: CanvasRenderingContext2D, connections: ConnectionPattern, tileSize: number): void {
    const centerX = tileSize / 2;
    const centerY = tileSize / 2;
    const radius = tileSize / 3;

    // Draw curved connections to diagonal directions
    if (connections & ConnectionMask.NORTHEAST) {
      this.drawQuarterCircle(ctx, centerX, centerY, radius, 0, Math.PI / 2, tileSize);
    }
    if (connections & ConnectionMask.NORTHWEST) {
      this.drawQuarterCircle(ctx, centerX, centerY, radius, Math.PI / 2, Math.PI, tileSize);
    }
    if (connections & ConnectionMask.SOUTHWEST) {
      this.drawQuarterCircle(ctx, centerX, centerY, radius, Math.PI, 3 * Math.PI / 2, tileSize);
    }
    if (connections & ConnectionMask.SOUTHEAST) {
      this.drawQuarterCircle(ctx, centerX, centerY, radius, 3 * Math.PI / 2, 2 * Math.PI, tileSize);
    }
  }

  private drawQuarterCircle(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, tileSize: number): void {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      }
    }
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.FISH:
        return 0.5; // 50% chance for fish in rivers (reduced by 50%)
      default:
        return 0;
    }
  }

  public getDescription(): string {
    return `${this.name}: Fresh flowing water that provides fish and supports nearby agriculture. ` +
           `Food +${this.foodYield}, Production +${this.productionYield}, Trade +${this.tradeYield}`;
  }
}
