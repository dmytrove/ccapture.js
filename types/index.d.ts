declare namespace DCapture {
  interface Options {
    /** Framerate of the capture */
    framerate?: number;
    /** Verbose output in the console */
    verbose?: boolean;
    /** Display info about the capture in the DOM */
    display?: boolean;
    /** Apply motion blur */
    motionBlurFrames?: number;
    /** Encoding quality (0-100) */
    quality?: number;
    /** Format of the capture: 'webm', 'gif', 'png', 'jpg', 'webm-mediarecorder' */
    format?: string;
    /** Path to the worker files */
    workersPath?: string;
    /** Time limit of the capture in seconds */
    timeLimit?: number;
    /** Frame limit of the capture */
    frameLimit?: number;
    /** Auto save after specific time in seconds */
    autoSaveTime?: number;
    /** Progress callback function */
    onProgress?: (progress: number) => void;
  }
}

declare class DCapture {
  constructor(options?: DCapture.Options);

  /**
   * Start the capture
   */
  start(): void;

  /**
   * Add a canvas frame to the capture
   * @param canvas The canvas element to capture
   */
  capture(canvas: HTMLCanvasElement | OffscreenCanvas): void;

  /**
   * Stop the capture
   */
  stop(): void;

  /**
   * Save the capture
   */
  save(callback?: (blob: Blob) => void): void;
  
  /**
   * Dispose resources used by the capturer
   */
  dispose(): void;
}

export default DCapture; 