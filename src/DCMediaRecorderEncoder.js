import DCFrameEncoder from './DCFrameEncoder.js';

/**
 * Encoder that uses the MediaRecorder API for WebM capture
 */
export default class DCMediaRecorderEncoder extends DCFrameEncoder {
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
          videoBitsPerSecond: 5000000 * this.quality,
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
        options = { mimeType: 'video/webm' };
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
      
      const blob = new Blob(this.chunks, { type: this.mimeType });
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
