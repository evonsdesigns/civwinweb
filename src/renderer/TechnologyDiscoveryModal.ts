import { TechnologyType } from '../game/TechnologyDefinitions.js';
import { getTechnology } from '../game/TechnologyDefinitions.js';
import type { Player } from '../types/game.js';
import type { Game } from '../game/Game.js';

/**
 * Manages the technology discovery modal that shows when a technology is completed
 */
export class TechnologyDiscoveryModal {
  private modal: HTMLElement | null = null;
  private step1: HTMLElement | null = null;
  private step2: HTMLElement | null = null;
  private currentStep = 1;
  private onComplete: (() => void) | null = null;

  constructor() {
    this.initializeModal();
  }

  /**
   * Initialize the modal and set up event handlers
   */
  private initializeModal(): void {
    console.log('TechnologyDiscoveryModal: Initializing modal');
    this.modal = document.getElementById('technology-discovery-modal');
    this.step1 = document.getElementById('discovery-step-1');
    this.step2 = document.getElementById('discovery-step-2');

    if (!this.modal || !this.step1 || !this.step2) {
      console.error('Technology discovery modal elements not found');
      return;
    }

    // Set up event handlers
    const continueBtn = document.getElementById('discovery-continue');
    const closeBtn = document.getElementById('discovery-close');

    continueBtn?.addEventListener('click', () => this.nextStep());
    closeBtn?.addEventListener('click', () => this.close());

    // Prevent closing by clicking outside during discovery
    this.modal.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    // Add keyboard handler for Enter/Space to advance
    document.addEventListener('keydown', (event) => {
      if (this.modal?.style.display === 'flex') {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (this.currentStep === 1) {
            this.nextStep();
          } else {
            this.close();
          }
        }
      }
    });
  }

  /**
   * Show the discovery modal for a specific technology
   */
  public show(technology: TechnologyType, onComplete?: () => void): void {
    console.log('TechnologyDiscoveryModal: Showing discovery for:', technology);
    
    if (!this.modal || !this.step1 || !this.step2) {
      console.error('TechnologyDiscoveryModal: Modal elements not found');
      return;
    }

    this.onComplete = onComplete || null;
    this.currentStep = 1;

    // Populate step 1 content
    this.populateStep1(technology);
    
    // Populate step 2 content
    this.populateStep2(technology);

    // Show step 1, hide step 2
    this.step1.style.display = 'block';
    this.step2.style.display = 'none';

    // Show modal
    this.modal.style.display = 'flex';
    this.modal.classList.add('active');
  }

  /**
   * Populate step 1 content (basic announcement)
   */
  private populateStep1(technologyType: TechnologyType): void {
    const technology = getTechnology(technologyType);
    
    const nameElement = document.getElementById('discovered-tech-name');
    if (nameElement) {
      nameElement.textContent = technology.name;
    }
  }

  /**
   * Populate step 2 content (detailed description)
   */
  private populateStep2(technologyType: TechnologyType): void {
    const technology = getTechnology(technologyType);
    
    // Update title
    const titleElement = document.getElementById('discovery-tech-title');
    if (titleElement) {
      titleElement.textContent = technology.name;
    }

    // Update era
    const eraElement = document.getElementById('discovery-tech-era');
    if (eraElement) {
      eraElement.textContent = this.formatEraName(technology.era);
    }

    // Update description
    const descElement = document.getElementById('discovery-tech-description');
    if (descElement) {
      descElement.textContent = technology.description;
    }

    // Update unlocks
    const unlocksElement = document.getElementById('discovery-tech-unlocks');
    if (unlocksElement) {
      unlocksElement.innerHTML = '';
      
      const unlocks: string[] = [];
      
      if (technology.unlocks.units?.length) {
        technology.unlocks.units.forEach(unit => {
          const li = document.createElement('li');
          li.textContent = `Unit: ${unit}`;
          unlocksElement.appendChild(li);
        });
      }
      
      if (technology.unlocks.buildings?.length) {
        technology.unlocks.buildings.forEach(building => {
          const li = document.createElement('li');
          li.textContent = `Building: ${building}`;
          unlocksElement.appendChild(li);
        });
      }
      
      if (technology.unlocks.governments?.length) {
        technology.unlocks.governments.forEach(government => {
          const li = document.createElement('li');
          li.textContent = `Government: ${government}`;
          unlocksElement.appendChild(li);
        });
      }
      
      if (technology.unlocks.improvements?.length) {
        technology.unlocks.improvements.forEach(improvement => {
          const li = document.createElement('li');
          li.textContent = `Improvement: ${improvement}`;
          unlocksElement.appendChild(li);
        });
      }
      
      if (technology.unlocks.wonders?.length) {
        technology.unlocks.wonders.forEach(wonder => {
          const li = document.createElement('li');
          li.textContent = `Wonder: ${wonder}`;
          unlocksElement.appendChild(li);
        });
      }

      // If no unlocks, show a message
      if (unlocksElement.children.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No new units, buildings, or improvements';
        li.style.fontStyle = 'italic';
        unlocksElement.appendChild(li);
      }
    }
  }

  /**
   * Move to the next step
   */
  private nextStep(): void {
    if (!this.step1 || !this.step2) return;

    if (this.currentStep === 1) {
      // Move from step 1 to step 2
      this.step1.style.display = 'none';
      this.step2.style.display = 'block';
      this.currentStep = 2;
    }
  }

  /**
   * Close the modal and call completion callback
   */
  private close(): void {
    if (!this.modal) return;

    this.modal.style.display = 'none';
    this.modal.classList.remove('active');
    this.currentStep = 1;

    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
      this.onComplete = null;
    }
  }

  /**
   * Format era name for display
   */
  private formatEraName(era: string): string {
    return era.charAt(0).toUpperCase() + era.slice(1).replace('_', ' ');
  }

  /**
   * Check if the modal is currently visible
   */
  public isVisible(): boolean {
    return this.modal?.style.display === 'flex' || false;
  }
}
