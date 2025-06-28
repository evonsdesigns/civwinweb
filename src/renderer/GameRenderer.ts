import { GameState, Tile, Unit, City, TerrainType } from '../types/game';
import { Renderer } from './Renderer';
import { TerrainManager } from '../terrain/index';
import { ConnectionMask, ConnectionPattern } from '../types/terrain';

export class GameRenderer {
  private renderer: Renderer;
  private selectedTile: { x: number, y: number } | null = null;
  private selectedUnit: Unit | null = null;
  private currentWorldMap: Tile[][] = []; // Cache the world map for connection analysis
  private readonly tileSize = 48; // Fixed tile size for terrain sprites

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  // Render the entire game state
  public render(gameState: GameState): void {
    this.renderer.clear();
    if (gameState.worldMap.length === 0) {
      console.error('No world map data to render');
      return;
    };

    // Cache the world map for connection analysis
    this.currentWorldMap = gameState.worldMap;

    // Render map tiles
    this.renderMap(gameState.worldMap);
    
    // Render cities
    this.renderCities(gameState.cities);
    
    // Render units
    this.renderUnits(gameState.units);
    
    // Render grid overlay
    this.renderGrid();
    
    // Render selections
    this.renderSelections();
  }

  // Analyze connections for a tile at given coordinates
  private analyzeConnections(x: number, y: number, terrain: TerrainType): ConnectionPattern {
    let connections = 0;
    const mapWidth = this.currentWorldMap[0]?.length || 80;
    const mapHeight = this.currentWorldMap.length || 50;
    
    // Check all 8 directions
    const directions = [
      { dx: 0, dy: -1, mask: ConnectionMask.NORTH },
      { dx: 1, dy: -1, mask: ConnectionMask.NORTHEAST },
      { dx: 1, dy: 0, mask: ConnectionMask.EAST },
      { dx: 1, dy: 1, mask: ConnectionMask.SOUTHEAST },
      { dx: 0, dy: 1, mask: ConnectionMask.SOUTH },
      { dx: -1, dy: 1, mask: ConnectionMask.SOUTHWEST },
      { dx: -1, dy: 0, mask: ConnectionMask.WEST },
      { dx: -1, dy: -1, mask: ConnectionMask.NORTHWEST }
    ];

    for (const dir of directions) {
      let checkX = x + dir.dx;
      const checkY = y + dir.dy;
      
      // Handle horizontal wrapping
      checkX = ((checkX % mapWidth) + mapWidth) % mapWidth;
      
      // Check vertical bounds (no wrapping)
      if (checkY >= 0 && checkY < mapHeight) {
        const adjacentTerrain = this.currentWorldMap[checkY][checkX].terrain;
        
        // Check if the adjacent tile has the same terrain type
        if (adjacentTerrain === terrain) {
          connections |= dir.mask;
        }
      }
    }
    
    return connections;
  }

  // Render the map tiles
  private renderMap(worldMap: Tile[][]): void {
    console.debug('Rendering world map', worldMap);
    const visibleRange = this.renderer.getVisibleTileRange();
    console.debug('Visible tile range:', visibleRange);
    const mapWidth = worldMap[0]?.length || 80;
    const mapHeight = worldMap.length || 50;
    
    console.debug(`renderMap: visibleRange=${JSON.stringify(visibleRange)}, mapSize=${mapWidth}x${mapHeight}`);
    
    for (let y = visibleRange.startY; y < visibleRange.endY && y < mapHeight; y++) {
      if (y >= 0) {
        for (let x = visibleRange.startX; x < visibleRange.endX; x++) {
          const wrappedX = ((x % mapWidth) + mapWidth) % mapWidth;
          
          if (wrappedX >= 0 && wrappedX < mapWidth) {
            this.renderTileWithConnections(worldMap[y][wrappedX], x, y);
            console.debug('rendered tile at', x, y);
          }
        }
      }
    }
  }

