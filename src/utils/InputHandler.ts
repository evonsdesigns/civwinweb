import { Game } from '../game/Game.js';
import { GameRenderer } from '../renderer/GameRenderer.js';
import { Renderer } from '../renderer/Renderer.js';
import { Status } from '../renderer/Status.js';

export class InputHandler {
  private game: Game;
  private gameRenderer: GameRenderer;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private requestRender: () => void;
  private minimapToggle?: () => void;
  private status?: Status;
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private dragStartPos = { x: 0, y: 0 };

  constructor(
    game: Game, 
    gameRenderer: GameRenderer, 
    renderer: Renderer, 
    canvas: HTMLCanvasElement, 
    requestRender: () => void,
    minimapToggle?: () => void,
    status?: Status
  ) {
    this.game = game;
    this.gameRenderer = gameRenderer;
    this.renderer = renderer;
    this.canvas = canvas;
    this.requestRender = requestRender;
    this.minimapToggle = minimapToggle;
    this.status = status;
    
    this.setupEventListeners();
    this.updateMapDimensions();
  }

  // Update map dimensions in renderer
  private updateMapDimensions(): void {
    const gameState = this.game.getGameState();
    if (gameState.worldMap && gameState.worldMap.length > 0) {
      const mapWidth = gameState.worldMap[0]?.length || 80;
      const mapHeight = gameState.worldMap.length || 50;
      this.renderer.setMapDimensions(mapWidth, mapHeight);
    }
  }

  // Setup all event listeners
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    
    // Prevent default context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Handle mouse down events
  private onMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    this.lastMousePos = { x: mouseX, y: mouseY };
    this.dragStartPos = { x: mouseX, y: mouseY };
    
