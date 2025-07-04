import { SettingsManager } from './SettingsManager';

/**
 * Mini MP3 Player for the CivWin game
 * Handles background music playback with shuffle functionality
 */
export class MusicPlayer {
  private audio: HTMLAudioElement;
  private currentTrackIndex: number = 0;
  private isShuffleEnabled: boolean = false;
  private isPlaying: boolean = false;
  private tracks: string[] = [];
  private shuffledIndices: number[] = [];
  private shufflePosition: number = 0;

  // UI Elements
  private playPauseBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private shuffleBtn!: HTMLButtonElement;
  private volumeIcon!: HTMLSpanElement;
  private volumeSlider!: HTMLInputElement;
  private volumeDropdown!: HTMLElement;
  private volumeValue!: HTMLSpanElement;
  private currentTrackSpan!: HTMLSpanElement;
  private progressBar!: HTMLElement;
  private progressFill!: HTMLElement;
  private timeDisplay!: HTMLSpanElement;

  constructor() {
    this.audio = new Audio();
    this.initializeTracks();
    this.initializeUI();
    this.restoreSettings();
    this.setupEventListeners();
    this.loadCurrentTrack();
  }

  /**
   * Initialize the track list
   */
  private initializeTracks(): void {
    this.tracks = [
      '/src/audio/music/civwinweb-harvest-of-the-tiles.mp3',
      '/src/audio/music/civwinweb-mchammers-code.mp3',
      '/src/audio/music/civwinweb-hambonis-code.mp3',
      '/src/audio/music/civwinweb-the-shone-path.mp3',
      '/src/audio/music/civwinweb-hummer-obi-nodes.mp3',
      '/src/audio/music/civwinweb-conquest-of-the-nile.mp3',
      '/src/audio/music/civwinweb-hammer-abi-toads.mp3',
      '/src/audio/music/civwinweb-Technochtitlan Revealed.mp3',
      '/src/audio/music/civwinweb-Tenochtitlan Crumbles.mp3',
      '/src/audio/music/civwinweb-Tenochtitlan Empire.mp3',
      '/src/audio/music/civwinweb-Tenochtitlan Hidden.mp3',
      '/src/audio/music/civwinweb-aristotles iris.mp3',
      '/src/audio/music/civwinweb-artistotles dilemma.mp3'
    ];
    
    // Randomly shuffle the tracks array every time
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    
    this.generateShuffledIndices();
  }

  /**
   * Initialize UI element references
   */
  private initializeUI(): void {
    this.playPauseBtn = document.querySelector('#play-pause')!;
    this.prevBtn = document.querySelector('#prev-track')!;
    this.nextBtn = document.querySelector('#next-track')!;
    this.shuffleBtn = document.querySelector('#shuffle-toggle')!;
    this.volumeIcon = document.querySelector('#volume-icon')!;
    this.volumeSlider = document.querySelector('#volume-slider')!;
    this.volumeDropdown = document.querySelector('#volume-dropdown')!;
    this.volumeValue = document.querySelector('#volume-value')!;
    this.currentTrackSpan = document.querySelector('#current-track')!;
    this.progressBar = document.querySelector('#progress-bar')!;
    this.progressFill = document.querySelector('#progress-fill')!;
    this.timeDisplay = document.querySelector('#time-display')!;
  }

  /**
   * Setup event listeners for player controls and audio events
   */
  private setupEventListeners(): void {
    // Control button listeners
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.prevBtn.addEventListener('click', () => this.previousTrack());
    this.nextBtn.addEventListener('click', () => this.nextTrack());
    this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());