  // Render a single tile with connection analysis
  private renderTileWithConnections(tile: Tile, screenX: number, screenY: number): void {
    const screenPos = this.renderer.worldToScreen(screenX, screenY);
    const renderContext = this.renderer.getRenderContext();
    const tileSize = renderContext.tileSize; // Fixed tile size, no zoom
    
    console.debug(`Rendering tile at world(${tile.position.x},${tile.position.y}) screen(${screenX},${screenY}) screenPos(${screenPos.x},${screenPos.y}) terrain:${tile.terrain}`);
    
    // Analyze connections for terrain types that benefit from it
    const shouldUseConnections = TerrainManager.shouldUseConnections(tile.terrain);
    let connections = 0;
    
    if (shouldUseConnections) {
      connections = this.analyzeConnections(tile.position.x, tile.position.y, tile.terrain);
    }
    
    // Render terrain using sprites with connection information
    const terrainSprite = TerrainManager.getTerrainSprite(tile.terrain, tileSize, connections);
    if (terrainSprite) {
      console.debug(`Drawing sprite for ${tile.terrain} at (${screenPos.x},${screenPos.y}) sprite=${terrainSprite.width}x${terrainSprite.height} drawing=${tileSize}x${tileSize}`);
      this.renderer.drawSprite(terrainSprite, screenPos.x, screenPos.y, tileSize, tileSize);
    } else {
      // Fallback to solid color if sprite not available
      console.debug(`Using fallback color for ${tile.terrain} at (${screenPos.x},${screenPos.y})`);
      const terrainColor = TerrainManager.getTerrainColor(tile.terrain);
      this.renderer.fillRect(screenPos.x, screenPos.y, tileSize, tileSize, terrainColor);
    }
    
    // Render resources
    if (tile.resources && tile.resources.length > 0) {
      const resourceColor = TerrainManager.getResourceColor(tile.resources[0]);
      this.renderer.fillCircle(
        screenPos.x + tileSize / 2, 
        screenPos.y + tileSize / 2, 
        tileSize / 5, // Increased from /6 to /5 for better visibility
        resourceColor
      );
    }

    // Render improvements
    if (tile.improvements && tile.improvements.length > 0) {
      this.renderer.strokeRect(
        screenPos.x + 2, 
        screenPos.y + 2, 
        tileSize - 4, 
        tileSize - 4, 
        '#000000', 
        2
      );
    }
  }

  // Render all cities
  private renderCities(cities: City[]): void {
    cities.forEach(city => this.renderCity(city));
  }

  // Render a single city
  private renderCity(city: City): void {
    const screenPos = this.renderer.worldToScreen(city.position.x, city.position.y);
    const renderContext = this.renderer.getRenderContext();
    const tileSize = renderContext.tileSize; // Fixed tile size, no zoom
    
    // City building icon
    this.renderer.fillRect(
      screenPos.x + tileSize / 4, 
      screenPos.y + tileSize / 4, 
      tileSize / 2, 
      tileSize / 2, 
      '#8D6E63'
    );
    
    // City name and population (always show since zoom is disabled)
    this.renderer.drawText(
      `${city.name} (${city.population})`,
      screenPos.x,
      screenPos.y - 5,
      '#000000',
      '12px Arial' // Increased from 10px for better visibility
    );
  }

  // Render all units
  private renderUnits(units: Unit[]): void {
    units.forEach(unit => this.renderUnit(unit));
  }