    if (event.button === 0) { // Left click
      this.isDragging = true;
    } else if (event.button === 2) { // Right click
      this.handleRightClick(mouseX, mouseY);
    }
  }

  // Handle mouse move events
  private onMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (this.isDragging) {
      // Calculate drag delta (no zoom factor needed)
      const deltaX = (this.lastMousePos.x - mouseX) / this.renderer.getRenderContext().tileSize;
      const deltaY = (this.lastMousePos.y - mouseY) / this.renderer.getRenderContext().tileSize;
      
      // Move viewport
      this.renderer.moveViewport(deltaX, deltaY);
      this.requestRender();
    }
    
    this.lastMousePos = { x: mouseX, y: mouseY };
  }

  // Handle mouse up events
  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Check if this was a click (not a drag)
      const dragDistance = Math.sqrt(
        Math.pow(mouseX - this.dragStartPos.x, 2) + 
        Math.pow(mouseY - this.dragStartPos.y, 2)
      );
      
      if (dragDistance < 5) { // Threshold for click vs drag
        this.handleLeftClick(mouseX, mouseY);
      }
      
      this.isDragging = false;
    }
  }

  // Handle mouse wheel events for scrolling
  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Calculate scroll speed based on tile size
    const baseScrollSpeed = 1; // tiles per scroll
    
    // Modify scroll speed with modifier keys
    let scrollSpeed = baseScrollSpeed;
    if (event.shiftKey) {
      scrollSpeed *= 2; // Faster scrolling with Shift
    }
    if (event.ctrlKey || event.metaKey) {
      scrollSpeed *= 0.5; // Slower scrolling with Ctrl/Cmd
    }
    
    let deltaX = 0;
    let deltaY = 0;
    
    // Check if Alt/Option is held for forced horizontal scrolling
    if (event.altKey) {
      // Alt + wheel = horizontal scrolling
      deltaX = event.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    }
    // Normal wheel behavior
    else if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      // Primarily vertical scrolling (north/south)
      deltaY = event.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    } 
    else if (Math.abs(event.deltaX) > 0) {
      // Horizontal scrolling (east/west) - supported on trackpads and some mice
      deltaX = event.deltaX > 0 ? scrollSpeed : -scrollSpeed;
    }
    
    // Apply scrolling with boundary clamping
    if (deltaX !== 0 || deltaY !== 0) {
      this.renderer.moveViewport(deltaX, deltaY);
      this.requestRender();
    }
  }

  // Handle context menu
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  // Handle left click
  private handleLeftClick(mouseX: number, mouseY: number): void {
    const worldPos = this.renderer.screenToWorld(mouseX, mouseY);
    const gameState = this.game.getGameState();
    
    // Update map dimensions in case the game was just initialized
    this.updateMapDimensions();
    
    // Normalize position for horizontal wrapping
    const normalizedPos = this.normalizePosition(worldPos, gameState);
    
    // Check if clicking on a unit
    const clickedUnit = gameState.units.find(unit => 
      unit.position.x === normalizedPos.x && unit.position.y === normalizedPos.y
    );
    
    if (clickedUnit) {
      // Select the unit
      this.gameRenderer.selectUnit(clickedUnit);
      this.gameRenderer.selectTile(worldPos.x, worldPos.y);
      
      // Notify Status window of unit selection
      if (this.status) {
        this.status.setSelectedUnit(clickedUnit);
      }
      
      this.requestRender();
    } else {
      // Check if we have a unit selected and are trying to move it
      const selectedUnit = this.gameRenderer.getSelectedUnit();
      if (selectedUnit && selectedUnit.playerId === gameState.currentPlayer) {
        // Attempt to move the unit
        const success = this.game.moveUnit(selectedUnit.id, normalizedPos);
        if (success) {
          this.gameRenderer.selectTile(worldPos.x, worldPos.y);
          this.requestRender();
        }
      } else {
        // Just select the tile
        this.gameRenderer.selectTile(worldPos.x, worldPos.y);
        this.gameRenderer.clearSelections();
        
        // Clear Status window selection
        if (this.status) {
          this.status.setSelectedUnit(null);
        }
        
        this.requestRender();
      }
    }
  }

  // Handle right click
  private handleRightClick(mouseX: number, mouseY: number): void {
    const worldPos = this.renderer.screenToWorld(mouseX, mouseY);
    const gameState = this.game.getGameState();
    const selectedUnit = this.gameRenderer.getSelectedUnit();
    
    // Update map dimensions in case the game was just initialized
    this.updateMapDimensions();
    
    if (selectedUnit) {
      // Normalize position for horizontal wrapping
      const normalizedPos = this.normalizePosition(worldPos, gameState);
      
      // Move unit to right-clicked position
      this.game.moveUnit(selectedUnit.id, normalizedPos);
      this.requestRender();
    }
  }

  // Handle keyboard events
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ': // Spacebar - end turn
        event.preventDefault();
        this.game.endTurn();
        break;
        
      case 'Escape': // Clear selections
        this.gameRenderer.clearSelections();
        this.requestRender();
        break;
        
      case 'b': // Build city (if settler selected)
        this.handleBuildCity();
        break;
        
      case 'p': // Pause/unpause
        this.game.togglePause();
        break;
        
      case 'm': // Toggle minimap
      case 'M':
        if (this.minimapToggle) {
          this.minimapToggle();
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.handleUnitMovement(0, -1);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        this.handleUnitMovement(0, 1);
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        this.handleUnitMovement(-1, 0);
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        this.handleUnitMovement(1, 0);
        break;
        
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+Tab: Previous unit in queue
          this.game.selectPreviousUnit();
        } else {
          // Tab: Next unit in queue
          this.game.selectNextUnit();
        }
        break;
        
      case 'w':
      case 'W':
        // Wait command - skip current unit
        this.game.selectNextUnit();
        break;
        
      case ' ':
        // Space bar - no movement for current unit
        const currentUnit = this.game.getCurrentUnit();
        if (currentUnit) {
          // Remove unit from queue (exhausts movement for turn)
          this.game.removeUnitFromQueue(currentUnit.id);
        }
        break;

      // Numeric keypad movement (8 directions)
      case '1':
        event.preventDefault();
        this.handleUnitMovement(-1, 1); // Southwest
        break;
      case '2':
        event.preventDefault();
        this.handleUnitMovement(0, 1); // South
        break;
      case '3':
        event.preventDefault();
        this.handleUnitMovement(1, 1); // Southeast
        break;
      case '4':
        event.preventDefault();
        this.handleUnitMovement(-1, 0); // West
        break;
      case '6':
        event.preventDefault();
        this.handleUnitMovement(1, 0); // East
        break;
      case '7':
        event.preventDefault();
        this.handleUnitMovement(-1, -1); // Northwest
        break;
      case '8':
        event.preventDefault();
        this.handleUnitMovement(0, -1); // North
        break;
      case '9':
        event.preventDefault();
        this.handleUnitMovement(1, -1); // Northeast
        break;

      case 'Enter':
        event.preventDefault();
        // End turn when Enter is pressed
        this.game.endTurn();
        break;

      // Zoom disabled - do nothing
      case '+':
      case '=':
      case '-':
        break;
    }
  }

  // Handle build city command
  private handleBuildCity(): void {
    const selectedUnit = this.gameRenderer.getSelectedUnit();
    if (selectedUnit && selectedUnit.type === 'settler') {
      // Prompt for city name
      const cityName = prompt('Enter city name:', 'New City');
      if (cityName) {
        const success = this.game.foundCity(selectedUnit.id, cityName);
        if (success) {
          this.gameRenderer.clearSelections();
          this.requestRender();
        }
      }
    }
  }

  // Center view on position
  public centerView(x: number, y: number): void {
    const renderContext = this.renderer.getRenderContext();
    const centerX = x - (renderContext.canvas.width / renderContext.tileSize) / 2;
    const centerY = y - (renderContext.canvas.height / renderContext.tileSize) / 2;
    
    this.renderer.setViewport(centerX, centerY);
    this.requestRender();
  }

  // Get current mouse world position
  public getMouseWorldPosition(): { x: number, y: number } | null {
    return this.renderer.screenToWorld(this.lastMousePos.x, this.lastMousePos.y);
  }

  // Handle unit movement with arrow keys
  private handleUnitMovement(deltaX: number, deltaY: number): void {
    // Get the currently selected unit from the game's unit queue system
    const currentUnit = this.game.getCurrentUnit();
    
    if (!currentUnit) {
      // No unit selected, do nothing
      return;
    }

    // Check if unit belongs to current player
    const gameState = this.game.getGameState();
    if (currentUnit.playerId !== gameState.currentPlayer) {
      // Can't move units that don't belong to current player
      return;
    }

    // Check if unit has movement points
    if (currentUnit.movementPoints <= 0) {
      // Unit can't move, skip to next unit in queue
      this.game.selectNextUnit();
      return;
    }

    // Calculate new position
    const newPosition = {
      x: currentUnit.position.x + deltaX,
      y: currentUnit.position.y + deltaY
    };

    // Attempt to move the unit
    const success = this.game.moveUnit(currentUnit.id, newPosition);
    
    if (success) {
      // Only center camera if the unit moved outside the current viewport
      if (!this.isPositionVisible(newPosition.x, newPosition.y)) {
        this.renderer.centerOn(newPosition.x, newPosition.y);
      }
      this.requestRender();
    }
    
    // If unit exhausted movement points, it will be automatically removed from queue
    // and next unit will be selected by the Game class
  }

  // Normalize position coordinates with horizontal wrapping
  private normalizePosition(position: { x: number, y: number }, gameState: any): { x: number, y: number } {
    const mapWidth = gameState.worldMap[0]?.length || 80;
    const mapHeight = gameState.worldMap.length || 50;

    let { x, y } = position;
    
    // Wrap horizontally
    x = ((x % mapWidth) + mapWidth) % mapWidth;
    
    // Clamp vertically (no wrapping)
    y = Math.max(0, Math.min(y, mapHeight - 1));

    return { x, y };
  }

  // Check if a world position is visible in the current viewport
  private isPositionVisible(worldX: number, worldY: number): boolean {
    const visibleRange = this.renderer.getVisibleTileRange();
    const gameState = this.game.getGameState();
    const mapWidth = gameState.worldMap[0]?.length || 80;
    
    // Handle horizontal wrapping for X coordinate
    const normalizedX = ((worldX % mapWidth) + mapWidth) % mapWidth;
    
    // Check if X is within visible range (considering wrapping)
    let xVisible = false;
    if (visibleRange.startX >= 0 && visibleRange.endX <= mapWidth) {
      // Normal case - no wrapping in visible range
      xVisible = normalizedX >= visibleRange.startX && normalizedX <= visibleRange.endX;
    } else {
      // Visible range wraps around the map edge
      const wrappedStartX = ((visibleRange.startX % mapWidth) + mapWidth) % mapWidth;
      const wrappedEndX = ((visibleRange.endX % mapWidth) + mapWidth) % mapWidth;
      
      if (wrappedStartX <= wrappedEndX) {
        xVisible = normalizedX >= wrappedStartX && normalizedX <= wrappedEndX;
      } else {
        // Range crosses the wrap boundary
        xVisible = normalizedX >= wrappedStartX || normalizedX <= wrappedEndX;
      }
    }
    
    // Check if Y is within visible range (no wrapping for Y)
    const yVisible = worldY >= visibleRange.startY && worldY <= visibleRange.endY;
    
    return xVisible && yVisible;
  }
}
