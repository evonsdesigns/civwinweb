import { UnitType, UnitStats, BuildingType } from '../types/game';
import { BuildingStats, BUILDING_DEFINITIONS } from './BuildingDefinitions';
import { TechnologyType } from './TechnologyDefinitions';
import { UNIT_DEFINITIONS } from './UnitDefinitions';

export interface ProductionOption {
  type: 'unit' | 'building' | 'wonder';
  id: string;
  name: string;
  cost: number;
  turns: number;
  description?: string;
  requiredTechnology?: TechnologyType;
}

export class ProductionManager {
  /**
   * Get all available production options for a city based on known technologies
   */
  public static getAvailableProduction(
    knownTechnologies: TechnologyType[],
    existingBuildings: BuildingType[],
    cityProductionCapacity: number = 1,
    currentProductionPoints: number = 0
  ): ProductionOption[] {
    const options: ProductionOption[] = [];
    
    // Add available units
    const availableUnits = this.getAvailableUnits(knownTechnologies);
    availableUnits.forEach(unitType => {
      const stats = UNIT_DEFINITIONS[unitType];
      const remainingCost = Math.max(0, stats.productionCost - currentProductionPoints);
      const turns = remainingCost > 0 ? Math.ceil(remainingCost / cityProductionCapacity) : 1;
      
      options.push({
        type: 'unit',
        id: unitType,
        name: this.formatUnitName(unitType),
        cost: stats.productionCost,
        turns: turns,
        description: this.getUnitDescription(unitType, stats),
        requiredTechnology: stats.requiredTechnology
      });
    });
    
    // Add available buildings
    const availableBuildings = this.getAvailableBuildings(knownTechnologies, existingBuildings);
    availableBuildings.forEach(buildingType => {
      const stats = BUILDING_DEFINITIONS[buildingType];
      const remainingCost = Math.max(0, stats.productionCost - currentProductionPoints);
      const turns = remainingCost > 0 ? Math.ceil(remainingCost / cityProductionCapacity) : 1;
      
      options.push({
        type: 'building',
        id: buildingType,
        name: stats.name,
        cost: stats.productionCost,
        turns: turns,
        description: stats.description,
        requiredTechnology: stats.requiredTechnology
      });
    });
    
    // Sort options: Settlers first, then by cost (cheaper items first)
    options.sort((a, b) => {
      // Always put Settlers first
      if (a.id === UnitType.SETTLERS) return -1;
      if (b.id === UnitType.SETTLERS) return 1;
      
      // For all other items, sort by cost
      return a.cost - b.cost;
    });
    
    return options;
  }
  
  /**
   * Get available units based on known technologies
   */
  private static getAvailableUnits(knownTechnologies: TechnologyType[]): UnitType[] {
    return Object.keys(UNIT_DEFINITIONS).filter(unitType => {
      const stats = UNIT_DEFINITIONS[unitType as UnitType];
      
      // If no technology requirement, it's available from the start
      if (!stats.requiredTechnology) {
        return true;
      }
      
      // Check if the required technology is known
      return knownTechnologies.includes(stats.requiredTechnology);
    }) as UnitType[];
  }
  
  /**
   * Get available buildings based on known technologies and existing buildings
   */
  private static getAvailableBuildings(
    knownTechnologies: TechnologyType[], 
    existingBuildings: BuildingType[]
  ): BuildingType[] {
    return Object.values(BuildingType).filter(buildingType => {
      const stats = BUILDING_DEFINITIONS[buildingType];
      
      // Check if already built (most buildings can only be built once)
      if (existingBuildings.includes(buildingType)) {
        return false;
      }
      
      // Check technology requirement
      if (stats.requiredTechnology && !knownTechnologies.includes(stats.requiredTechnology)) {
        return false;
      }
      
      // Check building requirement (e.g., Bank requires Marketplace)
      if (stats.requiredBuilding && !existingBuildings.includes(stats.requiredBuilding)) {
        return false;
      }
      
      // Check if obsolete
      if (stats.obsoletedBy && knownTechnologies.includes(stats.obsoletedBy)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Format unit names for display
   */
  private static formatUnitName(unitType: UnitType): string {
    return unitType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Get a description for a unit based on its stats
   */
  private static getUnitDescription(_unitType: UnitType, stats: UnitStats): string {
    const parts: string[] = [];
    
    if (stats.attack > 0) {
      parts.push(`Attack: ${stats.attack}`);
    }
    
    if (stats.defense > 0) {
      parts.push(`Defense: ${stats.defense}`);
    }
    
    parts.push(`Movement: ${stats.movement}`);
    
    if (stats.specialAbilities && stats.specialAbilities.length > 0) {
      const abilities = stats.specialAbilities.map(ability => 
        ability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      );
      parts.push(`Special: ${abilities.join(', ')}`);
    }
    
    return parts.join(' | ');
  }
  
  /**
   * Check if a specific production option is available
   */
  public static canProduce(
    type: 'unit' | 'building',
    id: string,
    knownTechnologies: TechnologyType[],
    existingBuildings: BuildingType[] = []
  ): boolean {
    if (type === 'unit') {
      const stats = UNIT_DEFINITIONS[id as UnitType];
      if (!stats) return false;
      
      return !stats.requiredTechnology || knownTechnologies.includes(stats.requiredTechnology);
    } else if (type === 'building') {
      const stats = BUILDING_DEFINITIONS[id as BuildingType];
      if (!stats) return false;
      
      // Check if already built
      if (existingBuildings.includes(id as BuildingType)) {
        return false;
      }
      
      // Check technology requirement
      if (stats.requiredTechnology && !knownTechnologies.includes(stats.requiredTechnology)) {
        return false;
      }
      
      // Check building requirement
      if (stats.requiredBuilding && !existingBuildings.includes(stats.requiredBuilding)) {
        return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get production cost for an item
   */
  public static getProductionCost(type: 'unit' | 'building', id: string): number {
    if (type === 'unit') {
      const stats = UNIT_DEFINITIONS[id as UnitType];
      return stats?.productionCost || 0;
    } else if (type === 'building') {
      const stats = BUILDING_DEFINITIONS[id as BuildingType];
      return stats?.productionCost || 0;
    }
    
    return 0;
  }
}
