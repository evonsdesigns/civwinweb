import { Unit, Position } from '../types/game';
import { BaseUnit } from './Units';
import { getUnitStats } from './UnitDefinitions';

export interface CombatResult {
  attacker: Unit;
  defender: Unit;
  attackerDamage: number;
  defenderDamage: number;
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  experienceGained: number;
}

export class CombatSystem {
  
  // Calculate combat result between two units
  public resolveCombat(attacker: Unit, defender: Unit, defenderHasFortress: boolean = false): CombatResult {
    const attackerUnit = attacker as BaseUnit;
    const defenderUnit = defender as BaseUnit;
    
    const attackerStrength = this.getEffectiveAttackStrength(attackerUnit);
    const defenderStrength = this.getEffectiveDefenseStrength(defenderUnit, defenderHasFortress);
    
    // Calculate damage ratio
    const totalStrength = attackerStrength + defenderStrength;
    const attackerWinChance = attackerStrength / totalStrength;
    
    // Determine winner (simplified - in real Civ, multiple rounds occur)
    const attackerWins = Math.random() < attackerWinChance;
    
    let attackerDamage = 0;
    let defenderDamage = 0;
    let experienceGained = 0;
    
    if (attackerWins) {
      // Attacker wins - defender takes heavy damage
      defenderDamage = Math.floor(50 + (attackerStrength / defenderStrength) * 30);
      attackerDamage = Math.floor(10 + Math.random() * 20);
      experienceGained = 10;
    } else {
      // Defender wins - attacker takes heavy damage
      attackerDamage = Math.floor(50 + (defenderStrength / attackerStrength) * 30);
      defenderDamage = Math.floor(10 + Math.random() * 20);
    }
    
    // Apply damage
    attacker.health = Math.max(0, attacker.health - attackerDamage);
    defender.health = Math.max(0, defender.health - defenderDamage);
    
    // Award experience to survivor
    if (attacker.health > 0 && attackerWins) {
      attacker.experience += experienceGained;
      this.checkForVeteranStatus(attacker);
    }
    
    return {
      attacker,
      defender,
      attackerDamage,
      defenderDamage,
      attackerSurvived: attacker.health > 0,
      defenderSurvived: defender.health > 0,
      experienceGained
    };
  }
  
  // Get effective attack strength considering bonuses
  private getEffectiveAttackStrength(unit: BaseUnit): number {
    const stats = getUnitStats(unit.type);
    let strength = stats.attack;
    
    // Veteran bonus
    if (unit.isVeteran) {
      strength = Math.floor(strength * 1.5);
    }
    
    return strength;
  }
  
  // Get effective defense strength considering bonuses
  private getEffectiveDefenseStrength(unit: BaseUnit, hasFortress: boolean = false): number {
    const stats = getUnitStats(unit.type);
    let strength = stats.defense;
    
    // Veteran bonus
    if (unit.isVeteran) {
      strength = Math.floor(strength * 1.5);
    }
    
    // Fortification bonus
    if (unit.fortified) {
      strength = Math.floor(strength * 1.5);
    }
    
    // Fortress bonus - doubles defensive strength
    if (hasFortress) {
      strength = Math.floor(strength * 2.0);
    }
    
    // TODO: Add terrain defense bonuses (hills, forests, etc.)
    // TODO: Add city walls bonus (triple defense for some units)
    
    return strength;
  }
  
  // Check if unit should become veteran
  private checkForVeteranStatus(unit: Unit): void {
    if (unit.experience >= 100 && !unit.isVeteran) {
      unit.isVeteran = true;
    }
  }
  
  // Check if attack is valid
  public canAttack(attacker: Unit, defender: Unit): boolean {
    const attackerStats = getUnitStats(attacker.type);
    
    // Only units that can attack may initiate combat
    if (!attackerStats.canAttack) {
      return false;
    }
    
    // Check if units are adjacent (simplified)
    const distance = this.calculateDistance(attacker.position, defender.position);
    if (distance > 1) {
      return false;
    }
    
    // Check if attacker has movement points
    if (attacker.movementPoints <= 0) {
      return false;
    }
    
    // Cannot attack units of same player
    if (attacker.playerId === defender.playerId) {
      return false;
    }
    
    return true;
  }
  
  // Calculate distance between two positions
  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }
  
  // Execute attack if valid
  public executeAttack(attacker: Unit, defender: Unit, defenderHasFortress: boolean = false): CombatResult | null {
    if (!this.canAttack(attacker, defender)) {
      return null;
    }
    
    // Attacking uses all remaining movement points
    attacker.movementPoints = 0;
    
    return this.resolveCombat(attacker, defender, defenderHasFortress);
  }
}
