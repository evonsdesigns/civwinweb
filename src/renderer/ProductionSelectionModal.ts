import { City, GameState, Player } from '../types/game';
import { Game } from '../game/Game';
import { ProductionManager, ProductionOption } from '../game/ProductionManager';
import { TemplateLoader } from '../utils/TemplateLoader';
import { UNIT_DEFINITIONS } from '../game/UnitDefinitions';

export class ProductionSelectionModal {
  private modal: HTMLElement | null = null;
  private productionList: HTMLElement | null = null;
  private militaryAdvice: HTMLElement | null = null;
  private domesticAdvice: HTMLElement | null = null;
  private cityNameElement: HTMLElement | null = null;
  private currentCity: City | null = null;
  private game: Game;
  private availableOptions: ProductionOption[] = [];
  private selectedOption: ProductionOption | null = null;
  private onSelectionCallback: ((option: ProductionOption) => void) | null = null;
  private keyboardHandler: (event: KeyboardEvent) => void = () => {};

  constructor(game: Game) {
    this.game = game;
    this.initializeModal();
  }

  private async initializeModal(): Promise<void> {
    try {
      // Load the template
      const template = await TemplateLoader.loadTemplate('/templates/production-selection-modal.html');
      
      // Create modal element
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = template;
      document.body.appendChild(modalContainer.firstElementChild!);

      // Get DOM elements
      this.modal = document.getElementById('production-selection-modal');
      this.productionList = document.getElementById('production-options-list');
      this.militaryAdvice = document.getElementById('military-advice');
      this.domesticAdvice = document.getElementById('domestic-advice');
      this.cityNameElement = document.getElementById('production-city-name');

      // Make modal focusable
      if (this.modal) {
        this.modal.setAttribute('tabindex', '-1');
      }

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize production selection modal:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.modal) return;

    // Button event listeners
    const helpBtn = document.getElementById('production-help-btn');
    const cancelBtn = document.getElementById('production-cancel-btn');
    const okBtn = document.getElementById('production-ok-btn');

    helpBtn?.addEventListener('click', () => this.handleHelp());
    cancelBtn?.addEventListener('click', () => this.handleCancel());
    okBtn?.addEventListener('click', () => this.handleOk());

    // Keyboard event listeners - bind to the modal itself, not document
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.isOpen()) return;
      
      // Stop the event immediately to prevent any other handlers from running
      event.preventDefault();
      event.stopImmediatePropagation();
      
