import './style.css';
import { Game } from './game/Game.js';
import { Renderer } from './renderer/Renderer.js';
import { GameRenderer } from './renderer/GameRenderer.js';
import { UnitSprites } from './renderer/UnitSprites.js';
import { CitySprites } from './renderer/CitySprites.js';
import { CityView } from './renderer/CityView.js';
import { Minimap } from './renderer/Minimap.js';
import { Status } from './renderer/Status.js';
import { InputHandler } from './utils/InputHandler.js';
import { MusicPlayer } from './utils/MusicPlayer.js';
import { UITemplateManager } from './utils/UITemplateManager.js';
import { MapScenario, UnitType } from './types/game.js';

class CivWinApp {
  private game: Game;
  private renderer: Renderer;
  private gameRenderer: GameRenderer;
  private minimap: Minimap;
  private status: Status;
  private cityView: CityView;
  private inputHandler: InputHandler;
  private musicPlayer: MusicPlayer;
  private canvas: HTMLCanvasElement;
  private minimapCanvas: HTMLCanvasElement;
  private currentScenario: MapScenario = 'random';

  constructor() {
    /** Get canvas elements */
    this.canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap-canvas')!;
    if (!this.minimapCanvas) {
      throw new Error('Minimap canvas element not found');
    }

    /** Initialize game systems */
    this.game = new Game();
    this.renderer = new Renderer(this.canvas);
    this.gameRenderer = new GameRenderer(this.renderer);
    this.minimap = new Minimap(this.minimapCanvas, this.renderer, () => this.requestRender());
    this.status = new Status();
    this.cityView = new CityView(this.game);
    this.musicPlayer = new MusicPlayer();
    this.inputHandler = new InputHandler(
      this.game, 
      this.gameRenderer, 
      this.renderer, 
      this.canvas,
      () => this.requestRender(),
      () => this.minimap.toggle(),
      this.status,
      this.cityView
    );

    /** Setup game event listeners BEFORE initializing the game */
    this.setupGameEventListeners();

    /** Setup UI event listeners */
    this.setupUIEventListeners();

    /** Initialize the game (this will emit events) */
    this.initializeGame();

    /** Handle canvas resizing */
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    /** Make input handler accessible for debugging */
    (window as any).inputHandler = this.inputHandler;
    (window as any).musicPlayer = this.musicPlayer;

    /** Trigger initial render */
    this.requestRender();

    /** Auto-start music player after a short delay */
    setTimeout(() => {
      this.musicPlayer.autoStart();
    }, 2000);
  }

  /**
   * Initialize the game with default players and current scenario
   */
  private initializeGame(): void {
    console.log(`Initializing game with ${this.currentScenario} scenario`);
    const playerNames = ['Player', 'AI Player 1', 'AI Player 2'];
    this.game.initializeGame(playerNames, this.currentScenario);
    console.log('Game initialization completed');
  }

  /**
   * Setup game event listeners
   */
  private setupGameEventListeners(): void {
    console.log('Setting up game event listeners');
    this.game.on('gameInitialized', (gameState: any) => {
      console.log('Game initialized event received', gameState);
      this.updateUI();
      this.requestRender();
      
      /** Preload unit and city sprites for all players */
      this.preloadSprites(gameState);
    });

    this.game.on('turnEnded', (gameState: any) => {
      console.log('Turn ended', gameState);
      /** Clear end of turn state when new turn begins */
      this.status.setEndOfTurnState(false);
      this.updateUI();
      this.requestRender();
    });

    this.game.on('aiTurnStarted', (data: any) => {
      console.log('AI turn started', data);
      this.handleAITurnStarted(data);
    });

    this.game.on('aiTurnEnded', (data: any) => {
      console.log('AI turn ended', data);
      this.handleAITurnEnded(data);
    });

    this.game.on('humanTurnStarted', (data: any) => {
      console.log('Human turn started', data);
      this.handleHumanTurnStarted(data);
    });

    this.game.on('unitMoved', (data: any) => {
      console.log('Unit moved', data);
      this.requestRender();
    });

    this.game.on('cityFounded', (city: any) => {
      console.log('City founded', city);
      this.updateUI();
      this.requestRender();
    });

    this.game.on('unitSelected', (data: any) => {
      console.log('Unit selected from queue', data);
      this.handleUnitSelected(data);
    });

    this.game.on('unitDeselected', () => {
      console.log('Unit deselected');
      this.handleUnitDeselected();
    });

    this.game.on('unitBlink', () => {
      this.handleUnitBlink();
    });

    this.game.on('endOfTurn', () => {
      console.log('End of turn - no more units to move');
      this.handleEndOfTurn();
    });

    this.game.on('gamePhaseChanged', (phase: any) => {
      console.log('Game phase changed', phase);
      this.updateUI();
      this.requestRender();
    });
  }

