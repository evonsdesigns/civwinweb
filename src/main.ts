import './style.css';
import { Game } from './game/Game.js';
import { Renderer } from './renderer/Renderer.js';
import { GameRenderer } from './renderer/GameRenderer.js';
import { InputHandler } from './utils/InputHandler.js';
import { MapScenario } from './types/game.js';

class CivWinApp {
  private game: Game;
  private renderer: Renderer;
  private gameRenderer: GameRenderer;
  private inputHandler: InputHandler;
  private canvas: HTMLCanvasElement;
  private currentScenario: MapScenario = 'random';

  constructor() {
    // Get canvas element
    this.canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize game systems
    this.game = new Game();
    this.renderer = new Renderer(this.canvas);
    this.gameRenderer = new GameRenderer(this.renderer);
    this.inputHandler = new InputHandler(
      this.game, 
      this.gameRenderer, 
      this.renderer, 
      this.canvas,
      () => this.requestRender()
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

    // Scenario selection
    const scenarioSelect = document.querySelector<HTMLSelectElement>('#scenario-select');
    if (scenarioSelect) {
      scenarioSelect.addEventListener('change', () => {
        this.currentScenario = scenarioSelect.value as MapScenario;
        this.initializeGame(); // Restart game with new scenario
      });
    }

    // New game button
    const newGameBtn = document.querySelector<HTMLButtonElement>('#new-game-btn');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        this.initializeGame(); // Restart game with current scenario
      });
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

    // Update current player info
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    if (currentPlayer) {
      const gameInfo = document.querySelector('#game-info');
      if (gameInfo) {
        const existingPlayerInfo = gameInfo.querySelector('.player-info');
        if (existingPlayerInfo) {
          existingPlayerInfo.remove();
        }

        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        playerInfo.innerHTML = `
          <span>Current: ${currentPlayer.name}</span>
          <span>Gold: ${currentPlayer.gold}</span>
          <span>Science: ${currentPlayer.science}</span>
        `;
        gameInfo.appendChild(playerInfo);
      }
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
  }
}

// Initialize and start the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new CivWinApp();
  app.start();

  // Make app globally accessible for debugging
  (window as any).civWinApp = app;
});
