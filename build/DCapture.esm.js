/*!
 * DCapture.js v1.1.0
 * A library to capture canvas-based animations at a fixed framerate
 * Based on CCapture.js (https://github.com/spite/ccapture.js)
 * 
 * Copyright (c) 2012-2025, Jaume Sanchez Elias
 * Licensed under the MIT license
 */
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
function pad(n) {
  let width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 6;
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

/**
 * Sets up polyfills for older browsers
 */
function setupPolyfills() {
  // Add requestAnimationFrame polyfill
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
  }
}

/**
 * Encoder for creating TAR archives of frames
 */
class DCTarEncoder extends DCFrameEncoder {
  /**
   * Creates a new TAR encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);
    this.extension = '.tar';
    this.mimeType = 'application/x-tar';
    this.fileExtension = '';
    this.baseFilename = this.filename;
    this.tape = null;
    this.count = 0;
    this.part = 1;
    this.frames = 0;
  }

  /**
   * Starts the encoder
   */
  start() {
    this.dispose();
  }

  /**
   * Adds a blob to the archive
   * @param {Blob} blob - The blob to add
   */
  add(blob) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      this.tape.append(pad(this.count) + this.fileExtension, new Uint8Array(fileReader.result));
      if (this.settings.autoSaveTime > 0 && this.frames / this.settings.framerate >= this.settings.autoSaveTime) {
        this.save(blob => {
          this.filename = this.baseFilename + '-part-' + pad(this.part);

          // Check if download function is available
          if (typeof download === 'function') {
            download(blob, this.filename + this.extension, this.mimeType);
          } else {
            console.warn('Download function not available');
            this.emit('error', 'Download function not available');
          }
          const count = this.count;
          this.dispose();
          this.count = count + 1;
          this.part++;
          this.filename = this.baseFilename + '-part-' + pad(this.part);
          this.frames = 0;
          this.step();
        });
      } else {
        this.count++;
        this.frames++;
        this.step();
      }
    };
    fileReader.onerror = error => {
      console.error('Error reading blob:', error);
      this.emit('error', 'Error reading blob');
    };
    fileReader.readAsArrayBuffer(blob);
  }

  /**
   * Saves the TAR archive
   * @param {Function} callback - Callback receiving the blob
   */
  save(callback) {
    if (!this.tape) {
      console.error('No tape available for saving');
      this.emit('error', 'No tape available for saving');
      return;
    }
    callback(this.tape.save());
  }

  /**
   * Disposes resources
   */
  dispose() {
    try {
      // We need to dynamically import Tar since it might be a global
      // or imported separately
      this.tape = new Tar();
      this.count = 0;
    } catch (e) {
      console.error('Could not create Tar instance:', e);
      this.emit('error', 'Could not create Tar instance');
    }
  }
}

/**
 * Encoder for creating PNG image sequences
 */
class DCPNGEncoder extends DCTarEncoder {
  /**
   * Creates a new PNG encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);
    this.type = 'image/png';
    this.fileExtension = '.png';
  }

  /**
   * Adds a canvas frame to the sequence
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas - The canvas to capture
   */
  add(canvas) {
    try {
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          this.emit('error', 'Failed to create blob from canvas');
          return;
        }
        super.add(blob);
      }, this.type);
    } catch (error) {
      console.error('Error capturing canvas as PNG:', error);
      this.emit('error', 'Error capturing canvas as PNG');
    }
  }
}

/**
 * Encoder for creating JPEG image sequences
 */
class DCJPEGEncoder extends DCTarEncoder {
  /**
   * Creates a new JPEG encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);
    this.type = 'image/jpeg';
    this.fileExtension = '.jpg';
    this.quality = settings.quality ? settings.quality / 100 : 0.95;
  }

  /**
   * Adds a canvas frame to the sequence
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas - The canvas to capture
   */
  add(canvas) {
    try {
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          this.emit('error', 'Failed to create blob from canvas');
          return;
        }
        super.add(blob);
      }, this.type, this.quality);
    } catch (error) {
      console.error('Error capturing canvas as JPEG:', error);
      this.emit('error', 'Error capturing canvas as JPEG');
    }
  }
}

/**
 * Encoder that uses the MediaRecorder API for WebM capture
 */
class DCMediaRecorderEncoder extends DCFrameEncoder {
  /**
   * Creates a new MediaRecorder encoder
   * @param {Object} settings - Encoder settings
   */
  constructor(settings) {
    super(settings);
    this.extension = '.webm';
    this.mimeType = 'video/webm';
    this.quality = settings.quality || 0.95;
    this.framerate = settings.framerate || 60;

    // Check for MediaRecorder support
    this.supported = typeof MediaRecorder !== 'undefined';
    if (!this.supported) {
      console.error('MediaRecorder API not supported in this browser');
    }
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.canvas = null;
    this.context = null;
    this.firstFrame = true;
  }

