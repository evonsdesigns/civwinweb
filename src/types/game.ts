// Technology imports
import { TechnologyType, TechnologyEra } from '../game/TechnologyDefinitions';
import type { Technology } from '../game/TechnologyDefinitions';

// Game coordinate system types
export interface Position {
  x: number;
  y: number;
}

// Scenario system types
export const MapScenario = {
  RANDOM: 'random',
  EARTH: 'earth'
};
export type MapScenario = typeof MapScenario[keyof typeof MapScenario];

export interface ScenarioConfig {
  name: string;
  description: string;
  width: number;
  height: number;
  generator: (width: number, height: number) => Tile[][];
}

export interface Tile {
  position: Position;
  terrain: TerrainType;
  resources?: ResourceType[];
  unit?: Unit;
  city?: City;
  improvements?: Improvement[];
}

export const TerrainType = {
  GRASSLAND: 'grassland',
  DESERT: 'desert',
  FOREST: 'forest',
  HILLS: 'hills',
  MOUNTAINS: 'mountains',
  OCEAN: 'ocean',
  RIVER: 'river',
  JUNGLE: 'jungle'
};
export type TerrainType = typeof TerrainType[keyof typeof TerrainType];

export const ResourceType = {
  WHEAT: 'wheat',
  GOLD: 'gold',
  IRON: 'iron',
  HORSES: 'horses',
  FISH: 'fish'
};
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];

// Unit system types
export interface Unit {
  id: string;
  type: UnitType;
  position: Position;
  movementPoints: number;
  maxMovementPoints: number;
  health: number;
  maxHealth: number;
  playerId: string;
  experience: number;
  isVeteran: boolean;
  fortified: boolean;
}

export const UnitCategory = {
  LAND: 'land',
  NAVAL: 'naval',
  AIR: 'air',
  SPECIAL: 'special'
} as const;
export type UnitCategory = typeof UnitCategory[keyof typeof UnitCategory];

export interface UnitStats {
  attack: number;
  defense: number;
  movement: number;
  category: UnitCategory;
  requiredTechnology?: TechnologyType;
  productionCost: number;
  canAttack: boolean;
  canFortify: boolean;
  canCarryUnits?: number; // For naval/air transport units
  visibility?: number; // For naval/air units with extended vision
  specialAbilities?: string[];
}

export const UnitType = {
  // Non-combat units
  SETTLER: 'settler',
  DIPLOMAT: 'diplomat',
  CARAVAN: 'caravan',

  // Ancient military units
  MILITIA: 'militia',
  PHALANX: 'phalanx',
  LEGION: 'legion',
  CAVALRY: 'cavalry',
  CHARIOT: 'chariot',
  CATAPULT: 'catapult',

  // Medieval military units
  KNIGHTS: 'knights',

  // Gunpowder units
  MUSKETEERS: 'musketeers',
  CANNON: 'cannon',

  // Industrial units
  RIFLEMEN: 'riflemen',
  ARTILLERY: 'artillery',

  // Modern units
  ARMOR: 'armor',
  MECHANIZED_INFANTRY: 'mechanized_infantry',

  // Naval units
  TRIREME: 'trireme',
  SAIL: 'sail',
  FRIGATE: 'frigate',
  IRONCLAD: 'ironclad',
  CRUISER: 'cruiser',
  BATTLESHIP: 'battleship',
  CARRIER: 'carrier',
  TRANSPORT: 'transport',
  SUBMARINE: 'submarine',

  // Air units
  FIGHTER: 'fighter',
  BOMBER: 'bomber',

  // Special units
  NUCLEAR: 'nuclear',

  // Legacy units (for backward compatibility)
  WARRIOR: 'warrior',
  SCOUT: 'scout',
  ARCHER: 'archer',
  SPEARMAN: 'spearman'
} as const;
export type UnitType = typeof UnitType[keyof typeof UnitType];

// City system types
export interface City {
  id: string;
  name: string;
  position: Position;
  population: number;
  playerId: string;
  buildings: Building[];
  production: ProductionItem | null;
  food: number;
  production_points: number;
  science: number;
  culture: number;
}

export interface Building {
  type: BuildingType;
  completedTurn: number;
}