    // Volume control listeners
    this.volumeSlider.addEventListener('input', () => this.updateVolume());
    this.volumeIcon.addEventListener('click', () => this.toggleVolumeDropdown());
    this.volumeIcon.addEventListener('mouseenter', () => this.showVolumeDropdown());
    this.volumeIcon.addEventListener('mouseleave', () => this.hideVolumeDropdown());
    this.volumeDropdown.addEventListener('mouseenter', () => this.showVolumeDropdown());
    this.volumeDropdown.addEventListener('mouseleave', () => this.hideVolumeDropdown());

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.volumeIcon.contains(e.target as Node) && !this.volumeDropdown.contains(e.target as Node)) {
        this.hideVolumeDropdown();
      }
    });

    // Progress bar interaction
    this.progressBar.addEventListener('click', (e) => this.seekToPosition(e));

    // Audio event listeners
    this.audio.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.nextTrack());
    this.audio.addEventListener('error', (e) => this.handleAudioError(e));
    this.audio.addEventListener('canplay', () => this.handleCanPlay());
    
    // Load volume from settings and apply it
    this.loadVolumeFromSettings();
  }

  /**
   * Generate shuffled indices for shuffle mode
   */
  private generateShuffledIndices(): void {
    this.shuffledIndices = [...Array(this.tracks.length).keys()];
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    this.shufflePosition = 0;
  }

  /**
   * Get the current track index (considering shuffle mode)
   */
  private getCurrentTrackIndex(): number {
    return this.isShuffleEnabled ? this.shuffledIndices[this.shufflePosition] : this.currentTrackIndex;
  }

  /**
   * Load the current track
   */
  private loadCurrentTrack(): void {
    const trackIndex = this.getCurrentTrackIndex();
    const trackPath = this.tracks[trackIndex];
    
    this.audio.src = trackPath;
    this.updateTrackDisplay(trackPath);
    
    console.log(`Loading track: ${trackPath}`);
  }

  /**
   * Update the track name display
   */
  private updateTrackDisplay(trackPath: string): void {
    const fileName = trackPath.split('/').pop()?.replace('.mp3', '') || 'Unknown Track';
    const displayName = fileName
      .replace(/civwinweb-/g, '')   // Remove civwinweb prefix
      .replace(/-/g, ' ')           // Replace dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase());  // Capitalize first letter of each word
    
    this.currentTrackSpan.textContent = displayName;
  }

  /**
   * Toggle play/pause
   */
  public togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Play the current track
   */
  public play(): void {
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.playPauseBtn.textContent = '⏸';
      this.playPauseBtn.title = 'Pause';
      this.saveSettings();
    }).catch(error => {
      console.error('Error playing audio:', error);
    });
  }

  /**
   * Pause the current track
   */
  public pause(): void {
    this.audio.pause();
    this.isPlaying = false;
    this.playPauseBtn.textContent = '▶';
    this.playPauseBtn.title = 'Play';
    this.saveSettings();
  }

  /**
   * Go to the next track
   */
  public nextTrack(): void {
    if (this.isShuffleEnabled) {
      this.shufflePosition = (this.shufflePosition + 1) % this.shuffledIndices.length;
      if (this.shufflePosition === 0) {
        this.generateShuffledIndices(); // Re-shuffle when we complete a cycle
      }
    } else {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    }
    
    this.loadCurrentTrack();
    if (this.isPlaying) {
      this.play();
    }
  }

  /**
   * Go to the previous track
   */
  public previousTrack(): void {
    if (this.isShuffleEnabled) {
      this.shufflePosition = this.shufflePosition === 0 ? this.shuffledIndices.length - 1 : this.shufflePosition - 1;
    } else {
      this.currentTrackIndex = this.currentTrackIndex === 0 ? this.tracks.length - 1 : this.currentTrackIndex - 1;
    }
    
    this.loadCurrentTrack();
    if (this.isPlaying) {
      this.play();
    }
  }

  /**
   * Toggle shuffle mode
   */
  public toggleShuffle(): void {
    this.isShuffleEnabled = !this.isShuffleEnabled;
    
    if (this.isShuffleEnabled) {
      this.shuffleBtn.classList.add('active');
      this.shuffleBtn.title = 'Shuffle: ON';
      this.generateShuffledIndices();
      // Find current track in shuffled indices
      const currentTrack = this.getCurrentTrackIndex();
      this.shufflePosition = this.shuffledIndices.indexOf(this.currentTrackIndex);
    } else {
      this.shuffleBtn.classList.remove('active');
      this.shuffleBtn.title = 'Shuffle: OFF';
      // Set current track index to the actual track that's playing
      this.currentTrackIndex = this.getCurrentTrackIndex();
    }
    
    this.saveSettings();
    console.log(`Shuffle ${this.isShuffleEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Seek to a specific position in the track
   */
  private seekToPosition(event: MouseEvent): void {
    const rect = this.progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * this.audio.duration;
    
    if (!isNaN(newTime)) {
      this.audio.currentTime = newTime;
    }
  }

  /**
   * Update the progress bar
   */
  private updateProgress(): void {
    if (this.audio.duration) {
      const percentage = (this.audio.currentTime / this.audio.duration) * 100;
      this.progressFill.style.width = `${percentage}%`;
      this.updateTimeDisplay();
    }
  }

  /**
   * Update the time display
   */
  private updateTimeDisplay(): void {
    const currentTime = this.formatTime(this.audio.currentTime || 0);
    const duration = this.formatTime(this.audio.duration || 0);
    this.timeDisplay.textContent = `${currentTime} / ${duration}`;
  }

  /**
   * Format time in MM:SS format
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Handle audio loading errors
   */
  private handleAudioError(event: Event): void {
    console.error('Audio error:', event);
    this.currentTrackSpan.textContent = 'Error loading track';
    this.isPlaying = false;
    this.playPauseBtn.textContent = '▶';
  }

  /**
   * Handle when audio can start playing
   */
  private handleCanPlay(): void {
    this.updateTimeDisplay();
  }

  /**
   * Restore settings from localStorage
   */
  private restoreSettings(): void {
    // Restore volume setting
    const savedVolume = localStorage.getItem('civwin-music-volume');
    if (savedVolume !== null) {
      const volume = parseInt(savedVolume);
      if (volume >= 0 && volume <= 100) {
        this.volumeSlider.value = volume.toString();
        this.audio.volume = volume / 100;
        this.volumeValue.textContent = `${volume}%`;
      }
    }

    // Restore shuffle setting
    const savedShuffle = localStorage.getItem('civwin-music-shuffle');
    if (savedShuffle === 'true') {
      this.isShuffleEnabled = true;
      this.shuffleBtn.classList.add('active');
      this.shuffleBtn.title = 'Shuffle: ON';
    }

    // Update volume icon to match restored volume
    this.updateVolumeIcon();
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    // Save volume setting
    localStorage.setItem('civwin-music-volume', this.volumeSlider.value);
    
    // Save shuffle setting
    localStorage.setItem('civwin-music-shuffle', this.isShuffleEnabled.toString());
    
    // Save play state (for next session auto-resume)
    localStorage.setItem('civwin-music-playing', this.isPlaying.toString());
  }

  /**
   * Check if music should auto-resume based on previous session
   */
  private shouldAutoResume(): boolean {
    const savedPlayState = localStorage.getItem('civwin-music-playing');
    return savedPlayState === 'true';
  }

  /**
   * Load volume from settings and apply it
   */
  private loadVolumeFromSettings(): void {
    const settingsManager = SettingsManager.getInstance();
    const musicVolume = settingsManager.getSetting('musicVolume');
    
    // Set the slider value
    this.volumeSlider.value = musicVolume.toString();
    
    // Apply the volume to the audio element
    this.audio.volume = musicVolume / 100;
    
    // Update the volume display
    this.volumeValue.textContent = `${musicVolume}%`;
    
    // Update the icon
    this.updateVolumeIcon();
  }

  /**
   * Sync the current volume setting with the settings manager
   */
  public syncVolumeWithSettings(): void {
    const settingsManager = SettingsManager.getInstance();
    const musicVolume = settingsManager.getSetting('musicVolume');
    
    // Only update if different from current volume
    const currentVolume = Math.round(this.audio.volume * 100);
    if (currentVolume !== musicVolume) {
      this.volumeSlider.value = musicVolume.toString();
      this.audio.volume = musicVolume / 100;
      this.volumeValue.textContent = `${musicVolume}%`;
      this.updateVolumeIcon();
    }
  }

  /**
   * Update volume based on slider value
   */
  private updateVolume(): void {
    const volume = parseInt(this.volumeSlider.value) / 100;
    this.audio.volume = volume;
    this.volumeValue.textContent = `${this.volumeSlider.value}%`;
    this.updateVolumeIcon();
    
    // Save the volume to settings
    const settingsManager = SettingsManager.getInstance();
    settingsManager.updateSettings({ musicVolume: parseInt(this.volumeSlider.value) });
    
    // Notify main app to sync settings modal if open
    this.notifyVolumeChange();
  }

  /**
   * Notify about volume change (for settings modal sync)
   */
  private notifyVolumeChange(): void {
    // Dispatch a custom event that the main app can listen to
    const event = new CustomEvent('musicVolumeChanged', {
      detail: { volume: parseInt(this.volumeSlider.value) }
    });
    document.dispatchEvent(event);
  }

  /**
   * Update the music player UI to match a given volume without saving to settings
   */
  public updateVolumeUI(volume: number): void {
    // Update the slider value
    this.volumeSlider.value = volume.toString();
    
    // Update the audio volume
    this.audio.volume = volume / 100;
    
    // Update the volume display
    this.volumeValue.textContent = `${volume}%`;
    
    // Update the icon
    this.updateVolumeIcon();
  }

  /**
   * Update the volume icon based on current volume level
   */
  private updateVolumeIcon(): void {
    const volume = this.audio.volume;
    
    if (volume === 0) {
      this.volumeIcon.textContent = '🔇';
      this.volumeIcon.title = 'Unmute';
    } else if (volume < 0.3) {
      this.volumeIcon.textContent = '🔈';
      this.volumeIcon.title = 'Low Volume';
    } else if (volume < 0.8) {
      this.volumeIcon.textContent = '🔉';
      this.volumeIcon.title = 'Medium Volume';
    } else {
      this.volumeIcon.textContent = '🔊';
      this.volumeIcon.title = 'High Volume';
    }
  }

  /**
   * Toggle mute on/off
   */
  private toggleMute(): void {
    if (this.audio.volume > 0) {
      // Store current volume and mute
      this.volumeSlider.dataset.previousVolume = this.volumeSlider.value;
      this.audio.volume = 0;
      this.volumeSlider.value = '0';
      this.volumeValue.textContent = '0%';
    } else {
      // Restore previous volume or set to 50% if no previous volume
      const previousVolume = this.volumeSlider.dataset.previousVolume || '50';
      this.volumeSlider.value = previousVolume;
      this.audio.volume = parseInt(previousVolume) / 100;
      this.volumeValue.textContent = `${previousVolume}%`;
    }
    this.updateVolumeIcon();
  }

  /**
   * Show the volume dropdown
   */
  private showVolumeDropdown(): void {
    this.volumeDropdown.classList.add('show');
  }

  /**
   * Hide the volume dropdown
   */
  private hideVolumeDropdown(): void {
    this.volumeDropdown.classList.remove('show');
  }

  /**
   * Toggle the volume dropdown visibility
   */
  private toggleVolumeDropdown(): void {
    this.volumeDropdown.classList.toggle('show');
  }

  /**
   * Get the current volume (0-1)
   */
  public getVolume(): number {
    return this.audio.volume;
  }

  /**
   * Set the volume (0-1)
   */
  public setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Check if currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Auto-start playing the first track (respects previous session state)
   */
  public autoStart(): void {
    setTimeout(() => {
      if (this.shouldAutoResume()) {
        this.play();
      }
    }, 1000); // Delay to ensure everything is loaded
  }
}
