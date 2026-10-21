/**
 * Global switch used by the local Admin Panel's auto-play mode.
 *
 * While active, every player-facing popup (research choice, discovery,
 * government selection, diplomacy, building completion, notifications, ...)
 * is skipped and no action is taken on the player's behalf.
 */
export class PopupSuppression {
  private static active = false;

  public static setActive(active: boolean): void {
    this.active = active;
  }

  public static isActive(): boolean {
    return this.active;
  }
}