      switch (event.key) {
        case 'Escape':
          this.handleCancel();
          break;
        case 'Enter':
        case ' ': // Spacebar
          this.handleOk();
          break;
        case 'ArrowUp':
          this.selectPreviousOption();
          break;
        case 'ArrowDown':
          this.selectNextOption();
          break;
      }
    };

    // Close on clicking outside modal
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.handleCancel();
      }
    });
  }

  public show(city: City, onSelection: (option: ProductionOption) => void): void {
    if (!this.modal) return;

    this.currentCity = city;
    this.onSelectionCallback = onSelection;
    this.selectedOption = null;

    // Update city name
    if (this.cityNameElement) {
      this.cityNameElement.textContent = `What shall we build in ${city.name}?`;
    }

    // Get available production options
    this.updateProductionOptions();

    // Update advisor recommendations
    this.updateAdvisorRecommendations();

    // Show modal
    this.modal.style.display = 'flex';
    
    // Add keyboard event listener with capture to intercept before other handlers
    document.addEventListener('keydown', this.keyboardHandler, { capture: true });
    
    // Focus the modal to ensure it can receive keyboard events
    this.modal.focus();
  }

  public hide(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    
    // Remove keyboard event listener when modal closes (with same options as when added)
    document.removeEventListener('keydown', this.keyboardHandler, { capture: true });
    
    this.currentCity = null;
    this.onSelectionCallback = null;
    this.selectedOption = null;
  }

  public isOpen(): boolean {
    return this.modal?.style.display === 'flex';
  }

  private updateProductionOptions(): void {
    if (!this.productionList || !this.currentCity) return;

    // Get game state and player
    const gameState = this.game.getGameState();
    const player = gameState.players.find(p => p.id === this.currentCity!.playerId);
    if (!player) return;

    // Get existing buildings
    const existingBuildings = this.currentCity.buildings.map(b => b.type as any);

    // Get available production options
    this.availableOptions = ProductionManager.getAvailableProduction(
      player.technologies,
      existingBuildings,
      this.calculateProductionCapacity(),
      this.currentCity.production_points
    );

    // Clear existing options
    this.productionList.innerHTML = '';

    // Add each option to the list
    this.availableOptions.forEach((option, index) => {
      const optionElement = this.createProductionOptionElement(option, index);
      this.productionList!.appendChild(optionElement);
    });

    // Select first option by default
    if (this.availableOptions.length > 0) {
      this.selectOption(this.availableOptions[0]);
    }
  }

  private createProductionOptionElement(option: ProductionOption, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'production-option';
    element.dataset.index = index.toString();

    // Check if this is the currently producing item
    const isCurrentlyProducing = this.currentCity?.production && 
      this.currentCity.production.type === option.type && 
      this.currentCity.production.item === option.id;
    
    if (isCurrentlyProducing) {
      element.classList.add('currently-producing');
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'production-option-name';
    nameSpan.textContent = option.name;
    
    if (isCurrentlyProducing) {
      nameSpan.textContent += ' 🛠️';
    }

    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'production-option-details';
    
    // Format details based on whether it's a unit or building
    if (option.type === 'unit') {
      // Get unit stats for ADM display
      const unitStats = this.getUnitStatsForOption(option.id as any);
      if (unitStats) {
        detailsSpan.textContent = `(${option.turns} turns, ADM:${unitStats.attack}/${unitStats.defense}/${unitStats.movement})`;
      } else {
        detailsSpan.textContent = `(${option.turns} turns)`;
      }
    } else {
      // Buildings just show turn count
      detailsSpan.textContent = `(${option.turns} turns)`;
    }

    element.appendChild(nameSpan);
    element.appendChild(detailsSpan);

    // Add click event listener
    element.addEventListener('click', () => {
      this.selectOption(option);
    });

    return element;
  }

  private getUnitStatsForOption(unitType: any): any {
    try {
      return UNIT_DEFINITIONS[unitType];
    } catch (error) {
      console.warn('Could not get unit stats for', unitType);
      return null;
    }
  }

  private selectOption(option: ProductionOption): void {
    this.selectedOption = option;

    // Update visual selection
    const allOptions = this.productionList?.querySelectorAll('.production-option');
    allOptions?.forEach(el => el.classList.remove('selected'));

    const selectedIndex = this.availableOptions.indexOf(option);
    const selectedElement = this.productionList?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.classList.add('selected');
    
    // Scroll selected element into view
    selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private selectPreviousOption(): void {
    if (this.availableOptions.length === 0) return;
    
    const currentIndex = this.selectedOption ? 
      this.availableOptions.indexOf(this.selectedOption) : 0;
    
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : this.availableOptions.length - 1;
    this.selectOption(this.availableOptions[previousIndex]);
  }

  private selectNextOption(): void {
    if (this.availableOptions.length === 0) return;
    
    const currentIndex = this.selectedOption ? 
      this.availableOptions.indexOf(this.selectedOption) : -1;
    
    const nextIndex = currentIndex < this.availableOptions.length - 1 ? currentIndex + 1 : 0;
    this.selectOption(this.availableOptions[nextIndex]);
  }

  private calculateProductionCapacity(): number {
    if (!this.currentCity) return 1;
    
    // Base production
    let production = 1;
    
    // Add production from buildings (match TurnManager logic)
    if (this.currentCity.buildings.some(b => b.type === 'barracks')) {
      production += 1;
    }
    
    // Add other building bonuses if needed
    // Factory, Manufacturing Plant, etc.
    
    return production;
  }

  private updateAdvisorRecommendations(): void {
    if (!this.currentCity || !this.militaryAdvice || !this.domesticAdvice) return;

    // Find military and domestic recommendations
    const militaryOptions = this.availableOptions.filter(opt => 
      opt.type === 'unit' && ['militia', 'warrior', 'phalanx', 'archer'].includes(opt.id)
    );
    
    const domesticOptions = this.availableOptions.filter(opt => 
      opt.type === 'building' && ['granary', 'temple', 'library'].includes(opt.id)
    );

    // Set military advice
    if (militaryOptions.length > 0) {
      const recommended = militaryOptions[0];
      this.militaryAdvice.textContent = `We should build ${recommended.name} to defend our cities.`;
    } else {
      this.militaryAdvice.textContent = 'Our military is well prepared.';
    }

    // Set domestic advice
    if (domesticOptions.length > 0) {
      const recommended = domesticOptions[0];
      let advice = '';
      if (recommended.id === 'granary') {
        advice = 'We should build a Granary to encourage city growth.';
      } else if (recommended.id === 'temple') {
        advice = 'We should build a Temple to keep citizens happy.';
      } else if (recommended.id === 'library') {
        advice = 'We should build a Library to advance our knowledge.';
      } else {
        advice = `We should build a ${recommended.name} to improve our city.`;
      }
      this.domesticAdvice.textContent = advice;
    } else {
      this.domesticAdvice.textContent = 'Our domestic affairs are in order.';
    }
  }

  private handleHelp(): void {
    if (this.selectedOption) {
      const helpText = `${this.selectedOption.name}\n\nCost: ${this.selectedOption.cost} shields\nTime: ${this.selectedOption.turns} turns\n\n${this.selectedOption.description || 'No additional information available.'}`;
      alert(helpText);
    } else {
      alert('Select a production option to see more information.');
    }
  }

  private handleCancel(): void {
    this.hide();
  }

  private handleOk(): void {
    if (this.selectedOption && this.onSelectionCallback) {
      this.onSelectionCallback(this.selectedOption);
    }
    this.hide();
  }
}
