import DCFrameEncoder from './DCFrameEncoder.js';

/**
 * Encoder for creating GIF animations
 */
export default class DCGIFEncoder extends DCFrameEncoder {
  /**
   * Creates a new GIF encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);

    this.extension = '.gif';
    this.mimeType = 'image/gif';
    this.quality = settings.quality / 100 || 0.8;
    this.workers = settings.workers || 4;
    this.workerPath = settings.workersPath + 'gif.worker.js';

    this.canvas = null;
    this.ctx = null;
    this.sizeSet = false;
    this.encoder = null;
    this.delay = 0;
  }

  /**
   * Starts the encoder
   */
  start() {
    try {
      // Check if gif.js is available
      if (typeof GIF === 'undefined') {
        console.error('GIF.js is not loaded');
        throw new Error('GIF.js is not loaded');
      }

      // Calculate delay based on framerate
      this.delay = 1000 / (this.settings.framerate || 60);

      // Create GIF encoder
      this.encoder = new GIF({
        workers: this.workers,
        quality: Math.round((1 - this.quality) * 100),
        workerScript: this.workerPath,
        width: 150, // Default, will be set on first frame
        height: 150, // Default, will be set on first frame
      });

      // Set up event listeners
      this.encoder.on('progress', progress => {
        this.emit('progress', progress);
      });

      this.encoder.on('finished', blob => {
        this.emit('finished', blob);
        this.savedBlob = blob;
      });

      // Create a temporary canvas for frame processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.sizeSet = false;
    } catch (error) {
      console.error('Error starting GIF encoder:', error);
      this.emit('error', 'Error starting GIF encoder');
    }
  }

  /**
   * Adds a canvas frame to the GIF
   * @param {HTMLCanvasElement|OffscreenCanvas} inputCanvas - The canvas to capture
   */
  add(inputCanvas) {
    if (!this.encoder) {
      return;
    }

    try {
      // Set size on first frame if not already set
      if (!this.sizeSet) {
        this.canvas.width = inputCanvas.width;
        this.canvas.height = inputCanvas.height;

        // Update encoder with correct dimensions
        this.encoder.setOption('width', this.canvas.width);
        this.encoder.setOption('height', this.canvas.height);

        this.sizeSet = true;
      }

      // Draw the input canvas onto our temporary canvas
      this.ctx.drawImage(inputCanvas, 0, 0);

      // Add the frame to the GIF
      this.encoder.addFrame(this.ctx, {
        copy: true,
        delay: this.delay,
      });

      this.step();
    } catch (error) {
      console.error('Error adding frame to GIF:', error);
      this.emit('error', 'Error adding frame to GIF');
    }
  }

  /**
   * Stops the encoder and renders the GIF
   */
  stop() {
    if (!this.encoder) {
      return;
    }

    try {
      this.encoder.render();
    } catch (error) {
      console.error('Error stopping GIF encoder:', error);
      this.emit('error', 'Error stopping GIF encoder');
    }
  }

  /**
   * Saves the GIF
   * @param {Function} callback - Callback receiving the blob
   */
  save(callback) {
    if (this.savedBlob) {
      callback(this.savedBlob);
    } else {
      this.encoder.on('finished', blob => {
        callback(blob);
      });
    }
  }

  /**
   * Disposes resources
   */
  dispose() {
    if (this.encoder) {
      this.encoder.abort();
    }

    this.encoder = null;
    this.canvas = null;
    this.ctx = null;
    this.savedBlob = null;
    this.sizeSet = false;
  }
}
