import { UnitType } from '../types/game';

/**
 * Unit sprite management system for handling unit graphics with player-specific recoloring.
 * Similar to TerrainSprites but focused on units that need player color customization.
 */
export class UnitSprites {
  private static spriteCache = new Map<string, HTMLCanvasElement>();
  private static baseImages = new Map<UnitType, HTMLImageElement>();
  private static imageLoadPromises = new Map<UnitType, Promise<HTMLImageElement>>();

  /**
   * Get a cached unit sprite (synchronous)
   */
  public static getCachedSprite(
    unitType: UnitType, 
    playerColor: string, 
    tileSize: number
  ): HTMLCanvasElement | null {
    const cacheKey = `${unitType}-${playerColor}-${tileSize}`;
    return this.spriteCache.get(cacheKey) || null;
  }

  /**
   * Get a unit sprite with player-specific coloring
   */
  public static async getUnitSprite(
    unitType: UnitType, 
    playerColor: string, 
    tileSize: number
  ): Promise<HTMLCanvasElement | null> {
    const cacheKey = `${unitType}-${playerColor}-${tileSize}`;
    
    // Check cache first
    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey)!;
    }

    try {
      // Load base image if not already loaded
      const baseImage = await this.loadBaseImage(unitType);
      if (!baseImage) {
        return null;
      }

      // Create recolored sprite
      const sprite = this.createRecoloredSprite(baseImage, playerColor, tileSize);
      
      // Cache the result
      this.spriteCache.set(cacheKey, sprite);
      
      return sprite;
    } catch (error) {
      console.warn(`Failed to create sprite for unit ${unitType}:`, error);
      return null;
    }
  }

  /**
   * Start loading a sprite asynchronously (fire and forget)
   */
  public static loadSpriteAsync(
    unitType: UnitType, 
    playerColor: string, 
    tileSize: number
  ): void {
    this.getUnitSprite(unitType, playerColor, tileSize).catch(error => {
      console.warn(`Background sprite loading failed for ${unitType}:`, error);
    });
  }

  /**
   * Load the base image for a unit type
   */
  private static async loadBaseImage(unitType: UnitType): Promise<HTMLImageElement | null> {
    // Check if already loaded
    if (this.baseImages.has(unitType)) {
      return this.baseImages.get(unitType)!;
    }

    // Check if loading is in progress
    if (this.imageLoadPromises.has(unitType)) {
      return await this.imageLoadPromises.get(unitType)!;
    }

    // Start loading
    const loadPromise = this.loadImage(unitType);
    this.imageLoadPromises.set(unitType, loadPromise);

    try {
      const image = await loadPromise;
      this.baseImages.set(unitType, image);
      this.imageLoadPromises.delete(unitType);
      return image;
    } catch (error) {
      this.imageLoadPromises.delete(unitType);
      console.warn(`Failed to load image for unit ${unitType}:`, error);
      return null;
    }
  }

  /**
   * Load an image from the assets folder
   */
  private static loadImage(unitType: UnitType): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image for ${unitType}`));
      
      // Map unit types to image file names
      const imagePath = this.getImagePath(unitType);
      img.src = imagePath;
    });
  }

  /**
   * Get the image path for a unit type
   */
  private static getImagePath(unitType: UnitType): string {
    // For now, only settler has a custom sprite
    // Other units will use the default geometric rendering
    switch (unitType) {
      case UnitType.SETTLER:
        return '/src/assets/settler.png';
      default:
        throw new Error(`No sprite available for unit type ${unitType}`);
    }
  }

  /**
   * Create a recolored version of the base sprite
   */
  private static createRecoloredSprite(
    baseImage: HTMLImageElement, 
    playerColor: string, 
    tileSize: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;

    // Draw the base image scaled to tile size
    ctx.drawImage(baseImage, 0, 0, tileSize, tileSize);

    // Get image data for color manipulation
    const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
    const data = imageData.data;

    // Parse player color (hex format like "#FF0000")
    const playerRGB = this.hexToRgb(playerColor);
    if (!playerRGB) {
      console.warn(`Invalid player color: ${playerColor}`);
      return canvas; // Return original if color parsing fails
    }

    // Recolor the background/clothing areas
    // We'll look for specific color ranges that represent the "recolorable" areas
    // This assumes the settler sprite has a specific background color that we want to replace
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a === 0) continue;

      // Check if this pixel should be recolored
      // We'll look for blue-ish background colors (common in Civ sprites)
      // This can be adjusted based on the actual settler sprite colors
      if (this.shouldRecolorPixel(r, g, b)) {
        // Replace with player color, maintaining some variation for shading
        const intensity = (r + g + b) / 3 / 255; // Get brightness 0-1
        
        data[i] = Math.floor(playerRGB.r * intensity);     // Red
        data[i + 1] = Math.floor(playerRGB.g * intensity); // Green
        data[i + 2] = Math.floor(playerRGB.b * intensity); // Blue
        // Alpha remains the same
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  /**
   * Determine if a pixel should be recolored based on its RGB values
   */
  private static shouldRecolorPixel(r: number, g: number, b: number): boolean {
    // Look for blue-ish background colors that are common in unit sprites
    // This targets colors that are predominantly blue or blue-gray
    
    // Check if it's a blue-ish color (blue component is highest)
    const isBlueish = b > r && b > g && b > 100;
    
    // Check if it's a blue-gray color (balanced but with blue tint)
    const isBlueGray = Math.abs(r - g) < 30 && b > r + 20 && b > g + 20;
    
    // Check for light blue colors (high blue with moderate red/green)
    const isLightBlue = b > 150 && r < b - 30 && g < b - 30;
    
    return isBlueish || isBlueGray || isLightBlue;
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Check if a unit type has a custom sprite available
   */
  public static hasCustomSprite(unitType: UnitType): boolean {
    try {
      this.getImagePath(unitType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear sprite cache (useful for memory management or when tile size changes)
   */
  public static clearCache(): void {
    this.spriteCache.clear();
  }

  /**
   * Preload sprites for common unit types and player colors
   */
  public static async preloadSprites(
    unitTypes: UnitType[], 
    playerColors: string[], 
    tileSize: number
  ): Promise<void> {
    const promises: Promise<HTMLCanvasElement | null>[] = [];
    
    for (const unitType of unitTypes) {
      if (this.hasCustomSprite(unitType)) {
        for (const color of playerColors) {
          promises.push(this.getUnitSprite(unitType, color, tileSize));
        }
      }
    }
    
    await Promise.all(promises);
    console.log(`Preloaded ${promises.length} unit sprites`);
  }
}
