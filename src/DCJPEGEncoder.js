import DCTarEncoder from './DCTarEncoder.js';

/**
 * Encoder for creating JPEG image sequences
 */
export default class DCJPEGEncoder extends DCTarEncoder {
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
      canvas.toBlob(
        blob => {
          if (!blob) {
            console.error('Failed to create blob from canvas');
            this.emit('error', 'Failed to create blob from canvas');
            return;
          }

          super.add(blob);
        },
        this.type,
        this.quality
      );
    } catch (error) {
      console.error('Error capturing canvas as JPEG:', error);
      this.emit('error', 'Error capturing canvas as JPEG');
    }
  }
}
