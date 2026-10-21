import { GamePhase, GameState, Player, UnitCategory, UnitType } from '../types/game';
import { getUnitStats } from '../game/UnitDefinitions';
import { getCivilization } from '../game/CivilizationDefinitions';
import { PopupSuppression } from '../utils/PopupSuppression';
import { TECHNOLOGY_DEFINITIONS } from '../game/TechnologyDefinitions';
import { TaxSystem } from '../game/TaxSystem';
import type { DiplomacyManager } from '../game/DiplomacyManager';

/** Per-civilization numbers captured at a point in time. */
interface CivSnapshot {
  cities: number;
  population: number;
  units: number;
  military: number;
  settlers: number;
  techs: number;
  gold: number;
  netGold: number;
  science: number;
  culture: number;
  wonders: number;
  buildings: number;
}

type MetricKey = keyof CivSnapshot;

interface TurnSnapshot {
  turn: number;
  civs: Record<string, CivSnapshot>;
}

const METRICS: ReadonlyArray<{ key: MetricKey; label: string }> = [
  { key: 'cities', label: 'Cities' },
  { key: 'population', label: 'Total Population' },
  { key: 'units', label: 'Units (all)' },
  { key: 'military', label: 'Military Units' },
  { key: 'settlers', label: 'Settlers' },
  { key: 'techs', label: 'Technologies' },
  { key: 'gold', label: 'Gold' },
  { key: 'netGold', label: 'Net Gold / Turn' },
  { key: 'science', label: 'Science / Turn' },
  { key: 'culture', label: 'Culture' },
  { key: 'wonders', label: 'Wonders' },
  { key: 'buildings', label: 'Buildings' },
];

/**
 * Local-only admin panel showing how each civilization is progressing.
 * Records one snapshot per turn so progression can be charted over time.
 */
/** Time between turns at 1x speed. Higher speed multipliers divide this (2x = 0.5s). */
const BASE_INTERVAL_MS = 1000;
const SPEED_OPTIONS: readonly number[] = [0.5, 1, 2, 4, 8, 16];
const DEFAULT_SPEED = 2;
/** How often the wait between turns re-checks Stop / speed changes. */
const WAIT_POLL_MS = 50;

export class AdminPanel {
  private overlay: HTMLElement | null = null;
  private history: TurnSnapshot[] = [];
  private selectedMetric: MetricKey = 'cities';
  private lastState: GameState | null = null;

  /** Auto-play speed multiplier (1 = one turn per second). */
  private speed = DEFAULT_SPEED;

  // Persistent DOM pieces. The panel shell is built once per open; only the table and chart
  // are refreshed each turn so open dropdowns and clicks are never destroyed mid-interaction.
  private titleEl: HTMLElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private minimizeBtn: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private tableHost: HTMLElement | null = null;
  private chartNote: HTMLElement | null = null;
  private chartCanvas: HTMLCanvasElement | null = null;

  /** True while the panel is collapsed to a small docked bar so the game stays visible and clickable. */
  private minimized = false;

  /** True while the user wants turns to keep passing automatically. */
  private autoPlaying = false;
  /** True while the auto-play loop is executing (guards against duplicate loops). */
  private autoPlayLoopRunning = false;

  /**
   * @param endTurn Ends the current turn and resolves once all AI turns have finished.
   * @param getDiplomacy Returns the live diplomacy state used for the "At War With" column.
   */
  constructor(
    private readonly endTurn: () => Promise<void>,
    private readonly getDiplomacy: () => DiplomacyManager,
  ) {}

  /** Discard recorded history (call when a new game starts). */
  public reset(): void {
    this.history = [];
  }

  /** Capture the current state. Replaces the snapshot if this turn was already recorded. */
  public recordSnapshot(gameState: GameState): void {
    this.lastState = gameState;
    const last = this.history[this.history.length - 1];
    // Turn counter went backwards => a different game was loaded.
    if (last && gameState.turn < last.turn) {
      this.history = [];
    }

    const civs: Record<string, CivSnapshot> = {};
    for (const player of gameState.players) {
      civs[player.id] = this.captureCiv(player, gameState);
    }

    const entry: TurnSnapshot = { turn: gameState.turn, civs };
    const tail = this.history[this.history.length - 1];
    if (tail && tail.turn === entry.turn) {
      this.history[this.history.length - 1] = entry;
    } else {
      this.history.push(entry);
    }
  }

  /** Update the open panel (no-op when closed). Also records a snapshot. */
  public refresh(gameState: GameState): void {
    this.recordSnapshot(gameState);
    if (this.overlay) this.updateContents();
  }

  public show(gameState: GameState): void {
    this.remove();
    this.recordSnapshot(gameState);

    const overlay = document.createElement('div');
    overlay.className = 'admin-overlay';
    overlay.addEventListener('click', e => {
      if (e.target === overlay && !this.minimized) this.remove();
    });
    document.addEventListener('keydown', this.onKeydown);

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.buildShell();
    this.updateContents();
  }

