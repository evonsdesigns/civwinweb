import { TechnologyType, TechnologyEra } from '../game/TechnologyDefinitions.js';
import type { Technology } from '../game/TechnologyDefinitions.js';
import { getTechnology, canResearch, getResearchCost } from '../game/TechnologyDefinitions.js';
import type { Player } from '../types/game.js';
import type { Game } from '../game/Game.js';

/**
 * Manages the technology selection modal interface
 */
export class TechnologySelectionModal {
  private modal: HTMLElement | null = null;
  private technologyList: HTMLElement | null = null;
  private selectedTechnology: TechnologyType | null = null;
  private game: Game | null = null;
  private player: Player | null = null;
  private onTechnologySelected: ((technology: TechnologyType) => void) | null = null;

  constructor() {
    console.log('TechnologySelectionModal: Constructor called');
    this.initializeModal();
  }

  /**
   * Initialize the modal and set up event handlers
   */
  private initializeModal(): void {
    console.log('TechnologySelectionModal: Initializing modal');
    this.modal = document.getElementById('technology-selection-modal');
    this.technologyList = document.getElementById('technology-list');

    console.log('TechnologySelectionModal: Modal element:', this.modal);
    console.log('TechnologySelectionModal: Technology list element:', this.technologyList);

    if (!this.modal || !this.technologyList) {
      console.error('Technology selection modal elements not found');
      console.error('Modal element found:', !!this.modal);
      console.error('Technology list element found:', !!this.technologyList);
      return;
    }

    // Set up event handlers
    const closeBtn = document.getElementById('tech-close');
    const cancelBtn = document.getElementById('tech-cancel');
    const researchBtn = document.getElementById('tech-research');

    closeBtn?.addEventListener('click', () => this.hide());
    cancelBtn?.addEventListener('click', () => this.hide());
    researchBtn?.addEventListener('click', () => this.confirmSelection());

    // Close modal when clicking outside
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.hide();
      }
    });
  }

  /**
   * Show the technology selection modal
   */
  public show(game: Game, player: Player, onSelected?: (technology: TechnologyType) => void): void {
    console.log('TechnologySelectionModal: show() called');
    if (!this.modal) {
      console.error('TechnologySelectionModal: No modal element found');
      return;
    }

    this.game = game;
    this.player = player;
    this.onTechnologySelected = onSelected || null;
    this.selectedTechnology = null;

    this.updateCurrentResearch();
    this.updateScienceRate();
    this.loadAvailableTechnologies();
    this.clearTechnologyDetails();

    console.log('TechnologySelectionModal: Setting modal display and active class');
    console.log('TechnologySelectionModal: Modal element before show:', this.modal);
    console.log('TechnologySelectionModal: Modal computed style before:', window.getComputedStyle(this.modal));

    this.modal.style.display = 'flex';
    this.modal.classList.add('active');

    console.log('TechnologySelectionModal: Modal display set to:', this.modal.style.display);
    console.log('TechnologySelectionModal: Modal classes:', this.modal.className);
    console.log('TechnologySelectionModal: Modal computed style after:', window.getComputedStyle(this.modal));
  }

  /**
   * Hide the technology selection modal
   */
  public hide(): void {
    if (!this.modal) return;

    this.modal.style.display = 'none';
    this.modal.classList.remove('active');
    this.selectedTechnology = null;
    this.game = null;
    this.player = null;
    this.onTechnologySelected = null;
  }

  /**
   * Update current research display
   */
  private updateCurrentResearch(): void {
    if (!this.player) return;

    const currentTechElement = document.getElementById('current-tech');
    const progressElement = document.getElementById('research-progress');

    // Since this game uses direct research purchase rather than gradual progress,
    // we'll show the available science points instead
    if (currentTechElement) {
      currentTechElement.textContent = 'Choose from available technologies';
    }
    if (progressElement) {
      progressElement.textContent = `(${this.player.science} science points available)`;
    }
  }

  /**
   * Update science per turn display
   */
  private updateScienceRate(): void {
    if (!this.player) return;

    const scienceElement = document.getElementById('science-per-turn');
    if (scienceElement) {
      // Calculate science per turn (this would normally come from cities)
      const sciencePerTurn = this.calculateSciencePerTurn();
      scienceElement.textContent = sciencePerTurn.toString();
    }
  }

  /**
   * Calculate science per turn for the player
   */
  private calculateSciencePerTurn(): number {
    if (!this.game || !this.player) return 0;

    // This is a simplified calculation - in a real implementation,
    // this would be calculated from cities and their science output
    return Math.max(1, Math.floor(this.player.science / 10));
  }

  /**
   * Load and display available technologies
   */
  private loadAvailableTechnologies(): void {
    if (!this.game || !this.player || !this.technologyList) return;

    const availableTechnologies = this.game.getAvailableTechnologies(this.player.id);
    
    // Group technologies by era
    const technologiesByEra = this.groupTechnologiesByEra(availableTechnologies);

    // Clear existing content
    this.technologyList.innerHTML = '';

    // Display technologies grouped by era
    Object.entries(technologiesByEra).forEach(([era, technologies]) => {
      if (technologies.length === 0) return;

      // Create era header
      const eraHeader = document.createElement('div');
      eraHeader.className = 'technology-era-header';
      eraHeader.textContent = this.formatEraName(era as TechnologyEra);
      this.technologyList!.appendChild(eraHeader);

      // Create technologies for this era
      technologies.forEach(techType => {
        const technology = getTechnology(techType);
        const techElement = this.createTechnologyElement(technology);
        this.technologyList!.appendChild(techElement);
      });
    });
  }

  /**
   * Group technologies by their era
   */
  private groupTechnologiesByEra(technologies: TechnologyType[]): Record<TechnologyEra, TechnologyType[]> {
    const grouped: Record<TechnologyEra, TechnologyType[]> = {
      [TechnologyEra.ANCIENT]: [],
      [TechnologyEra.CLASSICAL]: [],
      [TechnologyEra.MEDIEVAL]: [],
      [TechnologyEra.RENAISSANCE]: [],
      [TechnologyEra.INDUSTRIAL]: [],
      [TechnologyEra.MODERN]: [],
      [TechnologyEra.INFORMATION]: []
    };

    technologies.forEach(techType => {
      const technology = getTechnology(techType);
      grouped[technology.era].push(techType);
    });

    return grouped;
  }

  /**
   * Create a technology list item element
   */
  private createTechnologyElement(technology: Technology): HTMLElement {
    const techDiv = document.createElement('div');
    techDiv.className = 'technology-item';
    techDiv.dataset.techType = technology.type;

    const cost = getResearchCost(technology.type);
    const canAfford = this.player ? this.player.science >= cost : false;

    techDiv.innerHTML = `
      <div class="tech-name">${technology.name}</div>
      <div class="tech-cost-display">${cost} research points</div>
      <div class="tech-era-badge">${this.formatEraName(technology.era)}</div>
      ${!canAfford ? '<div class="tech-insufficient">Insufficient Science</div>' : ''}
    `;

    if (!canAfford) {
      techDiv.classList.add('insufficient-science');
    }

    techDiv.addEventListener('click', () => {
      this.selectTechnology(technology.type);
    });

    return techDiv;
  }

  /**
   * Select a technology and update the details panel
   */
  private selectTechnology(technologyType: TechnologyType): void {
    // Remove previous selection
    const previousSelected = this.technologyList?.querySelector('.technology-item.selected');
    previousSelected?.classList.remove('selected');

    // Select new technology
    const selectedElement = this.technologyList?.querySelector(`[data-tech-type="${technologyType}"]`);
    selectedElement?.classList.add('selected');

    this.selectedTechnology = technologyType;
    this.updateTechnologyDetails(technologyType);
    this.updateResearchButton();
  }

  /**
   * Update the technology details panel
   */
  private updateTechnologyDetails(technologyType: TechnologyType): void {
    if (!this.player) return;

    const technology = getTechnology(technologyType);
    const cost = getResearchCost(technologyType);

    // Update technology name
    const nameElement = document.getElementById('selected-tech-name');
    if (nameElement) {
      nameElement.textContent = technology.name;
    }

    // Update era
    const eraElement = document.getElementById('selected-tech-era');
    if (eraElement) {
      eraElement.innerHTML = `<strong>Era:</strong> ${this.formatEraName(technology.era)}`;
    }

    // Update cost
    const costElement = document.getElementById('selected-tech-cost');
    if (costElement) {
      const canAfford = this.player.science >= cost;
      costElement.innerHTML = `<strong>Cost:</strong> ${cost} research points ${canAfford ? '✓' : '✗'}`;
      costElement.className = canAfford ? 'tech-cost affordable' : 'tech-cost unaffordable';
    }

    // Update description
    const descElement = document.getElementById('selected-tech-description');
    if (descElement) {
      descElement.innerHTML = `<strong>Description:</strong> ${technology.description}`;
    }

    // Update unlocks
    const unlocksElement = document.getElementById('selected-tech-unlocks');
    if (unlocksElement) {
      const unlocks = this.formatUnlocks(technology);
      unlocksElement.innerHTML = unlocks ? `<strong>Unlocks:</strong> ${unlocks}` : '';
    }

    // Update prerequisites
    const prereqElement = document.getElementById('selected-tech-prerequisites');
    if (prereqElement) {
      const prereqs = this.formatPrerequisites(technology);
      prereqElement.innerHTML = prereqs ? `<strong>Prerequisites:</strong> ${prereqs}` : '<strong>Prerequisites:</strong> None';
    }
  }

  /**
   * Format technology unlocks for display
   */
  private formatUnlocks(technology: Technology): string {
    const unlocks: string[] = [];

    if (technology.unlocks.units?.length) {
      unlocks.push(`Units: ${technology.unlocks.units.join(', ')}`);
    }
    if (technology.unlocks.buildings?.length) {
      unlocks.push(`Buildings: ${technology.unlocks.buildings.join(', ')}`);
    }
    if (technology.unlocks.governments?.length) {
      unlocks.push(`Governments: ${technology.unlocks.governments.join(', ')}`);
    }
    if (technology.unlocks.improvements?.length) {
      unlocks.push(`Improvements: ${technology.unlocks.improvements.join(', ')}`);
    }
    if (technology.unlocks.wonders?.length) {
      unlocks.push(`Wonders: ${technology.unlocks.wonders.join(', ')}`);
    }

    return unlocks.join('; ');
  }

  /**
   * Format technology prerequisites for display
   */
  private formatPrerequisites(technology: Technology): string {
    if (!technology.prerequisites.length) return '';

    return technology.prerequisites
      .map(prereq => getTechnology(prereq).name)
      .join(', ');
  }

  /**
   * Format era name for display
   */
  private formatEraName(era: TechnologyEra): string {
    return era.charAt(0).toUpperCase() + era.slice(1);
  }

  /**
   * Update the research button state
   */
  private updateResearchButton(): void {
    const researchBtn = document.getElementById('tech-research') as HTMLButtonElement;
    if (!researchBtn || !this.selectedTechnology || !this.player) return;

    const cost = getResearchCost(this.selectedTechnology);
    const canAfford = this.player.science >= cost;

    researchBtn.disabled = !canAfford;
    researchBtn.textContent = canAfford ? 'Research' : 'Insufficient Science';
  }

  /**
   * Clear technology details panel
   */
  private clearTechnologyDetails(): void {
    const nameElement = document.getElementById('selected-tech-name');
    const eraElement = document.getElementById('selected-tech-era');
    const costElement = document.getElementById('selected-tech-cost');
    const descElement = document.getElementById('selected-tech-description');
    const unlocksElement = document.getElementById('selected-tech-unlocks');
    const prereqElement = document.getElementById('selected-tech-prerequisites');

    if (nameElement) nameElement.textContent = 'Select a technology';
    if (eraElement) eraElement.textContent = '';
    if (costElement) costElement.textContent = '';
    if (descElement) descElement.textContent = '';
    if (unlocksElement) unlocksElement.textContent = '';
    if (prereqElement) prereqElement.textContent = '';

    this.updateResearchButton();
  }

  /**
   * Confirm technology selection
   */
  private confirmSelection(): void {
    if (!this.selectedTechnology || !this.game || !this.player) return;

    const cost = getResearchCost(this.selectedTechnology);
    if (this.player.science < cost) return;

    // Call the callback if provided
    if (this.onTechnologySelected) {
      this.onTechnologySelected(this.selectedTechnology);
    }

    this.hide();
  }

  /**
   * Check if the modal is currently visible
   */
  public isVisible(): boolean {
    return this.modal?.style.display === 'flex';
  }

  /**
   * Test function to show modal directly (for debugging)
   */
  public testShow(): void {
    console.log('TechnologySelectionModal: testShow() called');
    if (!this.modal) {
      console.error('TechnologySelectionModal: No modal element for test');
      return;
    }

    console.log('TechnologySelectionModal: Force showing modal for test');
    this.modal.style.display = 'flex';
    this.modal.style.zIndex = '10000';
    this.modal.classList.add('active');
    
    // Add some test content
    const techList = document.getElementById('technology-list');
    if (techList) {
      techList.innerHTML = '<div style="padding: 20px; color: red; font-weight: bold;">TEST MODAL VISIBLE</div>';
    }
  }
}
