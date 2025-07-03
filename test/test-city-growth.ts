import { CityGrowthSystem } from '../src/game/CityGrowthSystem.js';
import { BuildingType } from '../src/types/game.js';

// Test the Civilization I city growth mechanics
function testCityGrowthSystem() {
  console.log('=== Testing Civilization I City Growth System ===');
  
  // Test food storage capacity calculation
  console.log('\n--- Food Storage Capacity Tests ---');
  for (let pop = 1; pop <= 15; pop++) {
    const capacity = CityGrowthSystem.calculateFoodStorageCapacity(pop);
    console.log(`Population ${pop} → ${pop + 1}: ${capacity} food required`);
  }
  
  // Test city growth mechanics
  console.log('\n--- City Growth Simulation ---');
  
  // Create a mock city
  const mockCity: any = {
    id: 'test-city',
    name: 'Test City',
    position: { x: 0, y: 0 },
    population: 1,
    playerId: 'test-player',
    buildings: [],
    production: null,
    food: 0,
    foodStorage: 0,
    foodStorageCapacity: 0,
    production_points: 0,
    science: 0,
    culture: 0
  };
  
  // Initialize the city
  CityGrowthSystem.initializeCityFoodStorage(mockCity);
  console.log(`Initial city: Population ${mockCity.population}, Storage: ${mockCity.foodStorage}/${mockCity.foodStorageCapacity}`);
  
  // Simulate turns with surplus food
  let turn = 1;
  let foodProduction = 4; // 4 food per turn (2 consumption + 2 surplus for pop 1)
  
  while (mockCity.population < 5 && turn <= 30) {
    console.log(`\nTurn ${turn}:`);
    console.log(`  Food production: ${foodProduction}`);
    console.log(`  Food consumption: ${CityGrowthSystem.calculateFoodConsumption(mockCity)}`);
    console.log(`  Before growth: Pop ${mockCity.population}, Storage ${mockCity.foodStorage}/${mockCity.foodStorageCapacity}`);
    
    const grew = CityGrowthSystem.processCityGrowth(mockCity, foodProduction);
    
    if (grew) {
      console.log(`  🎉 CITY GREW! New population: ${mockCity.population}`);
      // Increase food production slightly as city grows
      foodProduction += 1;
    }
    
    console.log(`  After: Pop ${mockCity.population}, Storage ${mockCity.foodStorage}/${mockCity.foodStorageCapacity}`);
    console.log(`  Growth progress: ${CityGrowthSystem.getGrowthProgress(mockCity).toFixed(1)}%`);
    
    turn++;
  }
  
  // Test granary effect
  console.log('\n--- Testing Granary Effect ---');
  
  // Reset city and add granary
  mockCity.population = 2;
  mockCity.foodStorage = 25; // Almost full for size 2→3 (needs 30)
  mockCity.foodStorageCapacity = 30;
  mockCity.buildings = [{ type: BuildingType.GRANARY, completedTurn: 1 }];
  
  console.log(`City with granary: Pop ${mockCity.population}, Storage ${mockCity.foodStorage}/${mockCity.foodStorageCapacity}`);
  
  // Add enough food to grow
  const grewWithGranary = CityGrowthSystem.processCityGrowth(mockCity, 8); // 8 food (6 consumption + 2 surplus)
  
  if (grewWithGranary) {
    console.log(`🎉 City grew with granary! New population: ${mockCity.population}`);
    console.log(`Granary effect: Only used half the food storage!`);
    console.log(`Storage after growth: ${mockCity.foodStorage}/${mockCity.foodStorageCapacity}`);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testCityGrowthSystem();
