/**
 * Base class for all encoders
 *
 * Provides common functionality like polyfills and event handling
 */
class DCFrameEncoder {
  constructor(settings) {
    this.settings = settings;
    this.state = 'idle';
    this.eventListeners = {};
  }

  /**
   * Adds an event listener for the specified event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Emits an event with optional data
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Starts the encoder
   */
  start() {
    this.state = 'recording';
  }

  /**
   * Stops the encoder
   */
  stop() {
    this.state = 'finished';
  }

  /**
   * Adds a frame to the encoder
   * @param {HTMLCanvasElement} canvas - Canvas element to capture
   */
  add(canvas) {
    // To be implemented by subclasses
  }

  /**
   * Saves the recorded data
   * @param {Function} [callback] - Callback to receive the blob
   */
  save(callback) {
    // To be implemented by subclasses
  }

  /**
   * Updates progress and emits step event
   */
  step() {
    this.emit('step');
  }

  /**
   * Disposes resources used by the encoder
   */
  dispose() {
    this.eventListeners = {};
  }
}

/**
 * Pads a number with leading zeros
 * @param {number} n - Number to pad
 * @param {number} [width=6] - Width of the resulting string
 * @returns {string} Padded number as string
 */
export function pad(n, width = 6) {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

/**
 * Sets up polyfills for older browsers
 */
export function setupPolyfills() {
  // Add requestAnimationFrame polyfill
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame =
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  }
}

/**
 * Generates a UUID v4
 * @returns {string} A random UUID
 */
export function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export default DCFrameEncoder;
