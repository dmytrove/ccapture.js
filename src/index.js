import DCapture from './DCapture.js';
import DCFrameEncoder from './DCFrameEncoder.js';
import DCTarEncoder from './DCTarEncoder.js';
import DCPNGEncoder from './DCPNGEncoder.js';
import DCJPEGEncoder from './DCJPEGEncoder.js';
import DCMediaRecorderEncoder from './DCMediaRecorderEncoder.js';
import DCWhammyEncoder from './DCWhammyEncoder.js';
import DCGIFEncoder from './DCGIFEncoder.js';

// Export DCapture directly to make it accessible as a constructor
export default DCapture;

// Export all components as named exports
export {
  DCFrameEncoder,
  DCTarEncoder,
  DCPNGEncoder,
  DCJPEGEncoder,
  DCMediaRecorderEncoder,
  DCWhammyEncoder,
  DCGIFEncoder,
};
