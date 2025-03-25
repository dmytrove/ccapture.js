import DCFrameEncoder from './DCFrameEncoder.js';

/**
 * Encoder for creating WebM videos using Whammy
 */
export default class DCWhammyEncoder extends DCFrameEncoder {
  /**
   * Creates a new WebM encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);

    this.extension = '.webm';
    this.mimeType = 'video/webm';
    this.quality = settings.quality / 100 || 0.95;

    // Check for Whammy global
    if (typeof Whammy === 'undefined') {
      console.error('Whammy is not loaded');
      throw new Error('Whammy is not loaded');
    }

    this.encoder = null;
    this.frameCount = 0;
  }

  /**
   * Starts the encoder
   */
  start() {
    try {
      const options = {
        quality: this.quality,
        framerate: this.settings.framerate || 60,
      };

      this.encoder = new Whammy.Video(options.framerate, options.quality);
      this.frameCount = 0;
    } catch (error) {
      console.error('Error starting WebM encoder:', error);
      this.emit('error', 'Error starting WebM encoder');
    }
  }

  /**
   * Adds a canvas frame to the video
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas - The canvas to capture
   */
  add(canvas) {
    if (!this.encoder) {
      return;
    }

    try {
      this.encoder.add(canvas);
      this.frameCount++;
      this.step();
    } catch (error) {
      console.error('Error adding frame to WebM:', error);
      this.emit('error', 'Error adding frame to WebM');
    }
  }

  /**
   * Stops the encoder
   */
  stop() {
    if (!this.encoder) {
      return;
    }

    // Whammy doesn't have a stop method, we just need to call compile
  }

  /**
   * Saves the WebM video
   * @param {Function} callback - Callback receiving the blob
   */
  save(callback) {
    if (!this.encoder) {
      console.error('No encoder available');
      this.emit('error', 'No encoder available');
      return;
    }

    try {
      // Compile the video and get the output
      const output = this.encoder.compile();
      const blob = new Blob([output], { type: this.mimeType });

      if (callback) {
        callback(blob);
      }
    } catch (error) {
      console.error('Error saving WebM:', error);
      this.emit('error', 'Error saving WebM');
    }
  }

  /**
   * Disposes resources
   */
  dispose() {
    this.encoder = null;
    this.frameCount = 0;
  }
}
