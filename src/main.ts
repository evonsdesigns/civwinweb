import './style.css';
import { Game } from './game/Game.js';
import { Renderer } from './renderer/Renderer.js';
import { GameRenderer } from './renderer/GameRenderer.js';
import { UnitSprites } from './renderer/UnitSprites.js';
import { CitySprites } from './renderer/CitySprites.js';
import { TechnologySprites } from './renderer/TechnologySprites.js';
import { CityView } from './renderer/CityView.js';
import { Minimap } from './renderer/Minimap.js';
import { Status } from './renderer/Status.js';
import { InputHandler } from './utils/InputHandler.js';
import { MusicPlayer } from './utils/MusicPlayer.js';
import { UITemplateManager } from './utils/UITemplateManager.js';
import { SettingsManager } from './utils/SettingsManager.js';
import { SoundEffects } from './utils/SoundEffects.js';
import { TechnologyUI } from './utils/TechnologyUI.js';
import { ScienceAdvisorModal } from './renderer/ScienceAdvisorModal.js';
import { TechnologyDiscoveryModal } from './renderer/TechnologyDiscoveryModal.js';
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
  private settingsManager: SettingsManager;
  private scienceAdvisorModal: ScienceAdvisorModal | null = null;
  private technologyDiscoveryModal: TechnologyDiscoveryModal | null = null;
  private isTechnologyDiscoveryInProgress = false; // Flag to prevent science advisor popup during discovery
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
    this.status = new Status(this.game);
    this.cityView = new CityView(this.game);
    this.musicPlayer = new MusicPlayer();
    this.settingsManager = SettingsManager.getInstance();
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
    (window as any).settingsManager = this.settingsManager;

    /** Trigger initial render */
    this.requestRender();

    /** Auto-start music player after a short delay */
    setTimeout(() => {
      this.musicPlayer.autoStart();
      // Music player will load its own volume from settings
    }, 2000);

    /** Setup event listeners for volume synchronization */
    document.addEventListener('musicVolumeChanged', () => {
      this.syncSettingsModalWithMusicPlayer();
    });

    // Example usage of SettingsManager:
    // const volume = this.settingsManager.getSetting('masterVolume');
    // this.settingsManager.setSetting('showGrid', true);
    // const allSettings = this.settingsManager.getSettings();
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

    this.game.on('researchSelectionRequired', (data: any) => {
      console.log('Research selection required', data);
      this.handleResearchSelectionRequired(data);
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

    // Listen for unit selection from city modal
    document.addEventListener('cityUnitSelected', (event: any) => {
      this.handleCityUnitSelected(event.detail.unit);
    });
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

    this.addMenuAction('settings', () => {
      console.log('Settings clicked');
      this.showSettingsModal();
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

    this.addMenuAction('science-advisor', () => {
      console.log('Science Advisor clicked');
      console.log('Game instance:', this.game);
      console.log('TechnologyUI:', TechnologyUI);
      
      if (this.game) {
        try {
          TechnologyUI.handleTechnologyShortcut(this.game);
          console.log('TechnologyUI.handleTechnologyShortcut called successfully');
        } catch (error) {
          console.error('Error calling TechnologyUI.handleTechnologyShortcut:', error);
        }
      } else {
        console.warn('No game instance available');
        alert('Please start a game first!');
      }
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
      modal.style.display = 'flex';
      modal.classList.add('active');
      
      // Setup modal event listeners
      this.setupScenarioModalListeners();
    }
  }

  // Hide scenario selection modal
  private hideScenarioModal(): void {
    const modal = document.querySelector('#scenario-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  // Show settings modal
  private showSettingsModal(): void {
    const modal = document.querySelector('#settings-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
      
      // Setup modal event listeners
      this.setupSettingsModalListeners();
      
      // Load current settings
      this.loadCurrentSettings();
      
      // Sync music player volume with settings
      if (this.musicPlayer) {
        this.musicPlayer.syncVolumeWithSettings();
      }
    }
  }

  // Hide settings modal
  private hideSettingsModal(): void {
    const modal = document.querySelector('#settings-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
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

    // Add keyboard handler for Enter/Space to start game
    const keydownHandler = (event: KeyboardEvent) => {
      if (newModal && (newModal as HTMLElement).style.display === 'flex') {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
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
            
            document.removeEventListener('keydown', keydownHandler);
          }
        }
      }
    };
    document.addEventListener('keydown', keydownHandler);
  }

  // Setup settings modal event listeners
  private setupSettingsModalListeners(): void {
    console.log('Setting up settings modal listeners');
    
    const modal = document.querySelector('#settings-modal');
    if (!modal) {
      console.error('Settings modal not found');
      return;
    }

    // Remove any existing listeners by cloning the modal
    const newModal = modal.cloneNode(true);
    modal.parentNode?.replaceChild(newModal, modal);

    // Add event listener using event delegation
    newModal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      console.log('Settings modal click:', target.id, target.textContent);
      
      // Handle close and cancel buttons
      if (target.id === 'settings-modal-close' || target.id === 'settings-cancel') {
        console.log('Closing settings modal');
        this.hideSettingsModal();
        return;
      }
      
      // Handle apply button
      if (target.id === 'settings-apply') {
        console.log('Apply settings button clicked');
        this.applySettings();
        this.hideSettingsModal();
        return;
      }
      
      // Handle reset button
      if (target.id === 'settings-reset') {
        console.log('Reset settings button clicked');
        this.resetSettingsToDefaults();
        return;
      }
      
      // Close modal when clicking on overlay background
      if (target === newModal) {
        console.log('Clicked on settings modal overlay, closing');
        this.hideSettingsModal();
      }
    });

    // Add keyboard handler for Enter/Space to apply settings
    const keydownHandler = (event: KeyboardEvent) => {
      if (newModal && (newModal as HTMLElement).style.display === 'flex') {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.applySettings();
          this.hideSettingsModal();
          document.removeEventListener('keydown', keydownHandler);
        }
      }
    };
    document.addEventListener('keydown', keydownHandler);

    // Handle range input updates
    newModal.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'range') {
        const valueSpan = (newModal as HTMLElement).querySelector('.volume-value');
        if (valueSpan && target.id === 'master-volume') {
          valueSpan.textContent = `${target.value}%`;
          
          // Update the master volume setting in real-time
          const newVolume = parseInt(target.value);
          this.settingsManager.updateSettings({ masterVolume: newVolume });
          
          // Update music volume immediately
          if (this.musicPlayer) {
            this.musicPlayer.setVolume(newVolume / 100);
          }
          
          // Play a test sound to demonstrate the new volume level
          SoundEffects.playVolumeTestSound();
        }
      }
    });

    // Add volume slider event listeners for live feedback
    this.setupVolumeSliderListeners(newModal);
  }

  /**
   * Setup volume slider listeners for live feedback
   */
  private setupVolumeSliderListeners(modal: Node): void {
    const modalElement = modal as HTMLElement;
    const masterVolumeSlider = modalElement.querySelector('#master-volume') as HTMLInputElement;
    const musicVolumeSlider = modalElement.querySelector('#music-volume') as HTMLInputElement;
    const effectsVolumeSlider = modalElement.querySelector('#effects-volume') as HTMLInputElement;
    
    const volumeValues = modalElement.querySelectorAll('.volume-value');
    
    // Master volume slider
    if (masterVolumeSlider) {
      masterVolumeSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (volumeValues[0]) {
          volumeValues[0].textContent = `${value}%`;
        }
      });
    }
    
    // Music volume slider
    if (musicVolumeSlider) {
      musicVolumeSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (volumeValues[1]) {
          volumeValues[1].textContent = `${value}%`;
        }
        
        // Live sync with music player without triggering settings save
        if (this.musicPlayer) {
          this.musicPlayer.updateVolumeUI(parseInt(value));
        }
      });
    }
    
    // Effects volume slider
    if (effectsVolumeSlider) {
      effectsVolumeSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (volumeValues[2]) {
          volumeValues[2].textContent = `${value}%`;
        }
        
        // Play test sound with new volume
        SoundEffects.playInvalidActionSound();
      });
    }
  }

  // Load current settings into the modal
  private loadCurrentSettings(): void {
    const settings = this.settingsManager.getSettings();

    // Load settings into form elements
    this.setCheckboxValue('show-grid', settings.showGrid);
    this.setCheckboxValue('unit-animations', settings.unitAnimations);
    this.setSelectValue('terrain-quality', settings.terrainQuality);
    this.setCheckboxValue('auto-save', settings.autoSave);
    this.setInputValue('turn-timer', settings.turnTimer.toString());
    this.setSelectValue('ai-speed', settings.aiSpeed);
    this.setInputValue('master-volume', settings.masterVolume.toString());
    this.setInputValue('music-volume', settings.musicVolume.toString());
    this.setInputValue('effects-volume', settings.effectsVolume.toString());
    this.setCheckboxValue('music-enabled', settings.musicEnabled);
    this.setCheckboxValue('sound-effects', settings.soundEffects);
    
    // Update volume displays
    const volumeValues = document.querySelectorAll('.volume-value');
    if (volumeValues.length >= 1) {
      volumeValues[0].textContent = `${settings.masterVolume}%`;
    }
    if (volumeValues.length >= 2) {
      volumeValues[1].textContent = `${settings.musicVolume}%`;
    }
    if (volumeValues.length >= 3) {
      volumeValues[2].textContent = `${settings.effectsVolume}%`;
    }
  }

  // Apply settings from the modal
  private applySettings(): void {
    const newSettings = {
      showGrid: this.getCheckboxValue('show-grid'),
      unitAnimations: this.getCheckboxValue('unit-animations'),
      terrainQuality: this.getSelectValue('terrain-quality') as 'low' | 'medium' | 'high',
      autoSave: this.getCheckboxValue('auto-save'),
      turnTimer: parseInt(this.getInputValue('turn-timer') || '60'),
      aiSpeed: this.getSelectValue('ai-speed') as 'slow' | 'normal' | 'fast',
      masterVolume: parseInt(this.getInputValue('master-volume') || '80'),
      musicVolume: parseInt(this.getInputValue('music-volume') || '70'),
      effectsVolume: parseInt(this.getInputValue('effects-volume') || '80'),
      musicEnabled: this.getCheckboxValue('music-enabled'),
      soundEffects: this.getCheckboxValue('sound-effects')
    };

    console.log('Applying settings:', newSettings);
    
    // Update settings through the manager
    this.settingsManager.updateSettings(newSettings);
    
    // Apply music volume immediately
    if (this.musicPlayer) {
      this.musicPlayer.setVolume(newSettings.musicVolume / 100);
    }
    
    // Play a test sound to demonstrate the new effects volume level
    SoundEffects.playVolumeTestSound();
    
    // Note: Sound effects volume is automatically applied when SoundEffects.playSound() is called
    // since it reads from SettingsManager each time
    
    // Force a re-render to apply visual changes
    this.requestRender();
    
    console.log('Settings applied successfully');
  }

  // Reset settings to defaults
  private resetSettingsToDefaults(): void {
    console.log('Resetting settings to defaults');
    
    // Reset through the settings manager
    this.settingsManager.resetToDefaults();
    
    // Reload settings in the modal
    this.loadCurrentSettings();
  }

  // Helper methods for form elements
  private setCheckboxValue(id: string, value: boolean): void {
    const element = document.querySelector(`#${id}`) as HTMLInputElement;
    if (element) {
      element.checked = value;
    }
  }

  private getCheckboxValue(id: string): boolean {
    const element = document.querySelector(`#${id}`) as HTMLInputElement;
    return element ? element.checked : false;
  }

  private setSelectValue(id: string, value: string): void {
    const element = document.querySelector(`#${id}`) as HTMLSelectElement;
    if (element) {
      element.value = value;
    }
  }

  private getSelectValue(id: string): string {
    const element = document.querySelector(`#${id}`) as HTMLSelectElement;
    return element ? element.value : '';
  }

  private setInputValue(id: string, value: string): void {
    const element = document.querySelector(`#${id}`) as HTMLInputElement;
    if (element) {
      element.value = value;
    }
  }

  private getInputValue(id: string): string {
    const element = document.querySelector(`#${id}`) as HTMLInputElement;
    return element ? element.value : '';
  }

  /**
   * Get the settings manager instance
   */
  public getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  /**
   * Test sound effects with current volume settings
   */
  public testSoundEffects(): void {
    SoundEffects.playInvalidActionSound();
  }

  /**
   * Initialize the Science Advisor modal
   */
  public initializeScienceAdvisorModal(): void {
    console.log('Initializing Science Advisor modal...');
    try {
      this.scienceAdvisorModal = new ScienceAdvisorModal();
      console.log('Science Advisor modal initialized successfully');
    } catch (error) {
      console.error('Error initializing Science Advisor modal:', error);
      this.scienceAdvisorModal = null;
    }
  }

  /**
   * Initialize the Technology Discovery modal
   */
  public initializeTechnologyDiscoveryModal(): void {
    console.log('Initializing Technology Discovery modal...');
    try {
      this.technologyDiscoveryModal = new TechnologyDiscoveryModal();
      console.log('Technology Discovery modal initialized successfully');
    } catch (error) {
      console.error('Error initializing Technology Discovery modal:', error);
      this.technologyDiscoveryModal = null;
    }
  }

  /**
   * Process game events that occurred during the turn
   */
  private processGameEvents(gameState: any): void {
    if (!gameState.events || gameState.events.length === 0) return;

    gameState.events.forEach((event: any) => {
      switch (event.type) {
        case 'technologyCompleted':
          this.handleTechnologyCompleted(event);
          break;
        // Add other event types as needed
      }
    });

    // Clear events after processing
    gameState.events = [];
  }

  /**
   * Handle technology completion event
   */
  private handleTechnologyCompleted(event: any): void {
    console.log('Technology completed:', event.technologyType, 'for player:', event.playerId);
    
    // Complete the research in the game
    const success = this.game.researchTechnology(event.playerId, event.technologyType);
    if (!success) {
      console.error('Failed to complete research for technology:', event.technologyType);
      return;
    }

    // Show discovery modal if this is a human player
    if (event.player && event.player.isHuman && this.technologyDiscoveryModal) {
      // Set flag to prevent automatic research selection during discovery
      this.isTechnologyDiscoveryInProgress = true;
      
      this.technologyDiscoveryModal.show(event.technologyType, () => {
        // Clear the flag when discovery modal is done
        this.isTechnologyDiscoveryInProgress = false;
        
        // After discovery modal closes, check if we need to prompt for new research
        const currentPlayer = this.game.getGameState().players.find(p => p.id === event.playerId);
        if (currentPlayer && currentPlayer.isHuman && !currentPlayer.currentResearch) {
          // Prompt for new research selection
          this.promptForNewResearch(currentPlayer);
        }
      });
    }
  }

  /**
   * Prompt player to select new research
   */
  private promptForNewResearch(player: any): void {
    // Use Science Advisor modal for research selection
    if (this.scienceAdvisorModal) {
      this.scienceAdvisorModal.show(this.game, player, (technologyType) => {
        // Set the selected technology as current research
        const success = this.game.setCurrentResearch(player.id, technologyType);
        if (success) {
          console.log(`Player ${player.id} set current research to: ${technologyType}`);
          this.updateUI();
        }
      });
    }
  }

  // Preload unit and city sprites for better performance
  private async preloadSprites(gameState: any): Promise<void> {
    try {
      // Extract player colors from game state
      const playerColors = gameState.players.map((player: any) => player.color);
      
      // Define unit types that have custom sprites
      const unitTypesWithSprites = [UnitType.SETTLERS];
      
      // Preload unit sprites for all player colors and unit types
      await UnitSprites.preloadSprites(unitTypesWithSprites, playerColors, 48);
      
      // Preload city sprites for all player colors
      await CitySprites.preloadSprites(playerColors, 48);
      
      // Preload technology sprites for the UI
      await TechnologySprites.preloadSprites(48);
      
      console.log('Unit, city, and technology sprites preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload sprites:', error);
    }
  }

  // Update UI elements
  private updateUI(): void {
    const gameState = this.game.getGameState();
    
    // Process game events first
    this.processGameEvents(gameState);
    
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

  // Handle research selection requirement
  private handleResearchSelectionRequired(data: { playerId: string, player: any }): void {
    console.log(`Research selection required for player: ${data.playerId}`);
    
    // Skip if technology discovery is currently in progress
    if (this.isTechnologyDiscoveryInProgress) {
      console.log('Skipping research selection - technology discovery in progress');
      return;
    }
    
    // Use Science Advisor modal for automatic prompts
    if (this.scienceAdvisorModal) {
      this.scienceAdvisorModal.show(this.game, data.player, (technologyType) => {
        // Set the selected technology as current research (don't immediately research it)
        const success = this.game.setCurrentResearch(data.playerId, technologyType);
        if (success) {
          console.log(`Player ${data.playerId} set current research to: ${technologyType}`);
          // Update UI to reflect the current research change
          this.updateUI();
        }
      });
    } else {
      console.error('Science Advisor modal not initialized, falling back to regular modal');
      // Fallback to regular modal
      TechnologyUI.openTechnologySelection(this.game, data.player, (technologyType) => {
        const success = this.game.setCurrentResearch(data.playerId, technologyType);
        if (success) {
          console.log(`Player ${data.playerId} set current research to: ${technologyType}`);
          this.updateUI();
        }
      });
    }
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

  // Handle unit selection from city modal
  private handleCityUnitSelected(unit: any): void {
    console.log('Unit selected from city modal:', unit.type, unit.id);
    
    // Wake and activate the unit in the game logic
    // This will unfortify the unit, add it to move queue, and make it current
    const activated = this.game.wakeAndActivateUnit(unit.id);
    
    if (activated) {
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
    } else {
      console.warn('Failed to activate unit:', unit.id);
    }
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
    const showGrid = this.settingsManager.getSetting('showGrid');
    
    console.debug('Rendering game state:', {
      worldMapSize: `${gameState.worldMap.length}x${gameState.worldMap[0]?.length || 0}`,
      turn: gameState.turn,
      canvasSize: `${this.canvas.width}x${this.canvas.height}`,
      showGrid
    });
    
    this.gameRenderer.render(gameState, showGrid);
    this.minimap.updateGameState(gameState);
    this.status.updateGameState(gameState);
  }

  /**
   * Sync the settings modal music volume slider with the music player's current volume
   */
  private syncSettingsModalWithMusicPlayer(): void {
    if (!this.musicPlayer) return;
    
    const settingsModal = document.querySelector('#settings-modal') as HTMLElement;
    if (!settingsModal || settingsModal.style.display === 'none') return;
    
    const musicVolumeSlider = settingsModal.querySelector('#music-volume') as HTMLInputElement;
    const volumeValues = settingsModal.querySelectorAll('.volume-value');
    
    if (musicVolumeSlider && volumeValues[1]) {
      const currentVolume = Math.round(this.musicPlayer.getVolume() * 100);
      musicVolumeSlider.value = currentVolume.toString();
      volumeValues[1].textContent = `${currentVolume}%`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load UI templates first
    const templateManager = UITemplateManager.getInstance();
    await templateManager.loadAllTemplates();
    
    // Initialize UI systems after templates are loaded
    console.log('Initializing TechnologyUI after templates are loaded...');
    TechnologyUI.initialize();
    
    // Initialize the app after templates are loaded
    const app = new CivWinApp();
    
    // Initialize Science Advisor modal after app is created
    app.initializeScienceAdvisorModal();
    
    // Initialize Technology Discovery modal after app is created
    app.initializeTechnologyDiscoveryModal();
    
    app.start();

    // Make app globally accessible for debugging
    (window as any).civWinApp = app;
    (window as any).testSoundEffects = () => app.testSoundEffects();
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
