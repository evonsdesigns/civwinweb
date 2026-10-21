import { UnitType, TerrainType } from '../types/game';

export class V4Sprites {
  private static imageLoadPromise: Promise<HTMLImageElement> | null = null;
  private static baseImage: HTMLImageElement | null = null;
  
  // Maps standard V2 unit order to V4 layout
  private static readonly V2_UNIT_ORDER = [
    UnitType.SETTLERS, UnitType.MILITIA, UnitType.PHALANX, UnitType.LEGION,
    UnitType.MUSKETEERS, UnitType.RIFLEMEN, UnitType.CAVALRY, UnitType.KNIGHTS,
    UnitType.CATAPULT, UnitType.CANNON, UnitType.CHARIOT, UnitType.ARMOR,
    UnitType.MECH_INF, UnitType.ARTILLERY, UnitType.FIGHTER, UnitType.BOMBER,
    UnitType.TRIREME, UnitType.SAIL, UnitType.FRIGATE, UnitType.IRONCLAD,
    UnitType.CRUISER, UnitType.BATTLESHIP, UnitType.SUBMARINE, UnitType.CARRIER,
    UnitType.TRANSPORT, UnitType.NUCLEAR, UnitType.DIPLOMAT, UnitType.CARAVAN
  ];

  public static isLoaded(): boolean {
    return this.baseImage !== null;
  }

