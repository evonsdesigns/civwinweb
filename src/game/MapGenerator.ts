import type { Tile, MapScenario } from '../types/game';
import { TerrainType } from '../types/game';
import { TerrainManager } from '../terrain/index';

export class MapGenerator {
  
  // Generate a map based on scenario
  public generateMap(width: number, height: number, scenario: MapScenario = 'random'): Tile[][] {
    console.log(`Generating ${scenario} map of size ${width}x${height}`);
    
    switch (scenario) {
      case 'earth':
        return this.generateEarthMap(width, height);
      case 'random':
      default:
        return this.generateRandomMap(width, height);
    }
  }

  // Generate a random world map (original implementation)
  private generateRandomMap(width: number, height: number): Tile[][] {
    const map: Tile[][] = [];

    // Initialize empty map
    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        map[y][x] = {
          position: { x, y },
          terrain: TerrainType.GRASSLAND,
          resources: [],
          improvements: []
        };
      }
    }

    // Generate terrain using simple noise
    this.generateTerrain(map, width, height);
    
    // Add resources
    this.addResources(map, width, height);

    return map;
  }

  // Generate Earth-like map
  private generateEarthMap(width: number, height: number): Tile[][] {
    const map: Tile[][] = [];

    // Initialize empty map with ocean
    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        map[y][x] = {
          position: { x, y },
          terrain: TerrainType.OCEAN,
          resources: [],
          improvements: []
        };
      }
    }

    // Generate Earth-like continents and terrain
    this.generateEarthTerrain(map, width, height);
    
    // Add resources
    this.addResources(map, width, height);

    return map;
  }

  // Generate terrain using clustered algorithm for connected regions
  private generateTerrain(map: Tile[][], width: number, height: number): void {
    // First, set base grassland
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        map[y][x].terrain = TerrainType.GRASSLAND;
      }
    }

    // Generate ocean around edges
    this.generateOceanBorders(map, width, height);
    
    // Generate connected mountain ranges
    this.generateMountainRanges(map, width, height);
    
    // Generate connected hill regions
    this.generateHillRegions(map, width, height);
    
    // Generate connected forest areas
    this.generateForestRegions(map, width, height);
    
    // Generate desert regions
    this.generateDesertRegions(map, width, height);
    
    // Add jungle patches
    this.generateJunglePatches(map, width, height);

    // Add some rivers
    this.addRivers(map, width, height);
  }

  // Generate ocean borders
  private generateOceanBorders(map: Tile[][], width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
        const oceanFactor = distanceFromCenter / maxDistance;

        // Ocean at edges with some variation
        if (oceanFactor > 0.8 || (oceanFactor > 0.7 && Math.random() < 0.5)) {
          map[y][x].terrain = TerrainType.OCEAN;
        }
      }
    }
  }

  // Generate connected mountain ranges
  private generateMountainRanges(map: Tile[][], width: number, height: number): void {
    const numRanges = Math.floor((width * height) / 800) + 2;
    
    for (let i = 0; i < numRanges; i++) {
      // Pick a random starting point away from ocean
      let startX, startY;
      let attempts = 0;
      do {
        startX = Math.floor(Math.random() * (width - 10)) + 5;
        startY = Math.floor(Math.random() * (height - 10)) + 5;
        attempts++;
      } while (map[startY][startX].terrain === TerrainType.OCEAN && attempts < 20);
      
      if (attempts < 20) {
        this.createMountainRange(map, startX, startY, width, height);
      }
    }
  }

  // Create a single mountain range
  private createMountainRange(map: Tile[][], startX: number, startY: number, width: number, height: number): void {
    const rangeLength = Math.floor(Math.random() * 8) + 4;
    let x = startX;
    let y = startY;
    let direction = Math.floor(Math.random() * 4); // 0=N, 1=E, 2=S, 3=W
    
    for (let i = 0; i < rangeLength; i++) {
      // Place mountain cluster at current position
      this.placeMountainCluster(map, x, y, width, height);
      
      // Move in the current direction with slight variations
      const directionChange = Math.random();
      if (directionChange < 0.1) {
        direction = (direction + 1) % 4; // Turn right
      } else if (directionChange < 0.2) {
        direction = (direction + 3) % 4; // Turn left
      }
      
      // Move in current direction
      switch (direction) {
        case 0: y--; break; // North
        case 1: x++; break; // East
        case 2: y++; break; // South
        case 3: x--; break; // West
      }
      
      // Stay within bounds
      x = Math.max(1, Math.min(width - 2, x));
      y = Math.max(1, Math.min(height - 2, y));
    }
  }

  // Place a cluster of mountains
  private placeMountainCluster(map: Tile[][], centerX: number, centerY: number, width: number, height: number): void {
    const clusterSize = Math.floor(Math.random() * 3) + 2;
    
    for (let dy = -clusterSize; dy <= clusterSize; dy++) {
      for (let dx = -clusterSize; dx <= clusterSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height && distance <= clusterSize) {
          if (map[y][x].terrain !== TerrainType.OCEAN) {
            const probability = 1 - (distance / clusterSize);
            if (Math.random() < probability * 0.8) {
              map[y][x].terrain = TerrainType.MOUNTAINS;
            }
          }
        }
      }
    }
  }

  // Generate connected hill regions
  private generateHillRegions(map: Tile[][], width: number, height: number): void {
    const numRegions = Math.floor((width * height) / 600) + 1;
    
    for (let i = 0; i < numRegions; i++) {
      let startX, startY;
      let attempts = 0;
      do {
        startX = Math.floor(Math.random() * (width - 6)) + 3;
        startY = Math.floor(Math.random() * (height - 6)) + 3;
        attempts++;
      } while ((map[startY][startX].terrain === TerrainType.OCEAN || 
                map[startY][startX].terrain === TerrainType.MOUNTAINS) && attempts < 20);
      
      if (attempts < 20) {
        this.createHillRegion(map, startX, startY, width, height);
      }
    }
  }

  // Create a connected hill region
  private createHillRegion(map: Tile[][], centerX: number, centerY: number, width: number, height: number): void {
    const regionSize = Math.floor(Math.random() * 4) + 3;
    
    for (let dy = -regionSize; dy <= regionSize; dy++) {
      for (let dx = -regionSize; dx <= regionSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height && distance <= regionSize) {
          if (map[y][x].terrain === TerrainType.GRASSLAND) {
            const probability = 1 - (distance / regionSize);
            if (Math.random() < probability * 0.6) {
              map[y][x].terrain = TerrainType.HILLS;
            }
          }
        }
      }
    }
  }

  // Generate connected forest regions
  private generateForestRegions(map: Tile[][], width: number, height: number): void {
    const numForests = Math.floor((width * height) / 400) + 2;
    
    for (let i = 0; i < numForests; i++) {
      let startX, startY;
      let attempts = 0;
      do {
        startX = Math.floor(Math.random() * (width - 8)) + 4;
        startY = Math.floor(Math.random() * (height - 8)) + 4;
        attempts++;
      } while ((map[startY][startX].terrain !== TerrainType.GRASSLAND && 
                map[startY][startX].terrain !== TerrainType.HILLS) && attempts < 20);
      
      if (attempts < 20) {
        this.createForestRegion(map, startX, startY, width, height);
      }
    }
  }

  // Create a connected forest region
  private createForestRegion(map: Tile[][], centerX: number, centerY: number, width: number, height: number): void {
    const forestSize = Math.floor(Math.random() * 5) + 4;
    
    for (let dy = -forestSize; dy <= forestSize; dy++) {
      for (let dx = -forestSize; dx <= forestSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height && distance <= forestSize) {
          if (map[y][x].terrain === TerrainType.GRASSLAND || map[y][x].terrain === TerrainType.HILLS) {
            const probability = 1 - (distance / forestSize);
            if (Math.random() < probability * 0.7) {
              map[y][x].terrain = TerrainType.FOREST;
            }
          }
        }
      }
    }
  }

  // Generate desert regions
  private generateDesertRegions(map: Tile[][], width: number, height: number): void {
    const numDeserts = Math.floor((width * height) / 1000) + 1;
    
    for (let i = 0; i < numDeserts; i++) {
      let startX, startY;
      let attempts = 0;
      do {
        startX = Math.floor(Math.random() * (width - 6)) + 3;
        startY = Math.floor(Math.random() * (height - 6)) + 3;
        attempts++;
      } while (map[startY][startX].terrain !== TerrainType.GRASSLAND && attempts < 20);
      
      if (attempts < 20) {
        this.createDesertRegion(map, startX, startY, width, height);
      }
    }
  }

  // Create a connected desert region
  private createDesertRegion(map: Tile[][], centerX: number, centerY: number, width: number, height: number): void {
    const desertSize = Math.floor(Math.random() * 4) + 3;
    
    for (let dy = -desertSize; dy <= desertSize; dy++) {
      for (let dx = -desertSize; dx <= desertSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height && distance <= desertSize) {
          if (map[y][x].terrain === TerrainType.GRASSLAND) {
            const probability = 1 - (distance / desertSize);
            if (Math.random() < probability * 0.8) {
              map[y][x].terrain = TerrainType.DESERT;
            }
          }
        }
      }
    }
  }

  // Generate jungle patches
  private generateJunglePatches(map: Tile[][], width: number, height: number): void {
    const numJungles = Math.floor((width * height) / 1200);
    
    for (let i = 0; i < numJungles; i++) {
      let startX, startY;
      let attempts = 0;
      do {
        startX = Math.floor(Math.random() * (width - 4)) + 2;
        startY = Math.floor(Math.random() * (height - 4)) + 2;
        attempts++;
      } while (map[startY][startX].terrain !== TerrainType.GRASSLAND && attempts < 20);
      
      if (attempts < 20) {
        this.createJunglePatch(map, startX, startY, width, height);
      }
    }
  }

  // Create a small jungle patch
  private createJunglePatch(map: Tile[][], centerX: number, centerY: number, width: number, height: number): void {
    const jungleSize = Math.floor(Math.random() * 2) + 2;
    
    for (let dy = -jungleSize; dy <= jungleSize; dy++) {
      for (let dx = -jungleSize; dx <= jungleSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height && distance <= jungleSize) {
          if (map[y][x].terrain === TerrainType.GRASSLAND) {
            const probability = 1 - (distance / jungleSize);
            if (Math.random() < probability * 0.6) {
              map[y][x].terrain = TerrainType.JUNGLE;
            }
          }
        }
      }
    }
  }

  // Add rivers to the map
  private addRivers(map: Tile[][], width: number, height: number): void {
    const numRivers = Math.floor((width * height) / 500);
    
    for (let i = 0; i < numRivers; i++) {
      const startX = Math.floor(Math.random() * width);
      const startY = Math.floor(Math.random() * height);
      
      this.traceRiver(map, startX, startY, width, height);
    }
  }

  // Trace a river from a starting point
  private traceRiver(map: Tile[][], startX: number, startY: number, width: number, height: number): void {
    let x = startX;
    let y = startY;
    const riverLength = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < riverLength; i++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Don't override ocean or mountains
        if (map[y][x].terrain !== TerrainType.OCEAN && map[y][x].terrain !== TerrainType.MOUNTAINS) {
          map[y][x].terrain = TerrainType.RIVER;
        }
      }

      // Move in a somewhat random direction
      const direction = Math.floor(Math.random() * 4);
      switch (direction) {
        case 0: x++; break; // East
        case 1: x--; break; // West
        case 2: y++; break; // South
        case 3: y--; break; // North
      }
    }
  }

  // Add resources to the map
  private addResources(map: Tile[][], width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = map[y][x];

        // Only add resources to land tiles
        if (tile.terrain === TerrainType.OCEAN) continue;

        // Get terrain instance and check for resources
        const terrain = TerrainManager.getTerrain(tile.terrain);
        
        // Check each possible resource for this terrain
        for (const resource of terrain.possibleResources) {
          const probability = terrain.getResourceProbability(resource);
          if (Math.random() < probability) {
            tile.resources = tile.resources || [];
            tile.resources.push(resource);
            break; // Only add one resource per tile
          }
        }
      }
    }
  }

  // Generate Earth-like terrain distribution
  private generateEarthTerrain(map: Tile[][], width: number, height: number): void {
    console.log('Generating Earth-like terrain...');
    
    // Create major continents with proper Earth positioning
    // Map coordinates: x=0 is leftmost (Americas), x=width-1 is rightmost (wraps to Asia)
    // y=0 is northernmost (Arctic), y=height-1 is southernmost (Antarctica)
    
    this.createNorthAmerica(map, width, height);
    this.createSouthAmerica(map, width, height);
    this.createEurope(map, width, height);
    this.createAfrica(map, width, height);
    this.createAsia(map, width, height);
    this.createAustralia(map, width, height);
    
    // Connect Africa to Asia through the Middle East (Sinai Peninsula)
    this.createAfricaAsiaConnection(map, width, height);
    
    // Create the Mediterranean Sea (between Europe and Africa)
    this.createMediterraneanSea(map, width, height);
    
    // Add climate-based terrain after continents are placed
    this.addEarthClimateZones(map, width, height);
    
    // Add mountain ranges based on Earth's major ranges
    this.addEarthMountainRanges(map, width, height);
    
    // Add deserts in appropriate locations
    this.addEarthDeserts(map, width, height);
    
    // Add forests in temperate and tropical regions
    this.addEarthForests(map, width, height);
    
    // Add rivers connecting mountain to ocean
    this.addEarthRivers(map, width, height);
  }

  // Create the connected Americas (western side of map)
  private createNorthAmerica(map: Tile[][], width: number, height: number): void {
    // Create the full Americas as one connected landmass
    this.createConnectedAmericas(map, width, height);
    
    // Greenland (separate)
    this.createLandmass(map, width * 0.35, height * 0.12, width * 0.1, height * 0.12, width, height, 0.7);
  }

  // Create South America (this is now part of the connected Americas)
  private createSouthAmerica(map: Tile[][], width: number, height: number): void {
    // South America is now created as part of the connected Americas in createConnectedAmericas
    // This method is kept for consistency but doesn't need to do anything
  }

  // Create the full connected Americas from Alaska to southern South America
  private createConnectedAmericas(map: Tile[][], width: number, height: number): void {
    // Alaska and northern Canada (wide at top)
    this.createLandmass(map, width * 0.08, height * 0.15, width * 0.16, height * 0.12, width, height, 0.8);
    
    // Main North America (very large, wide continent - dominates northern Americas)
    this.createLandmass(map, width * 0.15, height * 0.28, width * 0.32, height * 0.4, width, height, 0.85);
    
    // Mexico (much smaller, narrow transition)
    this.createLandmass(map, width * 0.18, height * 0.48, width * 0.06, height * 0.06, width, height, 0.9);
    
    // Central America (very narrow isthmus - geographically accurate, extended south)
    this.createLandmass(map, width * 0.19, height * 0.54, width * 0.04, height * 0.1, width, height, 0.95);
    
    // Northern South America (moderate size, wider than Central America, extended north)
    this.createLandmass(map, width * 0.20, height * 0.60, width * 0.12, height * 0.12, width, height, 0.85);
    
    // Main South America (slimmer and longer, almost touching bottom)
    this.createLandmass(map, width * 0.22, height * 0.80, width * 0.14, height * 0.32, width, height, 0.85);
    
    // Create connecting strips to ensure no gaps between major landmasses
    this.createConnectingStrip(map, width * 0.17, height * 0.43, width * 0.18, height * 0.48, width, height); // North America to Mexico
    this.createConnectingStrip(map, width * 0.18, height * 0.51, width * 0.19, height * 0.54, width, height); // Mexico to Central America
    this.createConnectingStrip(map, width * 0.19, height * 0.58, width * 0.20, height * 0.60, width, height); // Central America to South America
    
    // Additional robust connection for Central America - South America isthmus
    this.createRobustConnection(map, width * 0.19, height * 0.56, width * 0.20, height * 0.62, width, height);
  }

  // Create a connecting strip between two points to ensure landmasses are connected
  private createConnectingStrip(map: Tile[][], x1: number, y1: number, x2: number, y2: number, width: number, height: number): void {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = Math.floor(x1 + (x2 - x1) * progress);
      const y = Math.floor(y1 + (y2 - y1) * progress);
      
      // Create a small landmass at each step to ensure connection
      if (x >= 0 && x < width && y >= 0 && y < height) {
        this.createLandmass(map, x, y, width * 0.04, height * 0.03, width, height, 0.95);
      }
    }
  }

  // Create a more robust connection between two regions with multiple parallel strips
  private createRobustConnection(map: Tile[][], x1: number, y1: number, x2: number, y2: number, width: number, height: number): void {
    // Create multiple parallel connecting strips for better reliability
    for (let offset = -2; offset <= 2; offset++) {
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const x = Math.floor(x1 + (x2 - x1) * progress) + offset;
        const y = Math.floor(y1 + (y2 - y1) * progress);
        
        // Create landmass at each step
        if (x >= 0 && x < width && y >= 0 && y < height) {
          this.createLandmass(map, x, y, width * 0.06, height * 0.04, width, height, 0.98);
        }
      }
    }
  }

  // Create connection between Africa and Asia through the Middle East/Sinai Peninsula
  private createAfricaAsiaConnection(map: Tile[][], width: number, height: number): void {
    // Sinai Peninsula connection (narrow land bridge between Africa and Middle East)
    this.createLandmass(map, width * 0.58, height * 0.435, width * 0.03, height * 0.05, width, height, 0.95);
    
    // Additional narrow connection to ensure it's solid
    this.createConnectingStrip(map, width * 0.57, height * 0.44, width * 0.62, height * 0.42, width, height);
  }

  // Create the Mediterranean Sea between Europe and Africa
  private createMediterraneanSea(map: Tile[][], width: number, height: number): void {
    // Mediterranean Sea extends from Gibraltar to the Levant
    const startX = Math.floor(width * 0.42); // Western edge (near Gibraltar)
    const endX = Math.floor(width * 0.62);   // Eastern edge (near Middle East)
    const startY = Math.floor(height * 0.36); // Southern Europe
    const endY = Math.floor(height * 0.44);   // Northern Africa
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Create Mediterranean as ocean, but leave small gaps for Italian peninsula and islands
          const distanceFromCenter = Math.sqrt(
            Math.pow((x - (startX + endX) / 2) / (endX - startX), 2) +
            Math.pow((y - (startY + endY) / 2) / (endY - startY), 2)
          );
          
          // Leave some land for Italian peninsula and Greek islands
          const isItalianPeninsula = (x > width * 0.50 && x < width * 0.52 && y > height * 0.36 && y < height * 0.42);
          const isGreekIslands = (x > width * 0.54 && x < width * 0.57 && y > height * 0.37 && y < height * 0.40);
          
          if (!isItalianPeninsula && !isGreekIslands && distanceFromCenter < 0.6) {
            map[y][x].terrain = TerrainType.OCEAN;
          }
        }
      }
    }
    
    // Add some Mediterranean islands
    this.createLandmass(map, width * 0.48, height * 0.40, width * 0.02, height * 0.02, width, height, 0.9); // Corsica/Sardinia
    this.createLandmass(map, width * 0.51, height * 0.41, width * 0.015, height * 0.015, width, height, 0.9); // Sicily
    this.createLandmass(map, width * 0.56, height * 0.385, width * 0.01, height * 0.01, width, height, 0.9); // Crete
  }

  // Create Europe
  private createEurope(map: Tile[][], width: number, height: number): void {
    // Create the connected Eurasian landmass
    this.createConnectedEurasia(map, width, height);
    
    // British Isles as separate islands
    // Great Britain (UK) - larger island to the east
    this.createLandmass(map, width * 0.44, height * 0.22, width * 0.04, height * 0.08, width, height, 0.85);
    
    // Ireland - smaller island to the west
    this.createLandmass(map, width * 0.39, height * 0.23, width * 0.025, height * 0.06, width, height, 0.8);
    
    // Iceland (separate Nordic island)
    this.createLandmass(map, width * 0.36, height * 0.15, width * 0.025, height * 0.04, width, height, 0.8);
  }

  // Create Africa
  private createAfrica(map: Tile[][], width: number, height: number): void {
    // Main African landmass (moved south to make room for Mediterranean Sea)
    this.createLandmass(map, width * 0.52, height * 0.62, width * 0.2, height * 0.42, width, height, 0.85);
    
    // Madagascar (larger)
    this.createLandmass(map, width * 0.64, height * 0.72, width * 0.04, height * 0.08, width, height, 0.9);
  }

  // Create Asia
  private createAsia(map: Tile[][], width: number, height: number): void {
    // Asia is now created as part of connected Eurasia in createConnectedEurasia
    // This method is kept for consistency but doesn't need to do anything
  }

  // Create the massive connected Eurasian landmass
  private createConnectedEurasia(map: Tile[][], width: number, height: number): void {
    // Main European region
    this.createLandmass(map, width * 0.48, height * 0.25, width * 0.18, height * 0.2, width, height, 0.85);
    
    // Scandinavia
    this.createLandmass(map, width * 0.52, height * 0.15, width * 0.1, height * 0.15, width, height, 0.8);
    
    // Western Asia / Middle East (connecting Europe to Asia and Africa)
    this.createLandmass(map, width * 0.62, height * 0.35, width * 0.15, height * 0.15, width, height, 0.85);
    
    // Arabian Peninsula (important geographical feature)
    this.createLandmass(map, width * 0.6, height * 0.45, width * 0.08, height * 0.08, width, height, 0.85);
    
    // Main Asian landmass (massive eastern continent)
    this.createLandmass(map, width * 0.75, height * 0.32, width * 0.35, height * 0.35, width, height, 0.8);
    
    // Siberia (northern extension)
    this.createLandmass(map, width * 0.78, height * 0.18, width * 0.3, height * 0.15, width, height, 0.7);
    
    // India (southern peninsula)
    this.createLandmass(map, width * 0.68, height * 0.48, width * 0.12, height * 0.15, width, height, 0.85);
    
    // Southeast Asia and Indonesia
    this.createLandmass(map, width * 0.8, height * 0.58, width * 0.12, height * 0.12, width, height, 0.7);
    
    // Japan (separate island)
    this.createLandmass(map, width * 0.88, height * 0.38, width * 0.05, height * 0.1, width, height, 0.8);
    
    // Create robust connections within Eurasia
    this.createRobustConnection(map, width * 0.57, height * 0.25, width * 0.62, height * 0.35, width, height); // Europe to Middle East
    this.createRobustConnection(map, width * 0.69, height * 0.35, width * 0.75, height * 0.32, width, height); // Middle East to Asia
    this.createRobustConnection(map, width * 0.52, height * 0.25, width * 0.78, height * 0.25, width, height); // Northern Eurasia connection
  }

  // Create Australia and Oceania
  private createAustralia(map: Tile[][], width: number, height: number): void {
    // Australia (much larger)
    this.createLandmass(map, width * 0.85, height * 0.78, width * 0.18, height * 0.12, width, height, 0.85);
    
    // New Zealand (larger)
    this.createLandmass(map, width * 0.98, height * 0.85, width * 0.04, height * 0.08, width, height, 0.8);
    
    // Papua New Guinea (new addition)
    this.createLandmass(map, width * 0.82, height * 0.68, width * 0.06, height * 0.05, width, height, 0.8);
  }

  // Create a landmass with irregular coastlines
  private createLandmass(map: Tile[][], centerX: number, centerY: number, sizeX: number, sizeY: number, width: number, height: number, density: number): void {
    const startX = Math.max(0, Math.floor(centerX - sizeX / 2));
    const endX = Math.min(width - 1, Math.floor(centerX + sizeX / 2));
    const startY = Math.max(0, Math.floor(centerY - sizeY / 2));
    const endY = Math.min(height - 1, Math.floor(centerY + sizeY / 2));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Calculate distance from center (elliptical)
        const distanceX = (x - centerX) / (sizeX / 2);
        const distanceY = (y - centerY) / (sizeY / 2);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        // Create irregular coastlines with multiple noise layers
        const coastNoise1 = Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.2;
        const coastNoise2 = Math.sin(x * 0.8) * Math.cos(y * 0.6) * 0.1;
        const coastNoise3 = Math.sin(x * 1.5) * Math.cos(y * 1.2) * 0.05;
        const totalNoise = coastNoise1 + coastNoise2 + coastNoise3;
        
        // Make landmasses more solid - only add noise at the edges
        const baseThreshold = 1.0;
        const noisyThreshold = baseThreshold + totalNoise;
        
        if (distance < noisyThreshold) {
          // Create solid landmasses with only edge variation
          if (distance < 0.7) {
            // Core area - always land
            map[y][x].terrain = TerrainType.GRASSLAND;
          } else {
            // Edge area - use noise for coastline variation
            const edgeProbability = density * (1 - (distance - 0.7) / (noisyThreshold - 0.7));
            if (edgeProbability > 0.3) { // Much higher threshold for solid continents
              map[y][x].terrain = TerrainType.GRASSLAND;
            }
          }
        }
      }
    }
  }

  // Add climate zones based on latitude and geography
  private addEarthClimateZones(map: Tile[][], width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map[y][x].terrain === TerrainType.GRASSLAND) {
          const latitude = y / height; // 0 = north, 1 = south
          
          // Arctic zones (far north and south)
          if (latitude < 0.1 || latitude > 0.9) {
            // Keep as grassland (tundra-like)
            continue;
          }
          // Tropical zone (equatorial belt)
          else if (latitude > 0.4 && latitude < 0.6) {
            // Higher chance of jungle in tropical regions
            if (Math.random() < 0.4) {
              map[y][x].terrain = TerrainType.JUNGLE;
            }
          }
          // Temperate zones
          else if ((latitude > 0.15 && latitude < 0.4) || (latitude > 0.6 && latitude < 0.85)) {
            // Higher chance of forests in temperate regions
            if (Math.random() < 0.5) {
              map[y][x].terrain = TerrainType.FOREST;
            }
          }
        }
      }
    }
  }

  // Add major mountain ranges
  private addEarthMountainRanges(map: Tile[][], width: number, height: number): void {
    // Rocky Mountains (western North America) - larger
    this.createEarthMountainRange(map, width * 0.12, height * 0.3, width * 0.04, height * 0.25, width, height);
    
    // Appalachian Mountains (eastern North America) - larger
    this.createEarthMountainRange(map, width * 0.2, height * 0.32, width * 0.03, height * 0.2, width, height);
    
    // Andes Mountains (western South America) - longer to match extended South America
    this.createEarthMountainRange(map, width * 0.19, height * 0.75, width * 0.03, height * 0.35, width, height);
    
    // Alps (central Europe) - larger
    this.createEarthMountainRange(map, width * 0.48, height * 0.28, width * 0.08, height * 0.04, width, height);
    
    // Urals (Europe-Asia border) - larger
    this.createEarthMountainRange(map, width * 0.6, height * 0.25, width * 0.03, height * 0.2, width, height);
    
    // Himalayas (southern Asia) - much larger
    this.createEarthMountainRange(map, width * 0.7, height * 0.42, width * 0.15, height * 0.05, width, height);
    
    // Atlas Mountains (North Africa) - larger
    this.createEarthMountainRange(map, width * 0.48, height * 0.42, width * 0.1, height * 0.04, width, height);
    
    // Ethiopian Highlands (East Africa) - larger
    this.createEarthMountainRange(map, width * 0.58, height * 0.52, width * 0.06, height * 0.08, width, height);
    
    // Great Dividing Range (eastern Australia) - larger
    this.createEarthMountainRange(map, width * 0.88, height * 0.78, width * 0.03, height * 0.08, width, height);
    
    // Cascade Range (western North America)
    this.createEarthMountainRange(map, width * 0.08, height * 0.25, width * 0.02, height * 0.15, width, height);
    
    // Sierra Madre (Mexico)
    this.createEarthMountainRange(map, width * 0.15, height * 0.45, width * 0.03, height * 0.1, width, height);
    
    // Caucasus Mountains (between Europe and Asia)
    this.createEarthMountainRange(map, width * 0.6, height * 0.32, width * 0.04, height * 0.03, width, height);
    
    // Zagros Mountains (Iran/Middle East)
    this.createEarthMountainRange(map, width * 0.64, height * 0.38, width * 0.04, height * 0.06, width, height);
  }

  // Create a mountain range
  private createEarthMountainRange(map: Tile[][], centerX: number, centerY: number, sizeX: number, sizeY: number, width: number, height: number): void {
    const startX = Math.max(0, Math.floor(centerX - sizeX / 2));
    const endX = Math.min(width - 1, Math.floor(centerX + sizeX / 2));
    const startY = Math.max(0, Math.floor(centerY - sizeY / 2));
    const endY = Math.min(height - 1, Math.floor(centerY + sizeY / 2));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (map[y][x].terrain !== TerrainType.OCEAN) {
          const distanceFromCenter = Math.sqrt(
            Math.pow((x - centerX) / sizeX, 2) + Math.pow((y - centerY) / sizeY, 2)
          );
          
          if (distanceFromCenter < 0.5) {
            if (distanceFromCenter < 0.3) {
              map[y][x].terrain = TerrainType.MOUNTAINS;
            } else if (Math.random() < 0.6) {
              map[y][x].terrain = TerrainType.HILLS;
            }
          }
        }
      }
    }
  }

  // Add Earth's major deserts
  private addEarthDeserts(map: Tile[][], width: number, height: number): void {
    // Sahara Desert (North Africa)
    this.createEarthDesertRegion(map, width * 0.52, height * 0.42, width * 0.12, height * 0.08, width, height);
    
    // Arabian Desert (Middle East)
    this.createEarthDesertRegion(map, width * 0.58, height * 0.42, width * 0.06, height * 0.06, width, height);
    
    // Gobi Desert (Mongolia/China)
    this.createEarthDesertRegion(map, width * 0.75, height * 0.32, width * 0.08, height * 0.04, width, height);
    
    // Mojave/Sonoran Desert (southwestern USA/northwestern Mexico)
    this.createEarthDesertRegion(map, width * 0.12, height * 0.38, width * 0.04, height * 0.06, width, height);
    
    // Atacama Desert (western South America) - adjusted for longer South America
    this.createEarthDesertRegion(map, width * 0.19, height * 0.78, width * 0.02, height * 0.08, width, height);
    
    // Australian Outback (central Australia)
    this.createEarthDesertRegion(map, width * 0.82, height * 0.75, width * 0.08, height * 0.06, width, height);
    
    // Kalahari Desert (southern Africa)
    this.createEarthDesertRegion(map, width * 0.54, height * 0.7, width * 0.06, height * 0.05, width, height);
    
    // Thar Desert (India/Pakistan)
    this.createEarthDesertRegion(map, width * 0.66, height * 0.45, width * 0.04, height * 0.04, width, height);
  }

  // Create a desert region
  private createEarthDesertRegion(map: Tile[][], centerX: number, centerY: number, sizeX: number, sizeY: number, width: number, height: number): void {
    const startX = Math.max(0, Math.floor(centerX - sizeX / 2));
    const endX = Math.min(width - 1, Math.floor(centerX + sizeX / 2));
    const startY = Math.max(0, Math.floor(centerY - sizeY / 2));
    const endY = Math.min(height - 1, Math.floor(centerY + sizeY / 2));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (map[y][x].terrain === TerrainType.GRASSLAND) {
          const distanceFromCenter = Math.sqrt(
            Math.pow((x - centerX) / sizeX, 2) + Math.pow((y - centerY) / sizeY, 2)
          );
          
          if (distanceFromCenter < 0.5 && Math.random() < 0.8) {
            map[y][x].terrain = TerrainType.DESERT;
          }
        }
      }
    }
  }

  // Add forests in appropriate climate zones
  private addEarthForests(map: Tile[][], width: number, height: number): void {
    // Amazon Rainforest (northern South America)
    this.createEarthForestRegion(map, width * 0.23, height * 0.58, width * 0.08, height * 0.12, TerrainType.JUNGLE, width, height);
    
    // Congo Rainforest (central Africa)
    this.createEarthForestRegion(map, width * 0.54, height * 0.58, width * 0.06, height * 0.08, TerrainType.JUNGLE, width, height);
    
    // Southeast Asian Rainforest (Indonesia/Malaysia)
    this.createEarthForestRegion(map, width * 0.78, height * 0.58, width * 0.06, height * 0.06, TerrainType.JUNGLE, width, height);
    
    // Boreal Forest (northern North America)
    this.createEarthForestRegion(map, width * 0.15, height * 0.18, width * 0.15, height * 0.06, TerrainType.FOREST, width, height);
    
    // Taiga (northern Eurasia)
    this.createEarthForestRegion(map, width * 0.75, height * 0.18, width * 0.2, height * 0.06, TerrainType.FOREST, width, height);
    
    // European Forests
    this.createEarthForestRegion(map, width * 0.48, height * 0.25, width * 0.08, height * 0.08, TerrainType.FOREST, width, height);
    
    // Eastern North American Forests
    this.createEarthForestRegion(map, width * 0.18, height * 0.32, width * 0.06, height * 0.12, TerrainType.FOREST, width, height);
  }

  // Create a forest region
  private createEarthForestRegion(map: Tile[][], centerX: number, centerY: number, sizeX: number, sizeY: number, forestType: TerrainType, width: number, height: number): void {
    const startX = Math.max(0, Math.floor(centerX - sizeX / 2));
    const endX = Math.min(width - 1, Math.floor(centerX + sizeX / 2));
    const startY = Math.max(0, Math.floor(centerY - sizeY / 2));
    const endY = Math.min(height - 1, Math.floor(centerY + sizeY / 2));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (map[y][x].terrain === TerrainType.GRASSLAND) {
          const distanceFromCenter = Math.sqrt(
            Math.pow((x - centerX) / sizeX, 2) + Math.pow((y - centerY) / sizeY, 2)
          );
          
          if (distanceFromCenter < 0.5 && Math.random() < 0.7) {
            map[y][x].terrain = forestType;
          }
        }
      }
    }
  }

  // Add major rivers
  private addEarthRivers(map: Tile[][], width: number, height: number): void {
    // Amazon River (South America)
    this.traceEarthRiver(map, width * 0.27, height * 0.58, width * 0.19, height * 0.58, width, height);
    
    // Mississippi River (North America)
    this.traceEarthRiver(map, width * 0.15, height * 0.32, width * 0.17, height * 0.45, width, height);
    
    // Nile River (Africa)
    this.traceEarthRiver(map, width * 0.54, height * 0.35, width * 0.56, height * 0.65, width, height);
    
    // Congo River (Africa)
    this.traceEarthRiver(map, width * 0.52, height * 0.58, width * 0.58, height * 0.58, width, height);
    
    // Yangtze River (China)
    this.traceEarthRiver(map, width * 0.72, height * 0.38, width * 0.82, height * 0.38, width, height);
    
    // Ganges River (India)
    this.traceEarthRiver(map, width * 0.68, height * 0.45, width * 0.72, height * 0.48, width, height);
    
    // Volga River (Russia)
    this.traceEarthRiver(map, width * 0.58, height * 0.22, width * 0.62, height * 0.35, width, height);
    
    // Danube River (Europe)
    this.traceEarthRiver(map, width * 0.48, height * 0.28, width * 0.54, height * 0.32, width, height);
  }

  // Trace a river between two points
  private traceEarthRiver(map: Tile[][], startX: number, startY: number, endX: number, endY: number, width: number, height: number): void {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = Math.floor(startX + (endX - startX) * progress);
      const y = Math.floor(startY + (endY - startY) * progress);
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (map[y][x].terrain !== TerrainType.OCEAN && map[y][x].terrain !== TerrainType.MOUNTAINS) {
          map[y][x].terrain = TerrainType.RIVER;
        }
      }
    }
  }

}
