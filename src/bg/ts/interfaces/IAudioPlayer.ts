/**
 * Audio Player Interface
 * Defines the contract for audio playback services
 */

/**
 * Audio playback state
 */
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Audio playback event
 */
export interface AudioEvent {
  /** Current state of the player */
  state: AudioState;
  /** URL of the audio being played */
  url?: string;
  /** Error message if state is 'error' */
  error?: string;
  /** Current playback position in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
}

/**
 * Audio playback callback
 */
export type AudioEventCallback = (event: AudioEvent) => void;

/**
 * Audio playback options
 */
export interface AudioPlaybackOptions {
  /** Volume level (0.0 to 1.0) */
  volume?: number;
  /** Playback rate (0.5 to 2.0) */
  playbackRate?: number;
  /** Whether to loop the audio */
  loop?: boolean;
}

/**
 * Audio player interface
 * Single responsibility: manage audio playback
 */
export interface IAudioPlayer {
  /**
   * Play audio from a URL
   * @param url - URL of the audio file
   * @param options - Playback options
   * @returns Promise resolving when playback starts
   */
  play(url: string, options?: AudioPlaybackOptions): Promise<void>;

  /**
   * Stop the currently playing audio
   */
  stop(): void;

  /**
   * Pause the currently playing audio
   */
  pause(): void;

  /**
   * Resume paused audio
   */
  resume(): void;

  /**
   * Get the current playback state
   * @returns Current audio state
   */
  getState(): AudioState;

  /**
   * Subscribe to audio events
   * @param callback - Function to call on audio events
   * @returns Unsubscribe function
   */
  onStateChange(callback: AudioEventCallback): () => void;

  /**
   * Set the volume
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void;

  /**
   * Get the current volume
   * @returns Current volume level
   */
  getVolume(): number;

  /**
   * Check if audio is currently playing
   * @returns true if playing
   */
  isPlaying(): boolean;
}

/**
 * Type guard to check if an object implements IAudioPlayer
 */
export function isAudioPlayer(obj: unknown): obj is IAudioPlayer {
  if (!obj || typeof obj !== 'object') return false;
  const player = obj as IAudioPlayer;
  return (
    typeof player.play === 'function' &&
    typeof player.stop === 'function' &&
    typeof player.pause === 'function' &&
    typeof player.resume === 'function' &&
    typeof player.getState === 'function' &&
    typeof player.isPlaying === 'function'
  );
}
