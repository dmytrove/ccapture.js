import { setupPolyfills, guid } from './DCFrameEncoder.js';
import DCPNGEncoder from './DCPNGEncoder.js';
import DCJPEGEncoder from './DCJPEGEncoder.js';
import DCMediaRecorderEncoder from './DCMediaRecorderEncoder.js';
import DCWhammyEncoder from './DCWhammyEncoder.js';
import DCGIFEncoder from './DCGIFEncoder.js';

// Apply polyfills
setupPolyfills();

/**
 * Global timestamp for performance tracking
 */
const startTime = window.Date.now();

/**
 * DCapture - A library to capture canvas-based animations at a fixed framerate
 * Based on the original CCapture.js by Jaume Sanchez Elias
 * D stands for Dmytro's updated version
 */
class DCapture {
  /**
   * Creates a new DCapture instance
   * @param {Object} settings - Capture settings
   * @param {number} [settings.framerate=60] - Framerate for capture
   * @param {boolean} [settings.verbose=false] - Display console logs
   * @param {boolean} [settings.display=false] - Display capture stats
   * @param {number} [settings.motionBlurFrames=0] - Frames to include in motion blur
   * @param {number} [settings.quality=100] - Quality of capture
   * @param {string} [settings.format='webm'] - Format of capture (webm, webm-mediarecorder, gif, png, jpg)
   * @param {string} [settings.workersPath=''] - Path to worker scripts
   * @param {number} [settings.timeLimit=0] - Time limit for capture in seconds
   * @param {number} [settings.frameLimit=0] - Frame limit for capture
   * @param {number} [settings.autoSaveTime=0] - Auto-save after this many seconds
   * @param {Function} [settings.onProgress] - Progress callback
   */
  constructor(settings = {}) {
    // Default settings
    this.settings = Object.assign(
      {
        framerate: 60,
        verbose: false,
        display: false,
        motionBlurFrames: 0,
        quality: 100,
        format: 'webm',
        workersPath: '',
        timeLimit: 0,
        frameLimit: 0,
        autoSaveTime: 0,
        onProgress: () => {},
      },
      settings
    );

    // Initialization
    this.date = new Date();
    this.startTime = 0;
    this.deltaTime = 0;
    this.frames = 0;
    this.totalFrames = 0;
    this.frameCount = 0;

    this.paused = false;
    this.closed = false;
    this.startCallback = null;
    this.stepCallback = null;
    this.stopped = false;

    // Create appropriate encoder based on format
    this.createEncoder();

    // Create UI if needed
    if (this.settings.display) {
      this.createDisplay();
    }
  }

  /**
   * Creates the appropriate encoder based on selected format
   */
  createEncoder() {
    switch (this.settings.format) {
      case 'webm-mediarecorder':
        this.log('Using MediaRecorder encoder');
        this.encoder = new DCMediaRecorderEncoder(this.settings);
        break;

      case 'png':
        this.log('Using PNG encoder');
        this.encoder = new DCPNGEncoder(this.settings);
        break;

      case 'jpg':
      case 'jpeg':
        this.log('Using JPEG encoder');
        this.encoder = new DCJPEGEncoder(this.settings);
        break;

      case 'gif':
        this.log('Using GIF encoder');
        this.encoder = new DCGIFEncoder(this.settings);
        break;

      case 'webm':
      default:
        this.log('Using WebM encoder');
        this.encoder = new DCWhammyEncoder(this.settings);
        break;
    }

    // Listen for encoder events
    this.attachEncoderEvents();
  }

  /**
   * Sets up event listeners for the encoder
   */
  attachEncoderEvents() {
    this.encoder.on('progress', progress => {
      if (this.settings.onProgress) {
        this.settings.onProgress(progress);
      }

      if (this.display) {
        this.updateProgress(progress);
      }
    });

    this.encoder.on('error', error => {
      console.error('Encoder error:', error);
    });
  }

