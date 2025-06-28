import { TerrainType, ResourceType } from '../types/game.js';
import { TerrainBase } from './TerrainBase.js';

/**
 * Desert terrain - harsh terrain with limited resources but potential for gold.
 * Higher movement cost and lower yields.
 */
export class DesertTerrain extends TerrainBase {
  constructor() {
    super(TerrainType.DESERT, {
      name: 'Desert',
      movementCost: 1,
      passable: true,
      color: '#fbbf24',
      possibleResources: [ResourceType.GOLD],
      foodYield: 0,
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

    // Base desert color
    this.fillRect(ctx, 0, 0, tileSize, tileSize, this.color);

    // Add sand dune texture
    ctx.fillStyle = '#f59e0b';
    for (let y = 0; y < tileSize; y += 4) {
      for (let x = 0; x < tileSize; x += 6) {
        const offset = (y / 4) % 2 === 0 ? 0 : 3;
        if (Math.random() < 0.5) {
          ctx.fillRect(x + offset, y, 3, 1);
        }
      }
    }

    // Add lighter sand highlights
    ctx.fillStyle = '#fcd34d';
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * tileSize);
      const y = Math.floor(Math.random() * tileSize);
      ctx.fillRect(x, y, 1, 1);
    }

    // Add some darker sand patches
    ctx.fillStyle = '#d97706';
    for (let y = 2; y < tileSize; y += 8) {
      for (let x = 2; x < tileSize; x += 10) {
        if (Math.random() < 0.3) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    return canvas;
  }

  public getResourceProbability(resource: ResourceType): number {
    switch (resource) {
      case ResourceType.GOLD:
        return 0.05;
      default:
        return 0;
    }
  }

  public getDescription(): string {
    return `${this.name}: Harsh terrain with potential for gold deposits. ` +
           `Food +${this.foodYield}, Production +${this.productionYield}, Trade +${this.tradeYield}`;
  }
}
