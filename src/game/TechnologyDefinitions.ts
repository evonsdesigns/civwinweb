// Technology definitions based on Civilization manual
export const TechnologyType = {
  // Ancient Era Technologies
  POTTERY: 'pottery',
  WARRIOR_CODE: 'warrior_code', 
  ALPHABET: 'alphabet',
  CEREMONIAL_BURIAL: 'ceremonial_burial',
  BRONZE_WORKING: 'bronze_working',
  MASONRY: 'masonry',
  HORSEBACK_RIDING: 'horseback_riding',
  MYSTICISM: 'mysticism',
  
  // Classical Era Technologies  
  THE_WHEEL: 'the_wheel',
  IRON_WORKING: 'iron_working',
  WRITING: 'writing',
  MAP_MAKING: 'map_making',
  MATHEMATICS: 'mathematics',
  CURRENCY: 'currency',
  CONSTRUCTION: 'construction',
  THE_REPUBLIC: 'the_republic',
  
  // Medieval Era Technologies
  CHIVALRY: 'chivalry',
  FEUDALISM: 'feudalism',
  MONOTHEISM: 'monotheism',
  THEOLOGY: 'theology',
  POLYTHEISM: 'polytheism',
  SEAFARING: 'seafaring',
  ASTRONOMY: 'astronomy',
  NAVIGATION: 'navigation',
  
  // Renaissance Era Technologies
  GUNPOWDER: 'gunpowder',
  INVENTION: 'invention',
  UNIVERSITY: 'university',
  PHILOSOPHY: 'philosophy',
  MEDICINE: 'medicine',
  CHEMISTRY: 'chemistry',
  PHYSICS: 'physics',
  METALLURGY: 'metallurgy',
  
  // Industrial Era Technologies
  STEAM_ENGINE: 'steam_engine',
  MAGNETISM: 'magnetism',
  ELECTRICITY: 'electricity',
  STEEL: 'steel',
  INDUSTRIALIZATION: 'industrialization',
  CONSCRIPTION: 'conscription',
  THE_CORPORATION: 'the_corporation',
  BANKING: 'banking',
  
  // Modern Era Technologies
  COMBUSTION: 'combustion',
  AUTOMOBILE: 'automobile',
  ELECTRONICS: 'electronics',
  RADIO: 'radio',
  FLIGHT: 'flight',
  ADVANCED_FLIGHT: 'advanced_flight',
  ROCKETRY: 'rocketry',
  NUCLEAR_FISSION: 'nuclear_fission',
  
  // Information Era Technologies
  COMPUTERS: 'computers',
  ROBOTICS: 'robotics',
  SPACE_FLIGHT: 'space_flight',
  GENETIC_ENGINEERING: 'genetic_engineering',
  LABOR_UNION: 'labor_union',
  MASS_PRODUCTION: 'mass_production',
  
  // Government Technologies
  MONARCHY: 'monarchy',
  DEMOCRACY: 'democracy',
  COMMUNISM: 'communism',
  ECONOMICS: 'economics',
  LITERACY: 'literacy',
  TRADE: 'trade'
} as const;

export type TechnologyType = typeof TechnologyType[keyof typeof TechnologyType];

export interface Technology {
  id: string;
  name: string;
  type: TechnologyType;
  cost: number;
  prerequisites: TechnologyType[];
  era: TechnologyEra;
  description: string;
  unlocks: {
    units?: string[];
    buildings?: string[];
    governments?: string[];
    improvements?: string[];
    wonders?: string[];
  };
}

export const TechnologyEra = {
  ANCIENT: 'ancient',
  CLASSICAL: 'classical', 
  MEDIEVAL: 'medieval',
  RENAISSANCE: 'renaissance',
  INDUSTRIAL: 'industrial',
  MODERN: 'modern',
  INFORMATION: 'information'
} as const;

export type TechnologyEra = typeof TechnologyEra[keyof typeof TechnologyEra];

