import './style.css';
import { Game } from './game/Game.js';
import { Renderer } from './renderer/Renderer.js';
import { GameRenderer } from './renderer/GameRenderer.js';
import { Minimap } from './renderer/Minimap.js';
import { InputHandler } from './utils/InputHandler.js';
import { MapScenario } from './types/game.js';

class CivWinApp {
  private game: Game;
  private renderer: Renderer;
  private gameRenderer: GameRenderer;
  private minimap: Minimap;
  private inputHandler: InputHandler;
  private canvas: HTMLCanvasElement;
  private minimapCanvas: HTMLCanvasElement;
  private currentScenario: MapScenario = 'random';

  constructor() {
    // Get canvas elements
    this.canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap-canvas')!;
    if (!this.minimapCanvas) {
      throw new Error('Minimap canvas element not found');
    }

    // Initialize game systems
    this.game = new Game();
    this.renderer = new Renderer(this.canvas);
    this.gameRenderer = new GameRenderer(this.renderer);
    this.minimap = new Minimap(this.minimapCanvas, this.renderer, () => this.requestRender());
    this.inputHandler = new InputHandler(
      this.game, 
      this.gameRenderer, 
      this.renderer, 
      this.canvas,
      () => this.requestRender(),
      () => this.minimap.toggle()
    );

    // Setup game event listeners BEFORE initializing the game
    this.setupGameEventListeners();

    // Setup UI event listeners
    this.setupUIEventListeners();

    // Initialize the game (this will emit events)
    this.initializeGame();

    // Handle canvas resizing
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    // Make input handler accessible for debugging
    (window as any).inputHandler = this.inputHandler;

    // Trigger initial render
    this.requestRender();
  }

  // Initialize the game with default players and current scenario
  private initializeGame(): void {
    console.log(`Initializing game with ${this.currentScenario} scenario`);
    const playerNames = ['Player', 'AI Player 1', 'AI Player 2'];
    this.game.initializeGame(playerNames, this.currentScenario);
    console.log('Game initialization completed');
  }

  // Setup game event listeners
  private setupGameEventListeners(): void {
    console.log('Setting up game event listeners');
    this.game.on('gameInitialized', (gameState: any) => {
      console.log('Game initialized event received', gameState);
      this.updateUI();
      this.requestRender();
    });

    this.game.on('turnEnded', (gameState: any) => {
      console.log('Turn ended', gameState);
      this.updateUI();
      this.requestRender();
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

    this.game.on('gamePhaseChanged', (phase: any) => {
      console.log('Game phase changed', phase);
      this.updateUI();
      this.requestRender();
    });
  }

  // Setup UI event listeners
  private setupUIEventListeners(): void {
    // Menu bar functionality
    this.setupMenuBar();

    // End turn button
    const endTurnBtn = document.querySelector<HTMLButtonElement>('#end-turn-btn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => {
        this.game.endTurn();
        this.requestRender();
      });
    }

    // Pause button
    const pauseBtn = document.querySelector<HTMLButtonElement>('#pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.game.togglePause();
        this.requestRender();
      });
    }
  }

  // Setup menu bar functionality
  private setupMenuBar(): void {
    // Handle menu hover and click states
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(menuItem => {
      const menuLabel = menuItem.querySelector('.menu-label');
      
      if (menuLabel) {
        // Show dropdown on hover
        menuItem.addEventListener('mouseenter', () => {
          // Close other open menus
          menuItems.forEach(item => item.classList.remove('active'));
          menuItem.classList.add('active');
        });
      }
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#menu-bar')) {
        menuItems.forEach(item => item.classList.remove('active'));
      }
    });

    // Handle menu item clicks
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

  // Handle canvas resizing
  private handleResize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const newWidth = rect.width - 20;
      const newHeight = rect.height - 100;
      console.log(`handleResize: container=${rect.width}x${rect.height}, canvas will be ${newWidth}x${newHeight}`);
      this.renderer.resize(newWidth, newHeight); // Account for UI elements
      this.requestRender();
    } else {
      console.log('handleResize: no container found');
    }
  }

  // Request a render on the next frame
  public requestRender(): void {
    console.log('Render requested');
    requestAnimationFrame(() => this.render());
  }

  // Start the game (render initial state)
  public start(): void {
    this.requestRender();
  }

  // Render the game (only when needed)
  private render(): void {
    console.log('Render called');

    const gameState = this.game.getGameState();
    console.log('Rendering game state:', {
      worldMapSize: `${gameState.worldMap.length}x${gameState.worldMap[0]?.length || 0}`,
      turn: gameState.turn,
      canvasSize: `${this.canvas.width}x${this.canvas.height}`
    });
    this.gameRenderer.render(gameState);
    this.minimap.updateGameState(gameState);
  }
}

// Initialize and start the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new CivWinApp();
  app.start();

  // Make app globally accessible for debugging
  (window as any).civWinApp = app;
});