  public remove(): void {
    // Closing the panel is the safety net: never leave turns passing unattended.
    this.autoPlaying = false;
    document.removeEventListener('keydown', this.onKeydown);
    this.overlay?.remove();
    this.overlay = null;
    this.minimized = false;
    this.titleEl = null;
    this.playBtn = null;
    this.minimizeBtn = null;
    this.statusEl = null;
    this.tableHost = null;
    this.chartNote = null;
    this.chartCanvas = null;
  }

  public isOpen(): boolean {
    return this.overlay !== null;
  }

  private onKeydown = (e: KeyboardEvent): void => {
    // While minimized the user is interacting with the game, so Escape must not close the panel.
    if (e.key === 'Escape' && !this.minimized) {
      e.preventDefault();
      this.remove();
    }
  };

  private toggleMinimized(): void {
    this.minimized = !this.minimized;
    this.updateMinimized();
  }

  private updateMinimized(): void {
    this.overlay?.classList.toggle('admin-minimized', this.minimized);
    if (this.minimizeBtn) {
      this.minimizeBtn.textContent = this.minimized ? '\u25B2 Restore' : '\u25BC Minimize';
      this.minimizeBtn.title = this.minimized
        ? 'Show the full admin panel'
        : 'Shrink the panel so you can watch the game';
    }
  }

  // ── Auto-play ─────────────────────────────────────────────────────────────

  private toggleAutoPlay(): void {
    if (this.autoPlaying) {
      this.autoPlaying = false;
    } else {
      this.autoPlaying = true;
      // Silence all game popups (and take no action on them) while turns pass automatically.
      PopupSuppression.setActive(true);
      void this.runAutoPlay();
    }
    this.updateToolbar();
  }

  /** Ends a turn, waits for the speed-adjusted interval, repeats until stopped, the game ends, or an error occurs. */
  private async runAutoPlay(): Promise<void> {
    // A previous loop may still be waiting after a quick Stop -> Play; it will just continue.
    if (this.autoPlayLoopRunning) return;
    this.autoPlayLoopRunning = true;

    try {
      while (this.autoPlaying) {
        if (this.lastState && this.lastState.gamePhase !== GamePhase.PLAYING) break;
        await this.endTurn();
        await this.waitForNextTurn();
      }
    } catch (error) {
      console.error('Admin panel auto-play stopped due to an error:', error);
    } finally {
      this.autoPlaying = false;
      this.autoPlayLoopRunning = false;
      PopupSuppression.setActive(false);
      this.updateToolbar();
    }
  }