export const BuildingType = {
  BARRACKS: 'barracks',
  GRANARY: 'granary',
  LIBRARY: 'library',
  TEMPLE: 'temple',
  WALLS: 'walls'
} as const;
export type BuildingType = typeof BuildingType[keyof typeof BuildingType];

export interface ProductionItem {
  type: 'unit' | 'building' | 'wonder';
  item: UnitType | BuildingType | string;
  turnsRemaining: number;
}

// Improvement types
export interface Improvement {
  type: ImprovementType;
  completedTurn: number;
}

export const ImprovementType = {
  FARM: 'farm',
  MINE: 'mine',
  ROAD: 'road',
  IRRIGATION: 'irrigation'
} as const;
export type ImprovementType = typeof ImprovementType[keyof typeof ImprovementType];

// Player and game state types
export interface Player {
  id: string;
  name: string;
  color: string;
  isHuman: boolean;
  science: number;
  gold: number;
  culture: number;
  technologies: TechnologyType[];
  government: GovernmentType;
  revolutionTurns?: number; // Turns remaining in anarchy during revolution
}

// Government system types
export const GovernmentType = {
  DESPOTISM: 'despotism',
  ANARCHY: 'anarchy',
  MONARCHY: 'monarchy',
  COMMUNISM: 'communism',
  REPUBLIC: 'republic',
  DEMOCRACY: 'democracy'
} as const;
export type GovernmentType = typeof GovernmentType[keyof typeof GovernmentType];

export interface Government {
  type: GovernmentType;
  name: string;
  description: string;
  requiredTechnology?: TechnologyType; // Technology needed to unlock this government
  effects: GovernmentEffects;
  restrictions: GovernmentRestrictions;
}

export interface GovernmentEffects {
  // Production modifiers
  productionPenalty: boolean; // true if 3+ production tiles are reduced by 1
  corruptionType: 'distance' | 'flat' | 'none'; // How corruption is calculated
  tradeBonus: boolean; // true if +1 trade where trade already exists

  // Unit support costs
  militarySupport: {
    freeUnits: 'population' | 'none'; // Free units equal to population or none
    costPerUnit: number; // Resource cost per military unit
  };
  settlerSupport: number; // Food cost per settler

  // Happiness effects
  martialLawAvailable: boolean; // Can military units make unhappy citizens content
  unhappinessFromMilitary: number; // Unhappy citizens per military unit away from home city

  // Other effects
  taxCollection: boolean; // false during anarchy
  maintenanceCosts: boolean; // false during anarchy  
  scientificResearch: boolean; // false during anarchy
}

export interface GovernmentRestrictions {
  senateOverride: boolean; // Senate can override war decisions
  revolutionRisk: boolean; // Risk of revolution if cities in disorder
  peaceOffers: boolean; // Senate accepts all peace offers
}