  // Render a single unit
  private renderUnit(unit: Unit): void {
    const screenPos = this.renderer.worldToScreen(unit.position.x, unit.position.y);
    const renderContext = this.renderer.getRenderContext();
    const tileSize = renderContext.tileSize; // Fixed tile size, no zoom
    
    // Unit icon - different colors for different types
    let unitColor = '#FF5722'; // Default orange
    switch (unit.type) {
      case 'settler': unitColor = '#4CAF50'; break;
      case 'warrior': unitColor = '#F44336'; break;
      case 'scout': unitColor = '#2196F3'; break;
      case 'archer': unitColor = '#9C27B0'; break;
    }
    
    // Unit body
    this.renderer.fillCircle(
      screenPos.x + tileSize / 2, 
      screenPos.y + tileSize / 2, 
      tileSize / 3.5, // Increased from /4 to /3.5 for better visibility
      unitColor
    );
    
    // Selection indicator
    if (this.selectedUnit && this.selectedUnit.id === unit.id) {
      this.renderer.strokeRect(
        screenPos.x, 
        screenPos.y, 
        tileSize, 
        tileSize, 
        '#FFEB3B', 
        3
      );
    }
    
    // Health bar
    if (unit.health < unit.maxHealth) {
      const healthBarWidth = tileSize * 0.8;
      const healthBarHeight = 4;
      const healthPercentage = unit.health / unit.maxHealth;
      
      // Background
      this.renderer.fillRect(
        screenPos.x + (tileSize - healthBarWidth) / 2,
        screenPos.y + tileSize - healthBarHeight - 2,
        healthBarWidth,
        healthBarHeight,
        '#000000'
      );
      
      // Health
      this.renderer.fillRect(
        screenPos.x + (tileSize - healthBarWidth) / 2,
        screenPos.y + tileSize - healthBarHeight - 2,
        healthBarWidth * healthPercentage,
        healthBarHeight,
        '#4CAF50'
      );
    }
    
    // Movement points indicator (always show since zoom is disabled)
    this.renderer.drawText(
      unit.movementPoints.toString(),
      screenPos.x + 2,
      screenPos.y + 14, // Adjusted position for larger tiles
      '#FFFFFF',
      '12px Arial' // Increased from 10px for better visibility
    );
  }

  // Render selection indicators
  private renderSelections(): void {
    if (this.selectedTile) {
      const screenPos = this.renderer.worldToScreen(this.selectedTile.x, this.selectedTile.y);
      const renderContext = this.renderer.getRenderContext();
      const tileSize = renderContext.tileSize; // Fixed tile size, no zoom
      
      this.renderer.strokeRect(
        screenPos.x, 
        screenPos.y, 
        tileSize, 
        tileSize, 
        '#FFFFFF', 
        2
      );
    }
  }

  // Render grid overlay
  private renderGrid(): void {
    const renderContext = this.renderer.getRenderContext();
    // Always show grid since zoom is disabled
    
    const visibleRange = this.renderer.getVisibleTileRange();
    const tileSize = renderContext.tileSize; // Fixed tile size, no zoom
    
    // Vertical lines
    for (let x = visibleRange.startX; x <= visibleRange.endX; x++) {
      const screenX = (x - renderContext.viewport.x) * tileSize;
      this.renderer.drawLine(
        screenX, 
        0, 
        screenX, 
        renderContext.canvas.height, 
        'rgba(0, 0, 0, 0.1)', 
        1
      );
    }
    
    // Horizontal lines
    for (let y = visibleRange.startY; y <= visibleRange.endY; y++) {
      const screenY = (y - renderContext.viewport.y) * tileSize;
      this.renderer.drawLine(
        0, 
        screenY, 
        renderContext.canvas.width, 
        screenY, 
        'rgba(0, 0, 0, 0.1)', 
        1
      );
    }
  }

  // Handle tile selection
  public selectTile(x: number, y: number): void {
    this.selectedTile = { x, y };
  }

  // Handle unit selection
  public selectUnit(unit: Unit): void {
    this.selectedUnit = unit;
  }

  // Clear selections
  public clearSelections(): void {
    this.selectedTile = null;
    this.selectedUnit = null;
  }

  // Get selected tile
  public getSelectedTile(): { x: number, y: number } | null {
    return this.selectedTile;
  }

  // Get selected unit
  public getSelectedUnit(): Unit | null {
    return this.selectedUnit;
  }
}