  /** Waits out the interval, re-checking so Stop and speed changes take effect promptly. */
  private async waitForNextTurn(): Promise<void> {
    const start = Date.now();
    while (this.autoPlaying && Date.now() - start < BASE_INTERVAL_MS / this.speed) {
      await new Promise<void>(resolve => window.setTimeout(resolve, WAIT_POLL_MS));
    }
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  private captureCiv(player: Player, gameState: GameState): CivSnapshot {
    const cities = gameState.cities.filter(c => c.playerId === player.id);
    const units = gameState.units.filter(u => u.playerId === player.id);

    let military = 0;
    for (const unit of units) {
      if (unit.type === UnitType.SETTLERS) continue;
      try {
        if (getUnitStats(unit.type).category !== UnitCategory.SPECIAL) military++;
      } catch {
        // Unknown unit type: don't count it as military.
      }
    }

    let wonders = 0;
    let buildings = 0;
    for (const city of cities) {
      for (const b of city.buildings) {
        if ((b.type as string).startsWith('wonder_')) wonders++;
        else buildings++;
      }
    }

    let netGold = 0;
    let science = 0;
    if (!player.isBarbarian) {
      try {
        const summary = TaxSystem.calculatePlayerTaxSummary(player, gameState);
        netGold = summary.netGoldIncome;
        science = summary.scienceIncome;
      } catch {
        // Tax data is informational only; never let it break the panel.
      }
    }

    return {
      cities: cities.length,
      population: cities.reduce((sum, c) => sum + c.population, 0),
      units: units.length,
      military,
      settlers: units.filter(u => u.type === UnitType.SETTLERS).length,
      techs: player.technologies?.length ?? 0,
      gold: player.gold ?? 0,
      netGold,
      science,
      culture: player.culture ?? 0,
      wonders,
      buildings,
    };
  }

  private civName(player: Player): string {
    if (player.isBarbarian) return 'Barbarians';
    try {
      return getCivilization(player.civilizationType).peoples;
    } catch {
      return player.name;
    }
  }

  private researchName(player: Player): string {
    if (!player.currentResearch) return '—';
    const tech = TECHNOLOGY_DEFINITIONS[player.currentResearch];
    return tech ? tech.name : String(player.currentResearch);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /** Build the static panel structure once. Dynamic parts are filled by updateContents(). */
  private buildShell(): void {
    if (!this.overlay) return;

    const dialog = document.createElement('div');
    dialog.className = 'admin-dialog';

    const title = document.createElement('div');
    title.className = 'admin-title';
    dialog.appendChild(title);
    this.titleEl = title;

    dialog.appendChild(this.buildToolbar());

    const body = document.createElement('div');
    body.className = 'admin-body';

    const tableHost = document.createElement('div');
    tableHost.className = 'admin-table-wrap';
    body.appendChild(tableHost);
    this.tableHost = tableHost;

    body.appendChild(this.buildChartSection());
    dialog.appendChild(body);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'admin-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.remove());
    dialog.appendChild(closeBtn);

    this.overlay.replaceChildren(dialog);
    this.updateMinimized();
  }

  /** Refresh the data-driven parts (title, table, chart) in place. */
  private updateContents(): void {
    const state = this.lastState;
    if (!this.overlay || !state) return;

    if (this.titleEl) this.titleEl.textContent = `Admin Panel \u2014 Turn ${state.turn}`;
    // Only the table node is swapped, so the wrapper keeps its horizontal scroll position.
    this.tableHost?.replaceChildren(this.buildTable(state));
    this.updateChart();
    this.updateToolbar();
  }

  private buildToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'admin-toolbar';

    const button = document.createElement('button');
    button.addEventListener('click', () => this.toggleAutoPlay());
    toolbar.appendChild(button);
    this.playBtn = button;

    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed: ';
    const speedSelect = document.createElement('select');
    speedSelect.className = 'admin-speed-select';
    for (const value of SPEED_OPTIONS) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = `${value}x`;
      option.selected = value === this.speed;
      speedSelect.appendChild(option);
    }
    speedSelect.addEventListener('change', () => {
      this.speed = Number(speedSelect.value);
      this.updateToolbar();
    });
    speedLabel.appendChild(speedSelect);
    toolbar.appendChild(speedLabel);

    const status = document.createElement('span');
    status.className = 'admin-toolbar-status';
    toolbar.appendChild(status);
    this.statusEl = status;

    const minimize = document.createElement('button');
    minimize.className = 'admin-minimize-btn';
    minimize.addEventListener('click', () => this.toggleMinimized());
    toolbar.appendChild(minimize);
    this.minimizeBtn = minimize;

    this.updateToolbar();
    return toolbar;
  }

  private updateToolbar(): void {
    if (this.playBtn) {
      this.playBtn.className = 'admin-play-btn' + (this.autoPlaying ? ' admin-playing' : '');
      this.playBtn.textContent = this.autoPlaying ? '\u25A0 Stop' : '\u25B6 Play';
      this.playBtn.title = this.autoPlaying ? 'Stop passing turns' : 'Start passing turns automatically';
    }
    if (this.statusEl) {
      const seconds = BASE_INTERVAL_MS / this.speed / 1000;
      this.statusEl.textContent = this.autoPlaying
        ? `Passing a turn every ${seconds}s \u2014 closing this panel also stops it`
        : `Paused (${seconds}s per turn at ${this.speed}x)`;
    }
  }

  /** Names of the (non-barbarian) civilizations this player is currently at war with. */
  private warTargets(player: Player, state: GameState): string {
    if (player.isBarbarian) return '\u2014';
    const diplomacy = this.getDiplomacy();
    const names = state.players
      .filter(other => other.id !== player.id && !other.isBarbarian && !other.defeated)
      .filter(other => diplomacy.isAtWar(player.id, other.id))
      .map(other => this.civName(other));
    return names.length ? names.join(', ') : '\u2014';
  }

