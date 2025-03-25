import DCFrameEncoder from './DCFrameEncoder.js';
import { pad } from './DCFrameEncoder.js';

/**
 * Encoder for creating TAR archives of frames
 */
export default class DCTarEncoder extends DCFrameEncoder {
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

      if (
        this.settings.autoSaveTime > 0 &&
        this.frames / this.settings.framerate >= this.settings.autoSaveTime
      ) {
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