  /**
   * Creates capture progress display
   */
  createDisplay() {
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.left = '20px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.color = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '4px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.zIndex = '999999';

    // Create header
    const header = document.createElement('h1');
    header.textContent = 'DCapture';
    header.style.margin = '0 0 5px 0';
    header.style.fontSize = '16px';
    container.appendChild(header);

    // Create info display
    const info = document.createElement('div');
    info.textContent = 'Awaiting capture...';
    container.appendChild(info);

    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '15px';
    progressContainer.style.backgroundColor = '#444';
    progressContainer.style.marginTop = '5px';
    progressContainer.style.borderRadius = '3px';
    progressContainer.style.overflow = 'hidden';
    container.appendChild(progressContainer);

    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#2693e6';
    progressContainer.appendChild(progressBar);

    // Save references
    this.display = container;
    this.displayInfo = info;
    this.displayProgressBar = progressBar;

    // Add to document when capture starts
    document.body.appendChild(container);
  }

  /**
   * Updates the display with current status
   */
  updateDisplayInfo() {
    if (!this.displayInfo) return;

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.displayInfo.textContent =
      `Format: ${this.settings.format} | ` + `Frames: ${this.frames} | ` + `Duration: ${duration}s`;
  }

  /**
   * Updates the progress bar
   * @param {number} progress - Progress value (0-1)
   */
  updateProgress(progress) {
    if (!this.displayProgressBar) return;
    this.displayProgressBar.style.width = `${progress * 100}%`;
  }

  /**
   * Logs a message if verbose is enabled
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.settings.verbose) {
      console.log(`DCapture: ${message}`);
    }
  }

  /**
   * Starts the capture process
   * @param {Function} [callback] - Callback to execute after starting
   */
  start(callback) {
    this.startTime = Date.now();
    this.frames = 0;
    this.startCallback = callback;

    this.encoder.start();
    this.log('Started recording');

    if (typeof callback === 'function') {
      callback();
    }
  }

  /**
   * Stops the capture process
   * @param {Function} [callback] - Callback to execute after stopping
   */
  stop() {
    this.stopped = true;

    return Promise.resolve()
      .then(() => {
        if (typeof this.encoder.stop === 'function') {
          const result = this.encoder.stop();
          if (result instanceof Promise) {
            return result;
          }
        }
      })
      .then(() => {
        this.log('Stopped recording');
        if (this.display) {
          this.display.style.backgroundColor = 'rgba(45, 145, 45, 0.5)';
        }
      });
  }

  /**
   * Captures a frame from the canvas
   * @param {HTMLCanvasElement} canvas - Canvas element to capture
   */
  capture(canvas) {
    if (this.stopped) return;

    if (!this.encoder) {
      throw new Error('No encoder available');
    }

    // Handle motion blur
    if (this.settings.motionBlurFrames > 1) {
      this.captureMotionBlur(canvas);
    } else {
      this.frames++;
      this.encoder.add(canvas);

      if (this.settings.display) {
        this.updateDisplayInfo();
      }

      // Check for time limit
      if (this.settings.timeLimit > 0) {
        const duration = (Date.now() - this.startTime) / 1000;
        if (duration >= this.settings.timeLimit) {
          this.stop().then(() => this.save());
        }
      }

      // Check for frame limit
      if (this.settings.frameLimit > 0) {
        if (this.frames >= this.settings.frameLimit) {
          this.stop().then(() => this.save());
        }
      }
    }
  }

  /**
   * Captures a frame with motion blur
   * @param {HTMLCanvasElement} canvas - Canvas element to capture
   * @private
   */
  captureMotionBlur(canvas) {
    // Implementation for motion blur
    // Not implemented in this example
    this.frames++;
    this.encoder.add(canvas);
  }

  /**
   * Saves the captured video/animation
   * @param {Function} [callback] - Callback to execute with the blob
   */
  save(callback) {
    if (!this.encoder) {
      throw new Error('No encoder available');
    }

    this.encoder.save(callback);
    this.log('Saving...');
  }

  /**
   * Dispose all resources
   */
  dispose() {
    if (this.display && this.display.parentNode) {
      this.display.parentNode.removeChild(this.display);
    }

    if (this.encoder && typeof this.encoder.dispose === 'function') {
      this.encoder.dispose();
    }

    this.encoder = null;
    this.display = null;
    this.displayInfo = null;
    this.displayProgressBar = null;
  }
}

// Export
export default DCapture;