  private buildTable(state: GameState): HTMLElement {
    const current = this.history[this.history.length - 1];
    const columns = [
      'Civilization', 'Government', 'At War With', 'Cities', 'Pop', 'Units', 'Military', 'Settlers',
      'Techs', 'Researching', 'Gold', 'Net/Turn', 'Sci/Turn', 'Wonders', 'Buildings', 'Culture',
    ];

    const table = document.createElement('table');
    table.className = 'admin-table';

    const headRow = table.createTHead().insertRow();
    for (const name of columns) {
      const th = document.createElement('th');
      th.textContent = name;
      headRow.appendChild(th);
    }

    const tbody = table.createTBody();
    for (const player of state.players) {
      const snap = current?.civs[player.id];
      if (!snap) continue;

      const row = tbody.insertRow();
      if (player.defeated) row.classList.add('admin-defeated');
      if (player.id === state.currentPlayer) row.classList.add('admin-current');

      const nameCell = row.insertCell();
      const swatch = document.createElement('span');
      swatch.className = 'admin-swatch';
      swatch.style.background = player.color;
      nameCell.appendChild(swatch);
      const tags = [player.isHuman ? 'human' : '', player.defeated ? 'defeated' : ''].filter(Boolean);
      nameCell.appendChild(document.createTextNode(
        this.civName(player) + (tags.length ? ` (${tags.join(', ')})` : '')
      ));

      const cells: Array<string | number> = [
        player.isBarbarian ? '—' : String(player.government),
        this.warTargets(player, state),
        snap.cities,
        snap.population,
        snap.units,
        snap.military,
        snap.settlers,
        snap.techs,
        this.researchName(player),
        snap.gold,
        snap.netGold > 0 ? `+${snap.netGold}` : snap.netGold,
        snap.science,
        snap.wonders,
        snap.buildings,
        snap.culture,
      ];
      cells.forEach((value, i) => {
        const td = row.insertCell();
        td.textContent = String(value);
        if (i >= 1 && typeof value === 'number') td.classList.add('admin-num');
      });
    }

    return table;
  }

  /** Build the chart controls and canvas once; updateChart() redraws them each turn. */
  private buildChartSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'admin-chart-section';

    const controls = document.createElement('div');
    controls.className = 'admin-chart-controls';
    const label = document.createElement('label');
    label.textContent = 'Progression: ';
    const select = document.createElement('select');
    for (const metric of METRICS) {
      const option = document.createElement('option');
      option.value = metric.key;
      option.textContent = metric.label;
      option.selected = metric.key === this.selectedMetric;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      this.selectedMetric = select.value as MetricKey;
      this.updateChart();
    });
    label.appendChild(select);
    controls.appendChild(label);

    const note = document.createElement('span');
    note.className = 'admin-chart-note';
    controls.appendChild(note);
    this.chartNote = note;
    section.appendChild(controls);

    const canvas = document.createElement('canvas');
    canvas.className = 'admin-chart';
    canvas.width = 860;
    canvas.height = 260;
    section.appendChild(canvas);
    this.chartCanvas = canvas;

    return section;
  }

  private updateChart(): void {
    if (this.chartNote) this.chartNote.textContent = `${this.history.length} turn(s) recorded`;
    if (this.chartCanvas && this.lastState) this.drawChart(this.chartCanvas, this.lastState);
  }

  private drawChart(canvas: HTMLCanvasElement, state: GameState): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pad = { left: 52, right: 16, top: 14, bottom: 28 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    ctx.fillStyle = '#003c3c';
    ctx.fillRect(0, 0, width, height);

    const players = state.players.filter(p => !p.isBarbarian || this.history.some(h => (h.civs[p.id]?.units ?? 0) > 0));
    const key = this.selectedMetric;

    let minVal = 0;
    let maxVal = 1;
    for (const entry of this.history) {
      for (const p of players) {
        const v = entry.civs[p.id]?.[key];
        if (v === undefined) continue;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const range = maxVal - minVal || 1;

    const firstTurn = this.history[0]?.turn ?? 0;
    const lastTurn = this.history[this.history.length - 1]?.turn ?? 0;
    const turnSpan = Math.max(1, lastTurn - firstTurn);
    const xFor = (turn: number) => pad.left + ((turn - firstTurn) / turnSpan) * plotW;
    const yFor = (value: number) => pad.top + plotH - ((value - minVal) / range) * plotH;

    // Gridlines + Y labels
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const value = minVal + (range * i) / 4;
      const y = yFor(value);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#cff';
      ctx.fillText(String(Math.round(value)), pad.left - 6, y);
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#cff';
    ctx.fillText(`T${firstTurn}`, pad.left, height - pad.bottom + 8);
    if (lastTurn !== firstTurn) ctx.fillText(`T${lastTurn}`, width - pad.right, height - pad.bottom + 8);

    // One line per civilization
    for (const player of players) {
      ctx.strokeStyle = player.color;
      ctx.fillStyle = player.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (const entry of this.history) {
        const v = entry.civs[player.id]?.[key];
        if (v === undefined) continue;
        const x = xFor(entry.turn);
        const y = yFor(v);
        if (started) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        started = true;
      }
      ctx.stroke();

      // Single recorded point would draw nothing — show a dot instead.
      if (this.history.length === 1) {
        const v = this.history[0].civs[player.id]?.[key];
        if (v !== undefined) {
          ctx.beginPath();
          ctx.arc(xFor(this.history[0].turn), yFor(v), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Legend
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = pad.left + 8;
    const ly = pad.top + 8;
    for (const player of players) {
      const name = this.civName(player);
      ctx.fillStyle = player.color;
      ctx.fillRect(lx, ly - 5, 10, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(name, lx + 14, ly);
      lx += 14 + ctx.measureText(name).width + 14;
    }
  }
}
