import { GameState, Player, Position } from '../../types/game';
import { AIMood, DiplomacyContact, DiplomacyManager, DiplomacyProposal, DiplomaticStatus } from '../DiplomacyManager';

// ─────────────────────────────────────────────────────────────
// AI ↔ AI diplomacy.
//
// Contact, war and ceasefire between two AI civilizations never happened before:
// every AI/AI relationship stayed UNCONTACTED forever, and the combat AI refuses to
// attack uncontacted players. This module makes the AIs meet, fight and make peace.
// ─────────────────────────────────────────────────────────────

/** Tiles (Chebyshev) within which two civilizations' units/cities count as having met. */
const CONTACT_RADIUS = 2;
/** No AI declares war before this turn, giving everyone time to expand. */
const MIN_TURN_FOR_WAR = 20;
/** An AI never fights more than this many AI opponents at once. */
const MAX_CONCURRENT_WARS = 2;
/** Turns a war must last before a ceasefire is considered. */
const MIN_WAR_DURATION = 12;
/** Turns after a ceasefire before the same pair can go to war again. */
const CEASEFIRE_COOLDOWN = 20;

const CEASEFIRE_CHANCE_VS_STRONGER = 0.2;
const CEASEFIRE_CHANCE_OTHERWISE = 0.08;

const STRONGER_RATIO = 1.1;
const MUCH_WEAKER_RATIO = 0.6;

function isActiveAI(player: Player): boolean {
  return !player.isHuman && !player.isBarbarian && !player.defeated;
}

/** Same scoring the combat AI uses for "who is stronger": cities x3 + units. */
function militaryScore(gameState: GameState, playerId: string): number {
  let score = 0;
  for (const city of gameState.cities) if (city.playerId === playerId) score += 3;
  for (const unit of gameState.units) if (unit.playerId === playerId) score += 1;
  return score;
}

function keyFor(x: number, y: number): string {
  return `${x},${y}`;
}

/** Every tile occupied by one of this player's units or cities. */
function occupiedKeys(gameState: GameState, playerId: string): Set<string> {
  const keys = new Set<string>();
  for (const unit of gameState.units) {
    if (unit.playerId === playerId) keys.add(keyFor(unit.position.x, unit.position.y));
  }
  for (const city of gameState.cities) {
    if (city.playerId === playerId) keys.add(keyFor(city.position.x, city.position.y));
  }
  return keys;
}

/** True if any of `mine` lies within CONTACT_RADIUS of any tile in `theirs` (with horizontal wrap). */
function haveMet(mine: Position[], theirs: Set<string>, mapWidth: number): boolean {
  for (const pos of mine) {
    for (let dy = -CONTACT_RADIUS; dy <= CONTACT_RADIUS; dy++) {
      for (let dx = -CONTACT_RADIUS; dx <= CONTACT_RADIUS; dx++) {
        const x = ((pos.x + dx) % mapWidth + mapWidth) % mapWidth;
        if (theirs.has(keyFor(x, pos.y + dy))) return true;
      }
    }
  }
  return false;
}

/**
 * Run one AI civilization's diplomacy against the other AI civilizations.
 * Call once per AI turn, before that AI moves its units.
 */
export function processAIToAIDiplomacy(
  gameState: GameState,
  playerId: string,
  dm: DiplomacyManager,
): void {
  const me = gameState.players.find(p => p.id === playerId);
  if (!me || !isActiveAI(me)) return;

  const turn = gameState.turn;
  const others = gameState.players.filter(p => p.id !== playerId && isActiveAI(p));
  if (others.length === 0) return;

  // ── 1. First contact ─────────────────────────────────────────────────────
  const uncontacted = others.filter(
    o => dm.getRelationship(playerId, o.id).status === DiplomaticStatus.UNCONTACTED,
  );
  if (uncontacted.length > 0) {
    const mapWidth = gameState.worldMap[0]?.length ?? 80;
    const myPositions: Position[] = [];
    for (const unit of gameState.units) if (unit.playerId === playerId) myPositions.push(unit.position);
    for (const city of gameState.cities) if (city.playerId === playerId) myPositions.push(city.position);

    for (const other of uncontacted) {
      if (haveMet(myPositions, occupiedKeys(gameState, other.id), mapWidth)) {
        dm.updateStatus(playerId, other.id, DiplomaticStatus.NEUTRAL);
        dm.getRelationship(playerId, other.id).lastContactTurn = turn;
      }
    }
  }

  // ── 2. Ceasefires ────────────────────────────────────────────────────────
  const myScore = militaryScore(gameState, playerId);
  let activeWars = 0;
  for (const other of others) {
    const rel = dm.getRelationship(playerId, other.id);
    if (rel.status !== DiplomaticStatus.WAR) continue;
    activeWars++;

    if (turn - (rel.warDeclaredTurn ?? 0) < MIN_WAR_DURATION) continue;
    const opponentStronger = militaryScore(gameState, other.id) > myScore * STRONGER_RATIO;
    const chance = opponentStronger ? CEASEFIRE_CHANCE_VS_STRONGER : CEASEFIRE_CHANCE_OTHERWISE;
    if (Math.random() < chance) {
      dm.updateStatus(playerId, other.id, DiplomaticStatus.NEUTRAL);
      rel.ceasefireTurn = turn;
      activeWars--;
      console.log(`AI ${playerId} and ${other.id} agree to a ceasefire (turn ${turn})`);
    }
  }

  // ── 3. War declarations ──────────────────────────────────────────────────
  if (turn < MIN_TURN_FOR_WAR) return;
  if (activeWars >= MAX_CONCURRENT_WARS) return;
  // Republics/Democracies are held back by their Senate.
  if (dm.doesSenateBlockSneakAttack(me)) return;

  // Only contacted, non-warring, non-treaty neighbours whose last ceasefire has cooled off.
  const targets = others.filter(o => {
    const rel = dm.getRelationship(playerId, o.id);
    if (rel.status !== DiplomaticStatus.NEUTRAL) return false;
    return rel.ceasefireTurn === undefined || turn - rel.ceasefireTurn >= CEASEFIRE_COOLDOWN;
  });
  if (targets.length === 0) return;

  // Go after the weakest rival: that is the one worth dominating.
  let weakest = targets[0];
  let weakestScore = militaryScore(gameState, weakest.id);
  for (let i = 1; i < targets.length; i++) {
    const score = militaryScore(gameState, targets[i].id);
    if (score < weakestScore) { weakest = targets[i]; weakestScore = score; }
  }

  // Aggressive civs (Mongols, Russians, ...) pick fights far more often than peaceful ones.
  const threat = dm.getEffectiveThreatLevel(me, turn);          // 0 (Babylon) .. 6 (Mongol)
  let chance = 0.01 + threat * 0.01;                             // 1% .. 7% per turn
  if (myScore > weakestScore * STRONGER_RATIO) chance *= 2;      // smell blood
  else if (myScore < weakestScore * MUCH_WEAKER_RATIO) chance *= 0.25; // too risky

  if (Math.random() < chance) {
    dm.updateStatus(playerId, weakest.id, DiplomaticStatus.WAR);
    dm.getRelationship(playerId, weakest.id).warDeclaredTurn = turn;
    console.log(`AI ${playerId} declares war on ${weakest.id} (turn ${turn})`);
  }
}