// Complete technology tree based on Civilization manual
export const TECHNOLOGY_DEFINITIONS: Record<TechnologyType, Technology> = {
  // Ancient Era
  [TechnologyType.POTTERY]: {
    id: TechnologyType.POTTERY,
    name: 'Pottery',
    type: TechnologyType.POTTERY,
    cost: 6,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Enables food storage and early civilization development',
    unlocks: {
      buildings: ['granary']
    }
  },

  [TechnologyType.WARRIOR_CODE]: {
    id: TechnologyType.WARRIOR_CODE,
    name: 'Warrior Code',
    type: TechnologyType.WARRIOR_CODE,
    cost: 6,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Establishes military traditions and honor',
    unlocks: {
      units: ['archer']
    }
  },

  [TechnologyType.ALPHABET]: {
    id: TechnologyType.ALPHABET,
    name: 'Alphabet',
    type: TechnologyType.ALPHABET,
    cost: 6,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Foundation of written communication',
    unlocks: {
      buildings: ['library']
    }
  },

  [TechnologyType.CEREMONIAL_BURIAL]: {
    id: TechnologyType.CEREMONIAL_BURIAL,
    name: 'Ceremonial Burial',
    type: TechnologyType.CEREMONIAL_BURIAL,
    cost: 6,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Religious practices and social organization',
    unlocks: {
      buildings: ['temple']
    }
  },

  [TechnologyType.BRONZE_WORKING]: {
    id: TechnologyType.BRONZE_WORKING,
    name: 'Bronze Working',
    type: TechnologyType.BRONZE_WORKING,
    cost: 8,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Metal working enables stronger weapons and tools',
    unlocks: {
      units: ['phalanx', 'spearman']
    }
  },

  [TechnologyType.MASONRY]: {
    id: TechnologyType.MASONRY,
    name: 'Masonry',
    type: TechnologyType.MASONRY,
    cost: 8,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Stone construction techniques',
    unlocks: {
      buildings: ['palace', 'walls']
    }
  },

  [TechnologyType.HORSEBACK_RIDING]: {
    id: TechnologyType.HORSEBACK_RIDING,
    name: 'Horseback Riding',
    type: TechnologyType.HORSEBACK_RIDING,
    cost: 10,
    prerequisites: [],
    era: TechnologyEra.ANCIENT,
    description: 'Domestication of horses for transportation and warfare',
    unlocks: {
      units: ['cavalry']
    }
  },

  [TechnologyType.MYSTICISM]: {
    id: TechnologyType.MYSTICISM,
    name: 'Mysticism',
    type: TechnologyType.MYSTICISM,
    cost: 6,
    prerequisites: [TechnologyType.CEREMONIAL_BURIAL],
    era: TechnologyEra.ANCIENT,
    description: 'Spiritual beliefs and religious practices',
    unlocks: {
      buildings: ['oracle']
    }
  },

  // Classical Era
  [TechnologyType.THE_WHEEL]: {
    id: TechnologyType.THE_WHEEL,
    name: 'The Wheel',
    type: TechnologyType.THE_WHEEL,
    cost: 10,
    prerequisites: [],
    era: TechnologyEra.CLASSICAL,
    description: 'Revolutionary invention enabling transportation and machinery',
    unlocks: {
      units: ['chariot'],
      improvements: ['roads']
    }
  },

  [TechnologyType.IRON_WORKING]: {
    id: TechnologyType.IRON_WORKING,
    name: 'Iron Working',
    type: TechnologyType.IRON_WORKING,
    cost: 12,
    prerequisites: [TechnologyType.BRONZE_WORKING],
    era: TechnologyEra.CLASSICAL,
    description: 'Superior metal working techniques',
    unlocks: {
      units: ['legion']
    }
  },

  [TechnologyType.WRITING]: {
    id: TechnologyType.WRITING,
    name: 'Writing',
    type: TechnologyType.WRITING,
    cost: 12,
    prerequisites: [TechnologyType.ALPHABET],
    era: TechnologyEra.CLASSICAL,
    description: 'Record keeping and communication advancement',
    unlocks: {
      units: ['diplomat'],
      buildings: ['courthouse']
    }
  },

  [TechnologyType.MAP_MAKING]: {
    id: TechnologyType.MAP_MAKING,
    name: 'Map Making',
    type: TechnologyType.MAP_MAKING,
    cost: 14,
    prerequisites: [TechnologyType.ALPHABET],
    era: TechnologyEra.CLASSICAL,
    description: 'Navigation and exploration techniques',
    unlocks: {
      units: ['trireme']
    }
  },

  [TechnologyType.MATHEMATICS]: {
    id: TechnologyType.MATHEMATICS,
    name: 'Mathematics',
    type: TechnologyType.MATHEMATICS,
    cost: 12,
    prerequisites: [TechnologyType.ALPHABET],
    era: TechnologyEra.CLASSICAL,
    description: 'Numerical systems and calculations',
    unlocks: {
      units: ['catapult'],
      buildings: ['colosseum']
    }
  },

  [TechnologyType.CURRENCY]: {
    id: TechnologyType.CURRENCY,
    name: 'Currency',
    type: TechnologyType.CURRENCY,
    cost: 14,
    prerequisites: [TechnologyType.BRONZE_WORKING],
    era: TechnologyEra.CLASSICAL,
    description: 'Standardized trade and economic systems',
    unlocks: {
      buildings: ['marketplace']
    }
  },

  [TechnologyType.CONSTRUCTION]: {
    id: TechnologyType.CONSTRUCTION,
    name: 'Construction',
    type: TechnologyType.CONSTRUCTION,
    cost: 16,
    prerequisites: [TechnologyType.MASONRY, TechnologyType.THE_WHEEL],
    era: TechnologyEra.CLASSICAL,
    description: 'Advanced building techniques',
    unlocks: {
      buildings: ['aqueduct'],
      improvements: ['fortress']
    }
  },

  [TechnologyType.THE_REPUBLIC]: {
    id: TechnologyType.THE_REPUBLIC,
    name: 'The Republic',
    type: TechnologyType.THE_REPUBLIC,
    cost: 16,
    prerequisites: [TechnologyType.WRITING],
    era: TechnologyEra.CLASSICAL,
    description: 'Democratic governance and civic participation',
    unlocks: {
      governments: ['republic']
    }
  },

  // Medieval Era
  [TechnologyType.CHIVALRY]: {
    id: TechnologyType.CHIVALRY,
    name: 'Chivalry',
    type: TechnologyType.CHIVALRY,
    cost: 20,
    prerequisites: [TechnologyType.HORSEBACK_RIDING, TechnologyType.FEUDALISM],
    era: TechnologyEra.MEDIEVAL,
    description: 'Code of honor for mounted warriors',
    unlocks: {
      units: ['knights']
    }
  },

  [TechnologyType.FEUDALISM]: {
    id: TechnologyType.FEUDALISM,
    name: 'Feudalism',
    type: TechnologyType.FEUDALISM,
    cost: 18,
    prerequisites: [TechnologyType.THE_REPUBLIC],
    era: TechnologyEra.MEDIEVAL,
    description: 'Medieval social and political system',
    unlocks: {
      buildings: ['castle']
    }
  },

  [TechnologyType.MONOTHEISM]: {
    id: TechnologyType.MONOTHEISM,
    name: 'Monotheism',
    type: TechnologyType.MONOTHEISM,
    cost: 18,
    prerequisites: [TechnologyType.MYSTICISM],
    era: TechnologyEra.MEDIEVAL,
    description: 'Belief in a single divine entity',
    unlocks: {
      buildings: ['cathedral']
    }
  },

  [TechnologyType.THEOLOGY]: {
    id: TechnologyType.THEOLOGY,
    name: 'Theology',
    type: TechnologyType.THEOLOGY,
    cost: 20,
    prerequisites: [TechnologyType.MONOTHEISM],
    era: TechnologyEra.MEDIEVAL,
    description: 'Systematic study of religious doctrine',
    unlocks: {
      wonders: ['michelangelos_chapel']
    }
  },

  [TechnologyType.NAVIGATION]: {
    id: TechnologyType.NAVIGATION,
    name: 'Navigation',
    type: TechnologyType.NAVIGATION,
    cost: 22,
    prerequisites: [TechnologyType.MAP_MAKING, TechnologyType.ASTRONOMY],
    era: TechnologyEra.MEDIEVAL,
    description: 'Advanced seafaring and exploration',
    unlocks: {
      units: ['sail']
    }
  },

  [TechnologyType.ASTRONOMY]: {
    id: TechnologyType.ASTRONOMY,
    name: 'Astronomy',
    type: TechnologyType.ASTRONOMY,
    cost: 20,
    prerequisites: [TechnologyType.MYSTICISM, TechnologyType.MATHEMATICS],
    era: TechnologyEra.MEDIEVAL,
    description: 'Study of celestial bodies',
    unlocks: {
      wonders: ['copernicus_observatory']
    }
  },

  // Renaissance Era
  [TechnologyType.GUNPOWDER]: {
    id: TechnologyType.GUNPOWDER,
    name: 'Gunpowder',
    type: TechnologyType.GUNPOWDER,
    cost: 26,
    prerequisites: [TechnologyType.IRON_WORKING, TechnologyType.INVENTION],
    era: TechnologyEra.RENAISSANCE,
    description: 'Explosive powder revolutionizes warfare',
    unlocks: {
      units: ['musketeers']
    }
  },

  [TechnologyType.INVENTION]: {
    id: TechnologyType.INVENTION,
    name: 'Invention',
    type: TechnologyType.INVENTION,
    cost: 24,
    prerequisites: [TechnologyType.CONSTRUCTION],
    era: TechnologyEra.RENAISSANCE,
    description: 'Systematic approach to creating new technologies',
    unlocks: {
      wonders: ['leonardo_workshop']
    }
  },

  [TechnologyType.UNIVERSITY]: {
    id: TechnologyType.UNIVERSITY,
    name: 'University',
    type: TechnologyType.UNIVERSITY,
    cost: 24,
    prerequisites: [TechnologyType.MATHEMATICS],
    era: TechnologyEra.RENAISSANCE,
    description: 'Higher learning and research institutions',
    unlocks: {
      buildings: ['university']
    }
  },

  [TechnologyType.PHILOSOPHY]: {
    id: TechnologyType.PHILOSOPHY,
    name: 'Philosophy',
    type: TechnologyType.PHILOSOPHY,
    cost: 22,
    prerequisites: [TechnologyType.MYSTICISM, TechnologyType.LITERACY],
    era: TechnologyEra.RENAISSANCE,
    description: 'Systematic thinking about existence and knowledge',
    unlocks: {
      governments: ['democracy']
    }
  },

  [TechnologyType.METALLURGY]: {
    id: TechnologyType.METALLURGY,
    name: 'Metallurgy',
    type: TechnologyType.METALLURGY,
    cost: 28,
    prerequisites: [TechnologyType.GUNPOWDER, TechnologyType.UNIVERSITY],
    era: TechnologyEra.RENAISSANCE,
    description: 'Advanced metal working and alloys',
    unlocks: {
      units: ['cannon']
    }
  },

  // Industrial Era
  [TechnologyType.STEAM_ENGINE]: {
    id: TechnologyType.STEAM_ENGINE,
    name: 'Steam Engine',
    type: TechnologyType.STEAM_ENGINE,
    cost: 32,
    prerequisites: [TechnologyType.INVENTION, TechnologyType.PHYSICS],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Mechanical power from steam pressure',
    unlocks: {
      units: ['ironclad'],
      buildings: ['factory']
    }
  },

  [TechnologyType.MAGNETISM]: {
    id: TechnologyType.MAGNETISM,
    name: 'Magnetism',
    type: TechnologyType.MAGNETISM,
    cost: 30,
    prerequisites: [TechnologyType.PHYSICS, TechnologyType.NAVIGATION],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Understanding of magnetic forces',
    unlocks: {
      units: ['frigate']
    }
  },

  [TechnologyType.ELECTRICITY]: {
    id: TechnologyType.ELECTRICITY,
    name: 'Electricity',
    type: TechnologyType.ELECTRICITY,
    cost: 34,
    prerequisites: [TechnologyType.METALLURGY, TechnologyType.MAGNETISM],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Harnessing electrical power',
    unlocks: {
      buildings: ['hydro_plant']
    }
  },

  [TechnologyType.STEEL]: {
    id: TechnologyType.STEEL,
    name: 'Steel',
    type: TechnologyType.STEEL,
    cost: 36,
    prerequisites: [TechnologyType.ELECTRICITY, TechnologyType.INDUSTRIALIZATION],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Superior metal alloy production',
    unlocks: {
      units: ['battleship']
    }
  },

  [TechnologyType.INDUSTRIALIZATION]: {
    id: TechnologyType.INDUSTRIALIZATION,
    name: 'Industrialization',
    type: TechnologyType.INDUSTRIALIZATION,
    cost: 34,
    prerequisites: [TechnologyType.STEAM_ENGINE, TechnologyType.THE_CORPORATION],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Mass production and factory systems',
    unlocks: {
      units: ['transport']
    }
  },

  [TechnologyType.CONSCRIPTION]: {
    id: TechnologyType.CONSCRIPTION,
    name: 'Conscription',
    type: TechnologyType.CONSCRIPTION,
    cost: 32,
    prerequisites: [TechnologyType.THE_REPUBLIC, TechnologyType.METALLURGY],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Mandatory military service',
    unlocks: {
      units: ['riflemen']
    }
  },

  // Modern Era
  [TechnologyType.COMBUSTION]: {
    id: TechnologyType.COMBUSTION,
    name: 'Combustion',
    type: TechnologyType.COMBUSTION,
    cost: 40,
    prerequisites: [TechnologyType.STEEL, TechnologyType.ELECTRICITY],
    era: TechnologyEra.MODERN,
    description: 'Internal combustion engines',
    unlocks: {
      units: ['cruiser']
    }
  },

  [TechnologyType.AUTOMOBILE]: {
    id: TechnologyType.AUTOMOBILE,
    name: 'Automobile',
    type: TechnologyType.AUTOMOBILE,
    cost: 42,
    prerequisites: [TechnologyType.COMBUSTION, TechnologyType.STEEL],
    era: TechnologyEra.MODERN,
    description: 'Self-propelled vehicles',
    unlocks: {
      units: ['armor']
    }
  },

  [TechnologyType.FLIGHT]: {
    id: TechnologyType.FLIGHT,
    name: 'Flight',
    type: TechnologyType.FLIGHT,
    cost: 44,
    prerequisites: [TechnologyType.COMBUSTION, TechnologyType.ELECTRONICS],
    era: TechnologyEra.MODERN,
    description: 'Powered aircraft and aviation',
    unlocks: {
      units: ['fighter']
    }
  },

  [TechnologyType.ADVANCED_FLIGHT]: {
    id: TechnologyType.ADVANCED_FLIGHT,
    name: 'Advanced Flight',
    type: TechnologyType.ADVANCED_FLIGHT,
    cost: 48,
    prerequisites: [TechnologyType.FLIGHT, TechnologyType.RADIO],
    era: TechnologyEra.MODERN,
    description: 'Advanced aviation and bomber aircraft',
    unlocks: {
      units: ['bomber', 'carrier']
    }
  },

  [TechnologyType.ROCKETRY]: {
    id: TechnologyType.ROCKETRY,
    name: 'Rocketry',
    type: TechnologyType.ROCKETRY,
    cost: 50,
    prerequisites: [TechnologyType.ADVANCED_FLIGHT, TechnologyType.ELECTRONICS],
    era: TechnologyEra.MODERN,
    description: 'Rocket propulsion technology',
    unlocks: {
      units: ['nuclear']
    }
  },

  [TechnologyType.NUCLEAR_FISSION]: {
    id: TechnologyType.NUCLEAR_FISSION,
    name: 'Nuclear Fission',
    type: TechnologyType.NUCLEAR_FISSION,
    cost: 52,
    prerequisites: [TechnologyType.MASS_PRODUCTION, TechnologyType.ELECTRONICS],
    era: TechnologyEra.MODERN,
    description: 'Splitting atoms for energy and weapons',
    unlocks: {
      wonders: ['manhattan_project'],
      buildings: ['nuclear_plant']
    }
  },

  // Information Era
  [TechnologyType.ROBOTICS]: {
    id: TechnologyType.ROBOTICS,
    name: 'Robotics',
    type: TechnologyType.ROBOTICS,
    cost: 56,
    prerequisites: [TechnologyType.COMPUTERS, TechnologyType.MASS_PRODUCTION],
    era: TechnologyEra.INFORMATION,
    description: 'Automated machinery and artificial intelligence',
    unlocks: {
      units: ['artillery']
    }
  },

  [TechnologyType.MASS_PRODUCTION]: {
    id: TechnologyType.MASS_PRODUCTION,
    name: 'Mass Production',
    type: TechnologyType.MASS_PRODUCTION,
    cost: 46,
    prerequisites: [TechnologyType.AUTOMOBILE, TechnologyType.ELECTRONICS],
    era: TechnologyEra.INFORMATION,
    description: 'Assembly line manufacturing',
    unlocks: {
      units: ['submarine']
    }
  },

  [TechnologyType.LABOR_UNION]: {
    id: TechnologyType.LABOR_UNION,
    name: 'Labor Union',
    type: TechnologyType.LABOR_UNION,
    cost: 48,
    prerequisites: [TechnologyType.MASS_PRODUCTION, TechnologyType.THE_CORPORATION],
    era: TechnologyEra.INFORMATION,
    description: 'Worker organization and rights',
    unlocks: {
      units: ['mechanized_infantry']
    }
  },

  // Additional Technologies
  [TechnologyType.LITERACY]: {
    id: TechnologyType.LITERACY,
    name: 'Literacy',
    type: TechnologyType.LITERACY,
    cost: 16,
    prerequisites: [TechnologyType.WRITING],
    era: TechnologyEra.CLASSICAL,
    description: 'Widespread reading and writing ability',
    unlocks: {
      buildings: ['library']
    }
  },

  [TechnologyType.TRADE]: {
    id: TechnologyType.TRADE,
    name: 'Trade',
    type: TechnologyType.TRADE,
    cost: 14,
    prerequisites: [TechnologyType.CURRENCY],
    era: TechnologyEra.CLASSICAL,
    description: 'Commercial exchange and merchant activity',
    unlocks: {
      units: ['caravan']
    }
  },

  [TechnologyType.MONARCHY]: {
    id: TechnologyType.MONARCHY,
    name: 'Monarchy',
    type: TechnologyType.MONARCHY,
    cost: 18,
    prerequisites: [TechnologyType.CEREMONIAL_BURIAL],
    era: TechnologyEra.MEDIEVAL,
    description: 'Hereditary rule and royal authority',
    unlocks: {
      governments: ['monarchy']
    }
  },

  [TechnologyType.DEMOCRACY]: {
    id: TechnologyType.DEMOCRACY,
    name: 'Democracy',
    type: TechnologyType.DEMOCRACY,
    cost: 30,
    prerequisites: [TechnologyType.PHILOSOPHY, TechnologyType.LITERACY],
    era: TechnologyEra.RENAISSANCE,
    description: 'Government by the people',
    unlocks: {
      governments: ['democracy']
    }
  },

  [TechnologyType.COMMUNISM]: {
    id: TechnologyType.COMMUNISM,
    name: 'Communism',
    type: TechnologyType.COMMUNISM,
    cost: 38,
    prerequisites: [TechnologyType.PHILOSOPHY, TechnologyType.INDUSTRIALIZATION],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Collective ownership of property',
    unlocks: {
      governments: ['communism']
    }
  },

  [TechnologyType.ECONOMICS]: {
    id: TechnologyType.ECONOMICS,
    name: 'Economics',
    type: TechnologyType.ECONOMICS,
    cost: 28,
    prerequisites: [TechnologyType.BANKING, TechnologyType.UNIVERSITY],
    era: TechnologyEra.RENAISSANCE,
    description: 'Study of production, distribution, and consumption',
    unlocks: {
      buildings: ['marketplace']
    }
  },

  [TechnologyType.COMPUTERS]: {
    id: TechnologyType.COMPUTERS,
    name: 'Computers',
    type: TechnologyType.COMPUTERS,
    cost: 54,
    prerequisites: [TechnologyType.ELECTRONICS, TechnologyType.NUCLEAR_FISSION],
    era: TechnologyEra.INFORMATION,
    description: 'Electronic computation and data processing',
    unlocks: {
      buildings: ['research_lab']
    }
  },

  [TechnologyType.ELECTRONICS]: {
    id: TechnologyType.ELECTRONICS,
    name: 'Electronics',
    type: TechnologyType.ELECTRONICS,
    cost: 38,
    prerequisites: [TechnologyType.ELECTRICITY, TechnologyType.INDUSTRIALIZATION],
    era: TechnologyEra.MODERN,
    description: 'Electronic circuits and devices',
    unlocks: {
      buildings: ['electronics_factory']
    }
  },

  [TechnologyType.RADIO]: {
    id: TechnologyType.RADIO,
    name: 'Radio',
    type: TechnologyType.RADIO,
    cost: 36,
    prerequisites: [TechnologyType.ELECTRONICS],
    era: TechnologyEra.MODERN,
    description: 'Wireless communication technology',
    unlocks: {
      buildings: ['radio_station']
    }
  },

  [TechnologyType.PHYSICS]: {
    id: TechnologyType.PHYSICS,
    name: 'Physics',
    type: TechnologyType.PHYSICS,
    cost: 26,
    prerequisites: [TechnologyType.MATHEMATICS, TechnologyType.UNIVERSITY],
    era: TechnologyEra.RENAISSANCE,
    description: 'Understanding of natural forces and matter',
    unlocks: {
      wonders: ['isaac_newton_college']
    }
  },

  [TechnologyType.CHEMISTRY]: {
    id: TechnologyType.CHEMISTRY,
    name: 'Chemistry',
    type: TechnologyType.CHEMISTRY,
    cost: 28,
    prerequisites: [TechnologyType.UNIVERSITY, TechnologyType.MEDICINE],
    era: TechnologyEra.RENAISSANCE,
    description: 'Study of matter and chemical reactions',
    unlocks: {
      buildings: ['hospital']
    }
  },

  [TechnologyType.MEDICINE]: {
    id: TechnologyType.MEDICINE,
    name: 'Medicine',
    type: TechnologyType.MEDICINE,
    cost: 26,
    prerequisites: [TechnologyType.PHILOSOPHY, TechnologyType.TRADE],
    era: TechnologyEra.RENAISSANCE,
    description: 'Healing arts and medical knowledge',
    unlocks: {
      buildings: ['hospital']
    }
  },

  [TechnologyType.THE_CORPORATION]: {
    id: TechnologyType.THE_CORPORATION,
    name: 'The Corporation',
    type: TechnologyType.THE_CORPORATION,
    cost: 30,
    prerequisites: [TechnologyType.ECONOMICS, TechnologyType.INDUSTRIALIZATION],
    era: TechnologyEra.INDUSTRIAL,
    description: 'Large-scale business organization',
    unlocks: {
      buildings: ['stock_exchange']
    }
  },

  [TechnologyType.BANKING]: {
    id: TechnologyType.BANKING,
    name: 'Banking',
    type: TechnologyType.BANKING,
    cost: 24,
    prerequisites: [TechnologyType.TRADE, TechnologyType.THE_REPUBLIC],
    era: TechnologyEra.RENAISSANCE,
    description: 'Financial institutions and credit systems',
    unlocks: {
      buildings: ['bank']
    }
  },

  [TechnologyType.POLYTHEISM]: {
    id: TechnologyType.POLYTHEISM,
    name: 'Polytheism',
    type: TechnologyType.POLYTHEISM,
    cost: 12,
    prerequisites: [TechnologyType.CEREMONIAL_BURIAL],
    era: TechnologyEra.ANCIENT,
    description: 'Belief in multiple deities',
    unlocks: {
      buildings: ['temple']
    }
  },

  [TechnologyType.SEAFARING]: {
    id: TechnologyType.SEAFARING,
    name: 'Seafaring',
    type: TechnologyType.SEAFARING,
    cost: 16,
    prerequisites: [TechnologyType.MAP_MAKING, TechnologyType.POTTERY],
    era: TechnologyEra.CLASSICAL,
    description: 'Ocean navigation and maritime trade',
    unlocks: {
      units: ['galley']
    }
  },

  [TechnologyType.SPACE_FLIGHT]: {
    id: TechnologyType.SPACE_FLIGHT,
    name: 'Space Flight',
    type: TechnologyType.SPACE_FLIGHT,
    cost: 60,
    prerequisites: [TechnologyType.ROCKETRY, TechnologyType.COMPUTERS],
    era: TechnologyEra.INFORMATION,
    description: 'Travel beyond Earth\'s atmosphere',
    unlocks: {
      wonders: ['apollo_program']
    }
  },

  [TechnologyType.GENETIC_ENGINEERING]: {
    id: TechnologyType.GENETIC_ENGINEERING,
    name: 'Genetic Engineering',
    type: TechnologyType.GENETIC_ENGINEERING,
    cost: 58,
    prerequisites: [TechnologyType.MEDICINE, TechnologyType.COMPUTERS],
    era: TechnologyEra.INFORMATION,
    description: 'Manipulation of genetic material',
    unlocks: {
      wonders: ['cure_for_cancer']
    }
  }
};