  public static async getSpriteSheet(): Promise<HTMLImageElement> {
    if (this.baseImage) return this.baseImage;
    if (!this.imageLoadPromise) {
      this.imageLoadPromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.baseImage = img;
          resolve(img);
        };
        img.onerror = reject;
        img.src = '/src/assets/v4/SPR.png';
      });
    }
    return this.imageLoadPromise;
  }

  public static getTerrainRow(terrain: TerrainType): number {
    switch (terrain) {
      case TerrainType.DESERT: return 0;
      case TerrainType.PLAINS: return 1;
      case TerrainType.GRASSLAND: return 2;
      case TerrainType.FOREST: return 3;
      case TerrainType.HILLS: return 4;
      case TerrainType.MOUNTAINS: return 5;
      case TerrainType.TUNDRA: return 6;
      case TerrainType.ARCTIC: return 7;
      case TerrainType.SWAMP: return 8;
      case TerrainType.JUNGLE: return 9;
      case TerrainType.OCEAN: return 11;
      case TerrainType.RIVER: return 2; // draw over grassland
      default: return 2;
    }
  }

  public static async getUnitSprite(unitType: UnitType, playerColor: string): Promise<HTMLCanvasElement> {
    const sheet = await this.getSpriteSheet();
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const u_idx = this.V2_UNIT_ORDER.indexOf(unitType);
    if (u_idx === -1) {
       return canvas;
    }
    const x = (u_idx % 20) * 32;
    const y = 320 + Math.floor(u_idx / 20) * 32;

    ctx.drawImage(sheet, x, y, 32, 32, 0, 0, 32, 32);
    
    // Remove background red (209, 8, 0)
    const imgData = ctx.getImageData(0, 0, 32, 32);
    const data = imgData.data;
    
    // Extract RGB from any valid CSS color string
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.fillStyle = playerColor;
    tmpCtx.fillRect(0, 0, 1, 1);
    const tmpData = tmpCtx.getImageData(0, 0, 1, 1).data;
    const pR = tmpData[0];
    const pG = tmpData[1];
    const pB = tmpData[2];

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 209 && data[i+1] === 8 && data[i+2] === 0) {
        data[i+3] = 0; // transparent
      } else if (data[i] > 180 && data[i+1] > 140 && data[i+2] < 100) {
         // Yellow background color. Recolor it to player color!
         data[i] = pR; data[i+1] = pG; data[i+2] = pB;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  public static async getTerrainSprite(terrain: TerrainType, connections: number): Promise<HTMLCanvasElement> {
    await this.getSpriteSheet();
    return this.getTerrainSpriteSync(terrain, connections);
  }

  public static getTerrainSpriteSync(terrain: TerrainType, connections: number): HTMLCanvasElement {
    const sheet = this.baseImage;
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    if (!sheet) return canvas;
    const ctx = canvas.getContext('2d')!;

    // Construct index 0-15 based on adjacent tiles. Mask: NONE=0, N=1, E=2, S=4, W=8
    // Note context gives connection pattern like: NORTH=1, EAST=4, SOUTH=16, WEST=64
    let idx = 0;
    
    if (terrain !== TerrainType.OCEAN) {
      if (connections & 1) /* NORTH */ idx |= 1;
      if (connections & 4) /* EAST */ idx |= 2;
      if (connections & 16) /* SOUTH */ idx |= 4;
      if (connections & 64) /* WEST */ idx |= 8;
    }
    
    const xOffset = 640;
    
    if (terrain === TerrainType.OCEAN) {
       // Draw base ocean first
       const row = this.getTerrainRow(TerrainType.OCEAN);
       ctx.drawImage(sheet, xOffset, row*32, 32, 32, 0, 0, 32, 32);
       
       const invConnections = (~connections) & 0xFF;
         if (invConnections > 0) {
           const N = (invConnections & 1) !== 0;
           const NE = (invConnections & 2) !== 0;
           const E = (invConnections & 4) !== 0;
           const SE = (invConnections & 8) !== 0;
           const S = (invConnections & 16) !== 0;
           const SW = (invConnections & 32) !== 0;
           const W = (invConnections & 64) !== 0;
           const NW = (invConnections & 128) !== 0;
         // Create a temporary canvas to apply transparency to the coastal overlay
         const overlayCanvas = document.createElement('canvas');
         overlayCanvas.width = 32; overlayCanvas.height = 32;
         const oCtx = overlayCanvas.getContext('2d')!;

         // Each quadrant looks only at ITS OWN two edges and its own diagonal.
         // Columns in the sheet: 0 none, 2 diagonal only, 5/7 both edges (diagonal land/ocean),
         // and per-edge strips: (1 or 3) for one pair of edges, (4 or 6) for the other, where the
         // second column of each pair is the variant whose diagonal neighbour is also land.
         const pickCol = (a: boolean, b: boolean, diag: boolean, aCols: [number, number], bCols: [number, number]): number => {
           if (a && b) return diag ? 5 : 7;
           if (a) return diag ? aCols[1] : aCols[0];
           if (b) return diag ? bCols[1] : bCols[0];
           return diag ? 2 : 0;
         };
         const nwCol = pickCol(N, W, NW, [4, 6], [1, 3]);
         const neCol = pickCol(N, E, NE, [1, 3], [4, 6]);
         const swCol = pickCol(S, W, SW, [1, 3], [4, 6]);
         const seCol = pickCol(S, E, SE, [4, 6], [1, 3]);

         // Draw each 16x16 quadrant directly from the respective tile
         if (nwCol > 0) oCtx.drawImage(sheet, xOffset + nwCol*32, row*32, 16, 16, 0, 0, 16, 16);
         if (neCol > 0) oCtx.drawImage(sheet, xOffset + neCol*32 + 16, row*32, 16, 16, 16, 0, 16, 16);
         if (swCol > 0) oCtx.drawImage(sheet, xOffset + swCol*32, row*32 + 16, 16, 16, 0, 16, 16, 16);
         if (seCol > 0) oCtx.drawImage(sheet, xOffset + seCol*32 + 16, row*32 + 16, 16, 16, 16, 16, 16, 16);
         
         // Key out the base ocean color (0, 73, 128) and any other water wave pixels
         if (nwCol > 0 || neCol > 0 || swCol > 0 || seCol > 0) {
           const imgData = oCtx.getImageData(0, 0, 32, 32);
           const data = imgData.data;
           for (let i = 0; i < data.length; i += 4) {
             const r = data[i];
             const g = data[i+1];
             const b = data[i+2];
             
             // If blue is the dominant color, it's water (base or waves), make it transparent
             if (b > r + 20 && b > g + 20) {
               data[i+3] = 0; // completely transparent
             }
           }
           oCtx.putImageData(imgData, 0, 0);
           
           // Overlay the border onto the base ocean
           ctx.drawImage(overlayCanvas, 0, 0);
         }
       }
       
       return canvas;
    }
    
    if (terrain === TerrainType.RIVER) {
        // Draw plains/grassland first
        const gRow = this.getTerrainRow(TerrainType.GRASSLAND);
        ctx.drawImage(sheet, xOffset + 0*32, gRow*32, 32, 32, 0, 0, 32, 32); 
        
        // We need to apply transparency to the grassland first
        const bgImgData = ctx.getImageData(0, 0, 32, 32);
        const bgData = bgImgData.data;
        for (let i = 0; i < bgData.length; i += 4) {
          if (bgData[i] === 209 && bgData[i+1] === 8 && bgData[i+2] === 0) {
            bgData[i+3] = 0;
          }
        }
        ctx.putImageData(bgImgData, 0, 0);

        // Then prepare river on a temporary canvas so its red background becomes transparent
        const riverCanvas = document.createElement('canvas');
        riverCanvas.width = 32; riverCanvas.height = 32;
        const riverCtx = riverCanvas.getContext('2d')!;
        riverCtx.drawImage(sheet, idx * 32, 4 * 32, 32, 32, 0, 0, 32, 32);
        
        const riverImgData = riverCtx.getImageData(0, 0, 32, 32);
        const riverData = riverImgData.data;
        for (let i = 0; i < riverData.length; i += 4) {
          if (riverData[i] === 209 && riverData[i+1] === 8 && riverData[i+2] === 0) {
            riverData[i+3] = 0;
          }
        }
        riverCtx.putImageData(riverImgData, 0, 0);
        
        // Overlay the transparent river onto the grassland block
        ctx.drawImage(riverCanvas, 0, 0);
        return canvas;
    } else {
        const row = this.getTerrainRow(terrain);
        const sourceX = xOffset + idx * 32;
        const sourceY = row * 32;
        ctx.drawImage(sheet, sourceX, sourceY, 32, 32, 0, 0, 32, 32);
        
        // Remove the red bg
        const imgData = ctx.getImageData(0, 0, 32, 32);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === 209 && data[i+1] === 8 && data[i+2] === 0) {
            data[i+3] = 0; // transparent
          }
        }
        ctx.putImageData(imgData, 0, 0);

        return canvas;
    }
  }
}
