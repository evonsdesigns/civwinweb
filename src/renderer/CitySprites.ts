import { City } from '../types/game.js';

/**
 * City sprite management system for handling city graphics with player-specific recoloring.
 * Creates simple single-block city structures that match the player's color.
 */
export class CitySprites {
  private static spriteCache = new Map<string, HTMLCanvasElement>();

  /**
   * Get a cached city sprite (synchronous)
   */
  public static getCachedSprite(
    playerColor: string, 
    tileSize: number
  ): HTMLCanvasElement | null {
    const cacheKey = `city-${playerColor}-${tileSize}`;
    return this.spriteCache.get(cacheKey) || null;
  }

  /**
   * Get a city sprite with player-specific coloring
   */
  public static getCitySprite(
    playerColor: string, 
    tileSize: number
  ): HTMLCanvasElement {
    const cacheKey = `city-${playerColor}-${tileSize}`;
    
    // Check cache first
    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey)!;
    }

    // Create new sprite
    const sprite = this.createCitySprite(playerColor, tileSize);
    
    // Cache the result
    this.spriteCache.set(cacheKey, sprite);
    return sprite;
  }

  /**
   * Create a single block city sprite with player color
   */
  private static createCitySprite(
    playerColor: string, 
    tileSize: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Parse player color
    const color = this.parsePlayerColor(playerColor);
    if (!color) {
      console.warn(`Invalid player color: ${playerColor}`);
      return canvas;
    }

    // Calculate city block dimensions - fill the entire tile
    const blockSize = tileSize;
    
    // Start at tile origin
    const startX = 0;
    const startY = 0;

    // Create single block city
    this.drawCityBlock(ctx, startX, startY, blockSize, color);

    return canvas;
  }

  /**
   * Draw a single city block
   */
  private static drawCityBlock(
    ctx: CanvasRenderingContext2D, 
    startX: number, 
    startY: number, 
    blockSize: number, 
    color: { r: number; g: number; b: number }
  ): void {
    // Create color variations
    const baseColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const highlightColor = `rgb(${Math.min(255, color.r + 30)}, ${Math.min(255, color.g + 30)}, ${Math.min(255, color.b + 30)})`;
    const shadowColor = `rgb(${Math.floor(color.r * 0.7)}, ${Math.floor(color.g * 0.7)}, ${Math.floor(color.b * 0.7)})`;
    const darkShadowColor = `rgb(${Math.floor(color.r * 0.5)}, ${Math.floor(color.g * 0.5)}, ${Math.floor(color.b * 0.5)})`;

    // Draw main city block
    ctx.fillStyle = baseColor;
    ctx.fillRect(startX, startY, blockSize, blockSize);

    // Add 3D effect with highlights and shadows
    const borderSize = Math.max(1, Math.floor(blockSize * 0.1));
    
    // Top and left highlights
    ctx.fillStyle = highlightColor;
    ctx.fillRect(startX, startY, blockSize, borderSize); // Top
    ctx.fillRect(startX, startY, borderSize, blockSize); // Left

    // Bottom and right shadows
    ctx.fillStyle = shadowColor;
    ctx.fillRect(startX, startY + blockSize - borderSize, blockSize, borderSize); // Bottom
    ctx.fillRect(startX + blockSize - borderSize, startY, borderSize, blockSize); // Right

    // Add prominent black border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, blockSize, blockSize);

    // Add simple detail in the center (like a building or monument)
    if (blockSize >= 12) {
      const detailSize = Math.floor(blockSize * 0.3);
      const detailX = startX + Math.floor((blockSize - detailSize) / 2);
      const detailY = startY + Math.floor((blockSize - detailSize) / 2);
      
      // Central structure
      ctx.fillStyle = highlightColor;
      ctx.fillRect(detailX, detailY, detailSize, detailSize);
      
      // Add small shadow to the detail
      ctx.fillStyle = shadowColor;
      ctx.fillRect(detailX + detailSize - 1, detailY + 2, 1, detailSize - 2);
      ctx.fillRect(detailX + 2, detailY + detailSize - 1, detailSize - 2, 1);
    }
  }

  /**
   * Parse player color string to RGB
   */
  private static parsePlayerColor(colorStr: string): { r: number; g: number; b: number } | null {
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substr(0, 2), 16),
          g: parseInt(hex.substr(2, 2), 16),
          b: parseInt(hex.substr(4, 2), 16)
        };
      }
    }

    // Handle named colors (basic set)
    const namedColors: { [key: string]: { r: number; g: number; b: number } } = {
      'red': { r: 255, g: 0, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'green': { r: 0, g: 255, b: 0 },
      'yellow': { r: 255, g: 255, b: 0 },
      'purple': { r: 128, g: 0, b: 128 },
      'orange': { r: 255, g: 165, b: 0 },
      'cyan': { r: 0, g: 255, b: 255 },
      'pink': { r: 255, g: 192, b: 203 }
    };

    return namedColors[colorStr.toLowerCase()] || null;
  }

  /**
   * Clear sprite cache (useful for memory management or when tile size changes)
   */
  public static clearCache(): void {
    this.spriteCache.clear();
  }

  /**
   * Preload city sprites for all player colors
   */
  public static async preloadSprites(
    playerColors: string[], 
    tileSize: number
  ): Promise<void> {
    for (const color of playerColors) {
      this.getCitySprite(color, tileSize);
    }
    console.log(`Preloaded ${playerColors.length} city sprites`);
  }
}
