import { City } from '../types/game.js';

/**
 * City sprite management system for handling city graphics with player-specific recoloring.
 * Creates grid-like building structures that match the player's color.
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
   * Create a grid-like city sprite with player color
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

    // Calculate grid dimensions
    const padding = Math.max(2, Math.floor(tileSize * 0.1));
    const citySize = tileSize - (padding * 2);
    const cellSize = Math.max(2, Math.floor(citySize / 6)); // 6x6 grid approximately
    const gridSize = cellSize * 6;
    
    // Center the grid
    const startX = padding + Math.floor((citySize - gridSize) / 2);
    const startY = padding + Math.floor((citySize - gridSize) / 2);

    // Create building grid pattern similar to your image
    this.drawCityGrid(ctx, startX, startY, cellSize, color);

    return canvas;
  }

  /**
   * Draw the city grid pattern
   */
  private static drawCityGrid(
    ctx: CanvasRenderingContext2D, 
    startX: number, 
    startY: number, 
    cellSize: number, 
    color: { r: number; g: number; b: number }
  ): void {
    // Define which cells should be "buildings" (filled)
    // This creates a pattern similar to your green grid image
    const buildingPattern = [
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 0], // Street/road
      [0, 0, 0, 0, 0, 0], // Street/road
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1]
    ];

    // Base city color (slightly darker than player color)
    const baseColor = `rgb(${Math.floor(color.r * 0.8)}, ${Math.floor(color.g * 0.8)}, ${Math.floor(color.b * 0.8)})`;
    const buildingColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const highlightColor = `rgb(${Math.min(255, color.r + 40)}, ${Math.min(255, color.g + 40)}, ${Math.min(255, color.b + 40)})`;
    const shadowColor = `rgb(${Math.floor(color.r * 0.6)}, ${Math.floor(color.g * 0.6)}, ${Math.floor(color.b * 0.6)})`;

    // Draw background
    ctx.fillStyle = baseColor;
    ctx.fillRect(startX, startY, cellSize * 6, cellSize * 6);

    // Draw buildings and streets
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;

        if (buildingPattern[row][col] === 1) {
          // Draw building
          ctx.fillStyle = buildingColor;
          ctx.fillRect(x, y, cellSize, cellSize);

          // Add building details (windows/structure)
          if (cellSize >= 4) {
            // Add highlight on top-left
            ctx.fillStyle = highlightColor;
            ctx.fillRect(x, y, Math.max(1, Math.floor(cellSize / 3)), 1);
            ctx.fillRect(x, y, 1, Math.max(1, Math.floor(cellSize / 3)));

            // Add shadow on bottom-right
            ctx.fillStyle = shadowColor;
            ctx.fillRect(x + cellSize - 1, y + Math.floor(cellSize / 2), 1, Math.ceil(cellSize / 2));
            ctx.fillRect(x + Math.floor(cellSize / 2), y + cellSize - 1, Math.ceil(cellSize / 2), 1);

            // Add window details if cell is large enough
            if (cellSize >= 6) {
              ctx.fillStyle = shadowColor;
              const windowSize = Math.max(1, Math.floor(cellSize / 4));
              const windowX = x + Math.floor(cellSize / 2) - Math.floor(windowSize / 2);
              const windowY = y + Math.floor(cellSize / 2) - Math.floor(windowSize / 2);
              ctx.fillRect(windowX, windowY, windowSize, windowSize);
            }
          }
        } else {
          // Draw street/empty space
          const streetColor = `rgb(${Math.floor(color.r * 0.4)}, ${Math.floor(color.g * 0.4)}, ${Math.floor(color.b * 0.4)})`;
          ctx.fillStyle = streetColor;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Add border around the entire city
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, cellSize * 6, cellSize * 6);
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
