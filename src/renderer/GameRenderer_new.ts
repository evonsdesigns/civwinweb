import { GameState, Tile, Unit, City, TerrainType, UnitType, UnitCategory } from '../types/game';
import { Renderer } from './Renderer';
import { TerrainManager } from '../terrain/index';
import { ConnectionMask, ConnectionPattern } from '../types/terrain';
import { getUnitStats } from '../game/UnitDefinitions';

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
      { dx: -1, dy: -1, mask: ConnectionMask.NORTHWEST },
      { dx: 0, dy: -1, mask: ConnectionMask.NORTH },
      { dx: 1, dy: -1, mask: ConnectionMask.NORTHEAST },
      { dx: -1, dy: 0, mask: ConnectionMask.WEST },
      { dx: 1, dy: 0, mask: ConnectionMask.EAST },
      { dx: -1, dy: 1, mask: ConnectionMask.SOUTHWEST },
      { dx: 0, dy: 1, mask: ConnectionMask.SOUTH },
      { dx: 1, dy: 1, mask: ConnectionMask.SOUTHEAST }
    ];

    for (const dir of directions) {
      let checkX = x + dir.dx;
      let checkY = y + dir.dy;
      
      // Handle horizontal wrapping
      checkX = ((checkX % mapWidth) + mapWidth) % mapWidth;
      
      // Check bounds for Y (no vertical wrapping)
      if (checkY >= 0 && checkY < mapHeight) {
        const neighborTile = this.currentWorldMap[checkY][checkX];
        if (neighborTile && neighborTile.terrain === terrain) {
          connections |= dir.mask;
        }
      }
    }

    return connections as ConnectionPattern;
  }

  // Render the map
  private renderMap(worldMap: Tile[][]): void {
    const renderContext = this.renderer.getRenderContext();
    const mapWidth = worldMap[0]?.length || 80;
    const mapHeight = worldMap.length || 50;
    
    // Calculate visible range with some padding for smooth scrolling
    const tilesWidth = Math.ceil(renderContext.canvas.width / this.tileSize) + 2;
    const tilesHeight = Math.ceil(renderContext.canvas.height / this.tileSize) + 2;
    
    const startX = Math.floor(renderContext.viewport.x) - 1;
    const endX = startX + tilesWidth;
    const startY = Math.max(0, Math.floor(renderContext.viewport.y) - 1);
    const endY = Math.min(mapHeight - 1, startY + tilesHeight);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Handle horizontal wrapping
        const wrappedX = ((x % mapWidth) + mapWidth) % mapWidth;
        
        if (y >= 0 && y < mapHeight) {
          const tile = worldMap[y][wrappedX];
          const connectionPattern = this.analyzeConnections(wrappedX, y, tile.terrain);
          this.renderTile(tile, x, y, connectionPattern);
        }
      }
    }
  }

  // Render a single tile
  private renderTile(tile: Tile, x: number, y: number, connectionPattern: ConnectionPattern): void {
    const screenPos = this.renderer.worldToScreen(x, y);
    
    const terrainSprite = TerrainManager.getTerrainTexture(
      tile.terrain, 
      connectionPattern, 
      this.tileSize
    );
    
    if (terrainSprite) {
      this.renderer.drawImage(
        terrainSprite,
        screenPos.x,
        screenPos.y,
        this.tileSize,
        this.tileSize
      );
    } else {
      // Fallback to colored rectangle if sprite not available
      const color = this.getTerrainColor(tile.terrain);
      this.renderer.fillRect(
        screenPos.x,
        screenPos.y,
        this.tileSize,
        this.tileSize,
        color
      );
    }
  }

  // Get fallback color for terrain
  private getTerrainColor(terrain: TerrainType): string {
    switch (terrain) {
      case TerrainType.GRASSLAND: return '#90EE90';
      case TerrainType.DESERT: return '#F4A460';
      case TerrainType.FOREST: return '#228B22';
      case TerrainType.HILLS: return '#8B7355';
      case TerrainType.MOUNTAINS: return '#696969';
      case TerrainType.OCEAN: return '#4682B4';
      case TerrainType.RIVER: return '#87CEEB';
      case TerrainType.JUNGLE: return '#006400';
      default: return '#D2691E';
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
    const tileSize = renderContext.tileSize;
    
    // City icon
    this.renderer.fillRect(
      screenPos.x + tileSize / 4,
      screenPos.y + tileSize / 4,
      tileSize / 2,
      tileSize / 2,
      '#8B4513'
    );
    
    // City name
    this.renderer.fillText(
      city.name,
      screenPos.x + tileSize / 2,
      screenPos.y - 5,
      '#FFFFFF',
      '12px Arial',
      'center'
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
    const tileSize = renderContext.tileSize;
    
    // Get unit stats to determine category and rendering
    const stats = getUnitStats(unit.type);
    const unitColor = this.getUnitColor(unit.type, stats.category);
    const unitSymbol = this.getUnitSymbol(unit.type);
    
    // Unit body - different shapes for different categories
    this.renderUnitBody(screenPos, tileSize, stats.category, unitColor);
    
    // Unit symbol/text
    this.renderUnitSymbol(screenPos, tileSize, unitSymbol);
    
    // Veteran indicator
    if (unit.isVeteran) {
      this.renderVeteranIndicator(screenPos, tileSize);
    }
    
    // Fortification indicator
    if (unit.fortified) {
      this.renderFortificationIndicator(screenPos, tileSize);
    }
    
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
      this.renderHealthBar(screenPos, tileSize, unit.health, unit.maxHealth);
    }
    
    // Movement points indicator
    this.renderer.fillText(
      unit.movementPoints.toString(),
      screenPos.x + 2,
      screenPos.y + 14,
      '#FFFFFF',
      '12px Arial'
    );
  }

  // Get color for unit type
  private getUnitColor(unitType: UnitType, category: UnitCategory): string {
    switch (category) {
      case UnitCategory.LAND:
        switch (unitType) {
          case UnitType.MILITIA: return '#8D6E63';
          case UnitType.PHALANX: return '#795548';
          case UnitType.LEGION: return '#D32F2F';
          case UnitType.CAVALRY: return '#F57C00';
          case UnitType.CHARIOT: return '#FF9800';
          case UnitType.KNIGHTS: return '#9C27B0';
          case UnitType.MUSKETEERS: return '#303F9F';
          case UnitType.RIFLEMEN: return '#1976D2';
          case UnitType.CANNON: return '#424242';
          case UnitType.CATAPULT: return '#6D4C41';
          case UnitType.ARTILLERY: return '#37474F';
          case UnitType.ARMOR: return '#388E3C';
          case UnitType.MECHANIZED_INFANTRY: return '#689F38';
          // Legacy units
          case UnitType.WARRIOR: return '#F44336';
          case UnitType.ARCHER: return '#9C27B0';
          case UnitType.SPEARMAN: return '#795548';
          default: return '#FF5722';
        }
      case UnitCategory.NAVAL:
        return '#2196F3';
      case UnitCategory.AIR:
        return '#E91E63';
      case UnitCategory.SPECIAL:
        switch (unitType) {
          case UnitType.SETTLER: return '#4CAF50';
          case UnitType.DIPLOMAT: return '#9E9E9E';
          case UnitType.CARAVAN: return '#FF9800';
          case UnitType.NUCLEAR: return '#FF1744';
          case UnitType.SCOUT: return '#2196F3';
          default: return '#4CAF50';
        }
      default:
        return '#FF5722';
    }
  }

  // Get symbol for unit type  
  private getUnitSymbol(unitType: UnitType): string {
    switch (unitType) {
      case UnitType.SETTLER: return 'S';
      case UnitType.DIPLOMAT: return 'D';
      case UnitType.CARAVAN: return 'C';
      case UnitType.MILITIA: return 'M';
      case UnitType.PHALANX: return 'P';
      case UnitType.LEGION: return 'L';
      case UnitType.CAVALRY: return 'Cv';
      case UnitType.CHARIOT: return 'Ch';
      case UnitType.KNIGHTS: return 'K';
      case UnitType.MUSKETEERS: return 'Ms';
      case UnitType.RIFLEMEN: return 'R';
      case UnitType.CANNON: return 'Cn';
      case UnitType.CATAPULT: return 'Ct';
      case UnitType.ARTILLERY: return 'A';
      case UnitType.ARMOR: return 'Ar';
      case UnitType.MECHANIZED_INFANTRY: return 'MI';
      case UnitType.TRIREME: return 'Tr';
      case UnitType.SAIL: return 'Sa';
      case UnitType.FRIGATE: return 'F';
      case UnitType.IRONCLAD: return 'I';
      case UnitType.CRUISER: return 'Cr';
      case UnitType.BATTLESHIP: return 'B';
      case UnitType.CARRIER: return 'CV';
      case UnitType.TRANSPORT: return 'T';
      case UnitType.SUBMARINE: return 'Sub';
      case UnitType.FIGHTER: return 'Fi';
      case UnitType.BOMBER: return 'Bo';
      case UnitType.NUCLEAR: return 'N';
      // Legacy units
      case UnitType.WARRIOR: return 'W';
      case UnitType.SCOUT: return 'Sc';
      case UnitType.ARCHER: return 'Ar';
      case UnitType.SPEARMAN: return 'Sp';
      default: return 'U';
    }
  }

  // Render unit body based on category
  private renderUnitBody(screenPos: {x: number, y: number}, tileSize: number, category: UnitCategory, color: string): void {
    const centerX = screenPos.x + tileSize / 2;
    const centerY = screenPos.y + tileSize / 2;
    const size = tileSize / 3.5;

    switch (category) {
      case UnitCategory.LAND:
        // Circle for land units
        this.renderer.fillCircle(centerX, centerY, size, color);
        break;
      case UnitCategory.NAVAL:
        // Rectangle for naval units
        this.renderer.fillRect(
          centerX - size, 
          centerY - size/2, 
          size * 2, 
          size, 
          color
        );
        break;
      case UnitCategory.AIR:
        // Triangle for air units
        this.renderer.fillTriangle(
          centerX, centerY - size,
          centerX - size, centerY + size/2,
          centerX + size, centerY + size/2,
          color
        );
        break;
      case UnitCategory.SPECIAL:
        // Diamond for special units
        this.renderer.fillDiamond(centerX, centerY, size, color);
        break;
    }
  }

  // Render unit symbol/text
  private renderUnitSymbol(screenPos: {x: number, y: number}, tileSize: number, symbol: string): void {
    const centerX = screenPos.x + tileSize / 2;
    const centerY = screenPos.y + tileSize / 2;
    
    this.renderer.fillText(
      symbol,
      centerX,
      centerY + 2,
      'white',
      `${Math.floor(tileSize / 8)}px Arial`,
      'center'
    );
  }

  // Render veteran indicator (star)
  private renderVeteranIndicator(screenPos: {x: number, y: number}, tileSize: number): void {
    this.renderer.fillText(
      '★',
      screenPos.x + tileSize - 6,
      screenPos.y + 8,
      '#FFD700',
      '8px Arial',
      'center'
    );
  }

  // Render fortification indicator
  private renderFortificationIndicator(screenPos: {x: number, y: number}, tileSize: number): void {
    this.renderer.strokeRect(
      screenPos.x + 2,
      screenPos.y + 2,
      tileSize - 4,
      tileSize - 4,
      '#8BC34A',
      2
    );
  }

  // Render health bar
  private renderHealthBar(screenPos: {x: number, y: number}, tileSize: number, health: number, maxHealth: number): void {
    const healthBarWidth = tileSize * 0.8;
    const healthBarHeight = 4;
    const healthPercentage = health / maxHealth;
    
    // Background
    this.renderer.fillRect(
      screenPos.x + (tileSize - healthBarWidth) / 2,
      screenPos.y + tileSize - healthBarHeight - 2,
      healthBarWidth,
      healthBarHeight,
      '#FF0000'
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

  // Render selection indicators
  private renderSelections(): void {
    if (this.selectedTile) {
      const screenPos = this.renderer.worldToScreen(this.selectedTile.x, this.selectedTile.y);
      const renderContext = this.renderer.getRenderContext();
      const tileSize = renderContext.tileSize;
      
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
    const visibleRange = this.renderer.getVisibleTileRange();
    const tileSize = renderContext.tileSize;
    
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
