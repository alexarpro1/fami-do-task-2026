const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logoPath = path.join(__dirname, '..', 'FamiDo Task  LOGO-2.png');
const outputPath = path.join(__dirname, '..', 'assets', 'responsive-intro-logo.png');

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error('Logo not found:', logoPath);
  process.exit(1);
}

// Create a responsive logo by centering the existing logo on a larger canvas
// This ensures it fits on all screen sizes without distortion
sharp(logoPath)
  .resize(512, 512, {
    fit: 'inside',
    withoutEnlargement: true
  })
  .extend({
    top: 256,
    bottom: 256,
    left: 256,
    right: 256,
    background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
  })
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('Responsive intro logo generated:', outputPath);
  })
  .catch(err => {
    console.error('Error generating logo:', err);
    process.exit(1);
  });