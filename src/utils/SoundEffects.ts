/**
 * Simple sound effects utility for game events
 */
export class SoundEffects {
  /**
   * Play a sound effect
   * @param soundPath Path to the sound file
   * @param volume Volume level (0-1), defaults to 0.5
   */
  public static playSound(soundPath: string, volume: number = 0.5): void {
    try {
      const audio = new Audio(soundPath);
      audio.volume = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1
      audio.play().catch(error => {
        console.warn('Failed to play sound:', soundPath, error);
      });
    } catch (error) {
      console.warn('Failed to create audio for:', soundPath, error);
    }
  }

  /**
   * Play the city building sound effect
   */
  public static playCityFoundingSound(): void {
    this.playSound('/src/audio/BLDCITY.WAV', 0.6);
  }

  /**
   * Play negative feedback sound (invalid action)
   */
  public static playInvalidActionSound(): void {
    this.playSound('/src/audio/NEG1.WAV', 0.4);
  }

  /**
   * Play a unit movement sound (placeholder for future expansion)
   */
  public static playUnitMoveSound(): void {
    // TODO: Add unit movement sound when available
  }

  /**
   * Play a combat sound (placeholder for future expansion) 
   */
  public static playCombatSound(): void {
    // TODO: Add combat sound when available
  }
}
