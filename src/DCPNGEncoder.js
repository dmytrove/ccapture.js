import DCTarEncoder from './DCTarEncoder.js';

/**
 * Encoder for creating PNG image sequences
 */
export default class DCPNGEncoder extends DCTarEncoder {
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