export const GOVERNMENTS: Record<GovernmentType, Government> = {
  [GovernmentType.DESPOTISM]: {
    type: GovernmentType.DESPOTISM,
    name: 'Despotism',
    description: 'You rule by absolute power. The people just have to live with it because your will is enforced by the army.',
    effects: {
      productionPenalty: true, // 3+ production reduced by 1
      corruptionType: 'distance',
      tradeBonus: false,
      militarySupport: {
        freeUnits: 'population', // Free units equal to city population
        costPerUnit: 1
      },
      settlerSupport: 1,
      martialLawAvailable: true,
      unhappinessFromMilitary: 0,
      taxCollection: true,
      maintenanceCosts: true,
      scientificResearch: true
    },
    restrictions: {
      senateOverride: false,
      revolutionRisk: false,
      peaceOffers: false
    }
  },

  [GovernmentType.ANARCHY]: {
    type: GovernmentType.ANARCHY,
    name: 'Anarchy',
    description: 'You have temporarily lost control of government. Cities continue to operate on their own but some important operations come to a halt.',
    effects: {
      productionPenalty: true, // Same as despotism
      corruptionType: 'distance',
      tradeBonus: false,
      militarySupport: {
        freeUnits: 'population',
        costPerUnit: 1
      },
      settlerSupport: 1,
      martialLawAvailable: true,
      unhappinessFromMilitary: 0,
      taxCollection: false, // No tax revenue
      maintenanceCosts: false, // No maintenance costs
      scientificResearch: false // No research
    },
    restrictions: {
      senateOverride: false,
      revolutionRisk: false,
      peaceOffers: false
    }
  },

  [GovernmentType.MONARCHY]: {
    type: GovernmentType.MONARCHY,
    name: 'Monarchy',
    description: 'Your rule is less absolute, and more with the acceptance of the people, especially an aristocracy of upper class citizens.',
    requiredTechnology: TechnologyType.MONARCHY,
    effects: {
      productionPenalty: false, // No production penalty
      corruptionType: 'distance',
      tradeBonus: false,
      militarySupport: {
        freeUnits: 'none',
        costPerUnit: 1
      },
      settlerSupport: 2,
      martialLawAvailable: true,
      unhappinessFromMilitary: 0,
      taxCollection: true,
      maintenanceCosts: true,
      scientificResearch: true
    },
    restrictions: {
      senateOverride: false,
      revolutionRisk: false,
      peaceOffers: false
    }
  },

  [GovernmentType.COMMUNISM]: {
    type: GovernmentType.COMMUNISM,
    name: 'Communism',
    description: 'You are the head of the communistic government, and rule with the support of the controlling party.',
    requiredTechnology: TechnologyType.COMMUNISM,
    effects: {
      productionPenalty: false, // No production penalty
      corruptionType: 'flat', // Flat corruption rate for all cities
      tradeBonus: false,
      militarySupport: {
        freeUnits: 'none',
        costPerUnit: 1
      },
      settlerSupport: 2,
      martialLawAvailable: true,
      unhappinessFromMilitary: 0,
      taxCollection: true,
      maintenanceCosts: true,
      scientificResearch: true
    },
    restrictions: {
      senateOverride: false,
      revolutionRisk: false,
      peaceOffers: false
    }
  },

  [GovernmentType.REPUBLIC]: {
    type: GovernmentType.REPUBLIC,
    name: 'The Republic',
    description: 'You rule over the assembly of city-states. The people have a great deal of personal and economic freedom, resulting in greatly increased trade.',
    requiredTechnology: TechnologyType.THE_REPUBLIC,
    effects: {
      productionPenalty: false, // No production penalty
      corruptionType: 'distance',
      tradeBonus: true, // +1 trade where trade already exists
      militarySupport: {
        freeUnits: 'none',
        costPerUnit: 1
      },
      settlerSupport: 2,
      martialLawAvailable: false,
      unhappinessFromMilitary: 1, // 1 unhappy citizen per unit away from home
      taxCollection: true,
      maintenanceCosts: true,
      scientificResearch: true
    },
    restrictions: {
      senateOverride: true, // Senate can override decisions
      revolutionRisk: false,
      peaceOffers: true // Senate accepts all peace offers
    }
  },

  [GovernmentType.DEMOCRACY]: {
    type: GovernmentType.DEMOCRACY,
    name: 'Democracy',
    description: 'You rule as the elected executive of a democracy. The degree of freedom results in maximum opportunity for economic production and trade.',
    requiredTechnology: TechnologyType.DEMOCRACY,
    effects: {
      productionPenalty: false, // No production penalty
      corruptionType: 'none', // No corruption
      tradeBonus: true, // +1 trade where trade already exists
      militarySupport: {
        freeUnits: 'none',
        costPerUnit: 1
      },
      settlerSupport: 2,
      martialLawAvailable: false,
      unhappinessFromMilitary: 2, // 2 unhappy citizens per unit away from home
      taxCollection: true,
      maintenanceCosts: true,
      scientificResearch: true
    },
    restrictions: {
      senateOverride: true, // Senate can override decisions
      revolutionRisk: true, // Risk of revolution if cities in disorder for 2+ turns
      peaceOffers: true // Senate accepts all peace offers
    }
  }
};

export interface GameState {
  turn: number;
  currentPlayer: string;
  players: Player[];
  worldMap: Tile[][];
  units: Unit[];
  cities: City[];
  gamePhase: GamePhase;
  score: number;
}

export const GamePhase = {
  SETUP: 'setup',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
} as const;
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

// UI and rendering types
export interface ViewPort {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: ViewPort;
  tileSize: number;
}

// Re-export technology types
export { Technology, TechnologyType, TechnologyEra };
