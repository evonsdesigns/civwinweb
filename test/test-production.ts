// Test script to verify technology-based production system
import { ProductionManager } from '../src/game/ProductionManager';
import { TechnologyType } from '../src/game/TechnologyDefinitions';
import { BuildingType } from '../src/types/game';

// Test basic functionality
console.log('=== Technology-Based Production System Test ===\n');

// Test 1: Player with no technologies (start of game)
console.log('Test 1: Starting technologies only');
const startingTechs: TechnologyType[] = [];
const noBuildings: BuildingType[] = [];

const startingOptions = ProductionManager.getAvailableProduction(startingTechs, noBuildings, 2);
console.log('Available at start:', startingOptions.map(opt => opt.name));

// Test 2: Player with Bronze Working (can build Phalanx)
console.log('\nTest 2: With Bronze Working technology');
const bronzeWorkingTechs: TechnologyType[] = [TechnologyType.BRONZE_WORKING];
const bronzeOptions = ProductionManager.getAvailableProduction(bronzeWorkingTechs, noBuildings, 2);
console.log('Available with Bronze Working:', bronzeOptions.map(opt => opt.name));

// Test 3: Player with multiple technologies
console.log('\nTest 3: With multiple technologies');
const multiTechs: TechnologyType[] = [
  TechnologyType.POTTERY,
  TechnologyType.BRONZE_WORKING,
  TechnologyType.CEREMONIAL_BURIAL,
  TechnologyType.WRITING
];
const multiOptions = ProductionManager.getAvailableProduction(multiTechs, noBuildings, 2);
console.log('Available with multiple techs:');
multiOptions.forEach(opt => {
  console.log(`  ${opt.name} (${opt.type}) - ${opt.cost} shields, ${opt.turns} turns`);
});

// Test 4: Building dependencies (Bank requires Marketplace)
console.log('\nTest 4: Building dependencies');
const advancedTechs: TechnologyType[] = [
  TechnologyType.CURRENCY,
  TechnologyType.BANKING
];
const withMarketplace: BuildingType[] = [BuildingType.MARKETPLACE];
const dependencyOptions = ProductionManager.getAvailableProduction(advancedTechs, withMarketplace, 2);
console.log('Available with Banking + Marketplace built:', dependencyOptions.map(opt => opt.name));

const withoutMarketplace: BuildingType[] = [];
const noDependencyOptions = ProductionManager.getAvailableProduction(advancedTechs, withoutMarketplace, 2);
console.log('Available with Banking but no Marketplace:', noDependencyOptions.map(opt => opt.name));

// Test 5: Can't build same building twice
console.log('\nTest 5: Cannot build same building twice');
const withGranary: BuildingType[] = [BuildingType.GRANARY];
const potteryTechs: TechnologyType[] = [TechnologyType.POTTERY];
const duplicateOptions = ProductionManager.getAvailableProduction(potteryTechs, withGranary, 2);
console.log('Available with Pottery + Granary already built:', duplicateOptions.map(opt => opt.name));

console.log('\n=== Test Complete ===');