// ─────────────────────────────────────────────────────────────
// AI ↔ human diplomacy.
//
// Previously an AI only ever went to war with the human if the human provoked it or the
// AI happened to be in the rare AGGRESSIVE mood. Now AIs also pick fights with the human
// the same way they do with each other.
// ─────────────────────────────────────────────────────────────

/**
 * Decide whether this AI declares war on the human player this turn. When it does, the war
 * status is already applied; the caller should queue a DECLARE_WAR contact to tell the human.
 */
export function maybeDeclareWarOnHuman(
  gameState: GameState,
  playerId: string,
  dm: DiplomacyManager,
): DiplomacyContact | null {
  const me = gameState.players.find(p => p.id === playerId);
  const human = gameState.players.find(p => p.isHuman && !p.defeated);
  if (!me || !isActiveAI(me) || !human) return null;

  const turn = gameState.turn;
  if (turn < MIN_TURN_FOR_WAR) return null;
  if (dm.doesSenateBlockSneakAttack(me)) return null;

  // Only a contacted human we have no war or treaty with, and not right after a ceasefire.
  const rel = dm.getRelationship(playerId, human.id);
  if (rel.status !== DiplomaticStatus.NEUTRAL) return null;
  if (rel.ceasefireTurn !== undefined && turn - rel.ceasefireTurn < CEASEFIRE_COOLDOWN) return null;

  let activeWars = 0;
  for (const other of gameState.players) {
    if (other.id === playerId || other.isBarbarian || other.defeated) continue;
    if (dm.getRelationship(playerId, other.id).status === DiplomaticStatus.WAR) activeWars++;
  }
  if (activeWars >= MAX_CONCURRENT_WARS) return null;

  const myScore = militaryScore(gameState, playerId);
  const humanScore = militaryScore(gameState, human.id);
  const threat = dm.getEffectiveThreatLevel(me, turn);
  let chance = 0.01 + threat * 0.01;
  if (myScore > humanScore * STRONGER_RATIO) chance *= 2;
  else if (myScore < humanScore * MUCH_WEAKER_RATIO) chance *= 0.25;

  if (Math.random() >= chance) return null;

  dm.updateStatus(playerId, human.id, DiplomaticStatus.WAR);
  rel.warDeclaredTurn = turn;
  console.log(`AI ${playerId} declares war on the human player (turn ${turn})`);
  return {
    initiatorId: playerId,
    receiverId: human.id,
    proposal: DiplomacyProposal.DECLARE_WAR,
    turn,
  };
}

/**
 * When the human is not around to answer a contact (admin auto-play), treat it as a refusal
 * and use the same war odds the diplomacy dialog uses for a refused demand.
 */
export function wouldAIDeclareWarOnIgnoredContact(
  gameState: GameState,
  contact: DiplomacyContact,
  dm: DiplomacyManager,
): boolean {
  const demands =
    contact.proposal === DiplomacyProposal.DEMAND_TRIBUTE_GOLD ||
    contact.proposal === DiplomacyProposal.DEMAND_TRIBUTE_TECH ||
    contact.proposal === DiplomacyProposal.WITHDRAW_UNITS;
  if (!demands) return false;

  const ai = gameState.players.find(p => p.id === contact.initiatorId);
  const human = gameState.players.find(p => p.id === contact.receiverId);
  if (!ai || !human || ai.isHuman) return false;
  if (dm.getRelationship(ai.id, human.id).status === DiplomaticStatus.WAR) return false;

  const stronger = militaryScore(gameState, ai.id) > militaryScore(gameState, human.id) * STRONGER_RATIO;
  const mood = dm.calculateAIMood(ai, human, stronger, gameState.turn);

  if (mood === AIMood.AGGRESSIVE) return true;
  if (contact.proposal === DiplomacyProposal.DEMAND_TRIBUTE_TECH) {
    return mood === AIMood.DEMANDING && Math.random() < 0.85;
  }
  if (mood === AIMood.DEMANDING) return Math.random() < 0.8;
  if (mood === AIMood.HOSTILE) return Math.random() < 0.5;
  return false;
}