  /**
   * Starts the encoder
   */
  start() {
    if (!this.supported) {
      this.emit('error', 'MediaRecorder not supported');
      return;
    }
    try {
      // Setup the canvas that will be recorded
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');

      // Create a media stream from the canvas
      this.stream = this.canvas.captureStream(this.framerate);

      // Setup the recorder with proper options
      let options = {};
      try {
        options = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 5000000 * this.quality
        };

        // Test if this format is supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn('vp9 is not supported, trying vp8');
          options.mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn('vp8 is not supported, trying default');
          options.mimeType = 'video/webm';
        }
      } catch (e) {
        console.warn('Error checking codecs, using defaults', e);
        options = {
          mimeType: 'video/webm'
        };
      }
      this.recorder = new MediaRecorder(this.stream, options);
      this.chunks = [];

      // Set up data handling
      this.recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      // Start recording with 100ms timeslices to ensure data is available
      this.recorder.start(100);
      this.emit('start');
    } catch (error) {
      console.error('Error starting MediaRecorder:', error);
      this.emit('error', 'Error starting MediaRecorder');
    }
  }

  /**
   * Adds a canvas frame to the recording
   * @param {HTMLCanvasElement|OffscreenCanvas} inputCanvas - The canvas to capture
   */
  add(inputCanvas) {
    if (!this.supported || !this.recorder) {
      return;
    }
    try {
      // If this is the first frame, set up the recording canvas with the right size
      if (this.firstFrame) {
        this.canvas.width = inputCanvas.width;
        this.canvas.height = inputCanvas.height;
        this.firstFrame = false;
      }

      // Draw the input canvas onto our recording canvas
      this.context.drawImage(inputCanvas, 0, 0);

      // Request animation frame to ensure smooth capture
      this.step();
    } catch (error) {
      console.error('Error adding frame:', error);
      this.emit('error', 'Error adding frame');
    }
  }

  /**
   * Stops the recorder
   */
  stop() {
    if (!this.supported || !this.recorder) {
      return;
    }
    return new Promise(resolve => {
      this.recorder.onstop = () => {
        // Force a final dataavailable event
        this.recorder.requestData();
        this.emit('stop');
        resolve();
      };
      this.recorder.stop();
    });
  }

  /**
   * Saves the recording as a WebM file
   * @param {Function} callback - Callback receiving the blob
   */
  save(callback) {
    if (!this.supported || !this.recorder) {
      this.emit('error', 'No recording available');
      return;
    }
    try {
      if (this.chunks.length === 0) {
        console.error('No data chunks available');
        this.emit('error', 'No data recorded');
        return;
      }
      const blob = new Blob(this.chunks, {
        type: this.mimeType
      });
      console.log(`Saving blob with ${this.chunks.length} chunks, size: ${blob.size} bytes`);
      callback(blob);
    } catch (error) {
      console.error('Error saving recording:', error);
      this.emit('error', 'Error saving recording');
    }
  }

  /**
   * Disposes resources
   */
  dispose() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.canvas = null;
    this.context = null;
    this.firstFrame = true;
  }
}

/**
 * Encoder for creating WebM videos using Whammy
 */
class DCWhammyEncoder extends DCFrameEncoder {
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
        framerate: this.settings.framerate || 60
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
      const blob = new Blob([output], {
        type: this.mimeType
      });
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

/**
 * Encoder for creating GIF animations
 */
class DCGIFEncoder extends DCFrameEncoder {
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
        width: 150,
        // Default, will be set on first frame
        height: 150 // Default, will be set on first frame
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
        delay: this.delay
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

// Apply polyfills
setupPolyfills();

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
  constructor() {
    let settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // Default settings
    this.settings = Object.assign({
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
      onProgress: () => {}
    }, settings);

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
    this.displayInfo.textContent = `Format: ${this.settings.format} | ` + `Frames: ${this.frames} | ` + `Duration: ${duration}s`;
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
    return Promise.resolve().then(() => {
      if (typeof this.encoder.stop === 'function') {
        const result = this.encoder.stop();
        if (result instanceof Promise) {
          return result;
        }
      }
    }).then(() => {
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

export { DCFrameEncoder, DCGIFEncoder, DCJPEGEncoder, DCMediaRecorderEncoder, DCPNGEncoder, DCTarEncoder, DCWhammyEncoder, DCapture as default };