  /**
   * Setup UI event listeners
   */
  private setupUIEventListeners(): void {
    this.setupMenuBar();

    const endTurnBtn = document.querySelector<HTMLButtonElement>('#end-turn-btn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => {
        this.game.endTurn();
        this.requestRender();
      });
    }

    const pauseBtn = document.querySelector<HTMLButtonElement>('#pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.game.togglePause();
        this.requestRender();
      });
    }
  }

  /**
   * Setup menu bar functionality
   */
  private setupMenuBar(): void {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(menuItem => {
      const menuLabel = menuItem.querySelector('.menu-label');
      
      if (menuLabel) {
        menuItem.addEventListener('mouseenter', () => {
          menuItems.forEach(item => item.classList.remove('active'));
          menuItem.classList.add('active');
        });
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#menu-bar')) {
        menuItems.forEach(item => item.classList.remove('active'));
      }
    });

    this.setupMenuActions();
  }

  // Setup individual menu actions
  private setupMenuActions(): void {
    // File menu
    this.addMenuAction('new-game', () => {
      console.log('New Game clicked');
      this.initializeGame();
    });

    this.addMenuAction('new-scenario', () => {
      console.log('New Scenario clicked');
      this.showScenarioModal();
    });

    this.addMenuAction('load-game', () => {
      console.log('Load Game clicked');
      // TODO: Implement load game functionality
      alert('Load Game feature coming soon!');
    });

    this.addMenuAction('save-game', () => {
      console.log('Save Game clicked');
      // TODO: Implement save game functionality
      alert('Save Game feature coming soon!');
    });

    this.addMenuAction('quit', () => {
      console.log('Quit clicked');
      if (confirm('Are you sure you want to quit?')) {
        window.close();
      }
    });

    // Edit menu
    this.addMenuAction('undo', () => {
      console.log('Undo clicked');
      alert('Undo feature coming soon!');
    });

    this.addMenuAction('redo', () => {
      console.log('Redo clicked');
      alert('Redo feature coming soon!');
    });

    this.addMenuAction('preferences', () => {
      console.log('Preferences clicked');
      alert('Preferences feature coming soon!');
    });

    // Orders menu
    this.addMenuAction('move-unit', () => {
      console.log('Move Unit clicked');
      alert('Unit movement via menu coming soon!');
    });

    this.addMenuAction('attack', () => {
      console.log('Attack clicked');
      alert('Attack command coming soon!');
    });

    this.addMenuAction('fortify', () => {
      console.log('Fortify clicked');
      alert('Fortify command coming soon!');
    });

    // Advisors menu
    this.addMenuAction('domestic-advisor', () => {
      console.log('Domestic Advisor clicked');
      alert('Domestic Advisor coming soon!');
    });

    this.addMenuAction('foreign-advisor', () => {
      console.log('Foreign Advisor clicked');
      alert('Foreign Advisor coming soon!');
    });

    // World menu
    this.addMenuAction('world-map', () => {
      console.log('World Map clicked');
      this.minimap.toggle();
    });

    this.addMenuAction('demographics', () => {
      console.log('Demographics clicked');
      alert('Demographics view coming soon!');
    });

    // Civilopedia menu
    this.addMenuAction('complete-civilopedia', () => {
      console.log('Complete Civilopedia clicked');
      alert('Civilopedia coming soon!');
    });

    // City menu
    this.addMenuAction('view-city', () => {
      console.log('View City clicked');
      alert('City view coming soon!');
    });

    // Help menu
    this.addMenuAction('help-index', () => {
      console.log('Help Index clicked');
      alert('Help system coming soon!');
    });

    this.addMenuAction('about', () => {
      console.log('About clicked');
      alert('CivWin - A Civilization-like game built with TypeScript and HTML5 Canvas\n\nVersion 1.0\nDeveloped with Vite and modern web technologies');
    });
  }

  // Helper method to add menu action listeners
  private addMenuAction(id: string, callback: () => void): void {
    const element = document.querySelector(`#${id}`);
    if (element) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
        // Close all menus after action
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
      });
    }
  }

  // Show scenario selection modal
  private showScenarioModal(): void {
    const modal = document.querySelector('#scenario-modal') as HTMLElement;
    if (modal) {
      modal.classList.add('active');
      
      // Setup modal event listeners
      this.setupScenarioModalListeners();
    }
  }

  // Hide scenario selection modal
  private hideScenarioModal(): void {
    const modal = document.querySelector('#scenario-modal') as HTMLElement;
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Setup scenario modal event listeners
  private setupScenarioModalListeners(): void {
    console.log('Setting up scenario modal listeners');
    
    // Use event delegation on the modal container to avoid cloning issues
    const modal = document.querySelector('#scenario-modal');
    if (!modal) {
      console.error('Modal not found');
      return;
    }

    // Remove any existing listeners by cloning the modal (this preserves content)
    const newModal = modal.cloneNode(true);
    modal.parentNode?.replaceChild(newModal, modal);

    // Add event listener using event delegation
    newModal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      console.log('Modal click:', target.id, target.textContent);
      
      // Handle close and cancel buttons
      if (target.id === 'scenario-modal-close' || target.id === 'scenario-cancel') {
        console.log('Closing modal');
        this.hideScenarioModal();
        return;
      }
      
      // Handle start game button
      if (target.id === 'scenario-start') {
        console.log('Start Game button clicked');
        const selectedScenario = document.querySelector('input[name="scenario"]:checked') as HTMLInputElement;
        if (selectedScenario) {
          const scenarioValue = selectedScenario.value as MapScenario;
          this.currentScenario = scenarioValue;
          console.log(`Starting new game with ${scenarioValue} scenario`);
          
          // Initialize the game with the selected scenario
          this.initializeGame();
          
          // Hide the modal
          this.hideScenarioModal();
          
          // Force a re-render
          this.requestRender();
        } else {
          console.error('No scenario selected');
        }
        return;
      }
      
      // Close modal when clicking on overlay background
      if (target === newModal) {
        console.log('Clicked on modal overlay, closing');
        this.hideScenarioModal();
      }
    });
  }

  // Preload unit and city sprites for better performance
  private async preloadSprites(gameState: any): Promise<void> {
    try {
      // Extract player colors from game state
      const playerColors = gameState.players.map((player: any) => player.color);
      
      // Define unit types that have custom sprites
      const unitTypesWithSprites = [UnitType.SETTLER];
      
      // Preload unit sprites for all player colors and unit types
      await UnitSprites.preloadSprites(unitTypesWithSprites, playerColors, 48);
      
      // Preload city sprites for all player colors
      await CitySprites.preloadSprites(playerColors, 48);
      
      console.log('Unit and city sprites preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload sprites:', error);
    }
  }

  // Update UI elements
  private updateUI(): void {
    const gameState = this.game.getGameState();
    
    // Update turn counter
    const turnCounter = document.querySelector('#turn-counter');
    if (turnCounter) {
      turnCounter.textContent = `Turn: ${gameState.turn}`;
    }

    // Update score
    const scoreElement = document.querySelector('#score');
    if (scoreElement) {
      scoreElement.textContent = `Score: ${gameState.score}`;
    }

    // Update year (calculate based on turn, starting from 4000 BC)
    const yearElement = document.querySelector('#year');
    if (yearElement) {
      const year = 4000 - (gameState.turn - 1) * 20; // Each turn is 20 years
      const yearText = year > 0 ? `${year} BC` : `${Math.abs(year)} AD`;
      yearElement.textContent = yearText;
    }

    // Update current player info (remove this section as we moved it to status bar)
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    if (currentPlayer) {
      // Add player info to status bar if needed
      // For now, we'll keep the basic info in the status bar
    }
  }

  // Check if a world position is visible in the current viewport
  private isUnitPositionVisible(worldX: number, worldY: number): boolean {
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

  // Handle canvas resizing
  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
    this.requestRender();
  }

  // Handle AI turn start
  private handleAITurnStarted(data: { playerId: string, playerName: string }): void {
    console.log(`AI Player ${data.playerName} (${data.playerId}) turn started`);
    // Update the status window to show AI turn message
    this.status.showAIPlayerMessage();
    this.requestRender();
  }

  // Handle AI turn end
  private handleAITurnEnded(data: { playerId: string, playerName: string }): void {
    console.log(`AI Player ${data.playerName} (${data.playerId}) turn ended`);
    
    // Update game state in status window to reflect the new current player
    this.status.updateGameState(this.game.getGameState());
    
    this.updateUI();
    this.requestRender();
  }

  // Handle human turn start
  private handleHumanTurnStarted(data: { playerId: string }): void {
    console.log(`Human player turn started: ${data.playerId}`);
    
    // Update game state in status window to ensure it knows we're now in human turn
    this.status.updateGameState(this.game.getGameState());
    
    // Clear end of turn state if it was set
    this.status.setEndOfTurnState(false);
    
    this.updateUI();
    this.requestRender();
  }

  // Handle unit selection from queue
  private handleUnitSelected(data: { unit: any, unitIndex: number, totalUnits: number }): void {
    const { unit } = data;
    
    // Select the unit in the game renderer
    this.gameRenderer.selectUnit(unit);
    
    // Only center camera if the unit is outside the current viewport
    if (!this.isUnitPositionVisible(unit.position.x, unit.position.y)) {
      this.renderer.centerOn(unit.position.x, unit.position.y);
    }
    
    // Update status window
    this.status.setSelectedUnit(unit);
    
    // Re-render to show selection and camera position
    this.requestRender();
    
    console.log(`Selected unit ${unit.id} at position (${unit.position.x}, ${unit.position.y})`);
  }

  // Handle unit deselection
  private handleUnitDeselected(): void {
    this.gameRenderer.clearSelections();
    this.status.setSelectedUnit(null);
    this.requestRender();
  }

  // Handle unit blinking effect
  private handleUnitBlink(): void {
    this.gameRenderer.toggleUnitBlink();
    this.requestRender();
  }

  // Handle end of turn state
  private handleEndOfTurn(): void {
    this.status.setEndOfTurnState(true);
    this.requestRender();
  }

  // Request a render on the next frame
  public requestRender(): void {
    requestAnimationFrame(() => this.render());
  }

  public start(): void {
    this.requestRender();
  }

  // Render the game (only when needed)
  private render(): void {
    const gameState = this.game.getGameState();
    console.debug('Rendering game state:', {
      worldMapSize: `${gameState.worldMap.length}x${gameState.worldMap[0]?.length || 0}`,
      turn: gameState.turn,
      canvasSize: `${this.canvas.width}x${this.canvas.height}`
    });
    this.gameRenderer.render(gameState);
    this.minimap.updateGameState(gameState);
    this.status.updateGameState(gameState);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load UI templates first
    const templateManager = UITemplateManager.getInstance();
    await templateManager.loadAllTemplates();
    
    // Initialize the app after templates are loaded
    const app = new CivWinApp();
    app.start();

    // Make app globally accessible for debugging
    (window as any).civWinApp = app;
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Show user-friendly error message
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a1a; color: white; font-family: Arial, sans-serif;">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h1>🚧 Loading Error</h1>
          <p>Failed to load game templates. Please refresh the page to try again.</p>
          <p style="font-size: 12px; color: #888; margin-top: 20px;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
});