// Helper functions for technology management
export function getTechnology(type: TechnologyType): Technology {
  return TECHNOLOGY_DEFINITIONS[type];
}

export function getTechnologiesByEra(era: TechnologyEra): Technology[] {
  return Object.values(TECHNOLOGY_DEFINITIONS).filter(tech => tech.era === era);
}

export function getPrerequisites(type: TechnologyType): TechnologyType[] {
  return TECHNOLOGY_DEFINITIONS[type].prerequisites;
}

export function canResearch(type: TechnologyType, knownTechnologies: TechnologyType[]): boolean {
  const prerequisites = getPrerequisites(type);
  return prerequisites.every(prereq => knownTechnologies.includes(prereq));
}

export function getResearchCost(type: TechnologyType): number {
  return TECHNOLOGY_DEFINITIONS[type].cost;
}

export function getUnlockedUnits(type: TechnologyType): string[] {
  return TECHNOLOGY_DEFINITIONS[type].unlocks.units || [];
}

export function getUnlockedBuildings(type: TechnologyType): string[] {
  return TECHNOLOGY_DEFINITIONS[type].unlocks.buildings || [];
}

export function getUnlockedGovernments(type: TechnologyType): string[] {
  return TECHNOLOGY_DEFINITIONS[type].unlocks.governments || [];
}
