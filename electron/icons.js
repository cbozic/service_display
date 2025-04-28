const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// This script is a simple helper for generating icons for different platforms
// For a production app, you would want to use a proper icon generator package or tool

console.log('Note: This script requires ImageMagick to be installed');
console.log('For a production app, consider using electron-icon-maker or similar tools');

// Paths
const sourceIcon = path.join(__dirname, '../public/logo512.png');
const iconsDir = path.join(__dirname, '../build-resources');

// Ensure the icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for different platforms
const iconSizes = [16, 32, 64, 128, 256, 512];

try {
  // Check if ImageMagick is installed
  execSync('which convert', { stdio: 'ignore' });
  
  console.log('Generating icons from:', sourceIcon);
  
  // Generate Windows ICO
  const icoFile = path.join(iconsDir, 'icon.ico');
  const icoSizes = iconSizes.map(size => `${size}x${size}`).join(',');
  execSync(`convert "${sourceIcon}" -define icon:auto-resize=${icoSizes} "${icoFile}"`);
  console.log('Windows icon created:', icoFile);
  
  // Generate macOS ICNS
  // This is a simplified version - for production use a dedicated tool
  const icnsDir = path.join(iconsDir, 'icon.iconset');
  if (!fs.existsSync(icnsDir)) {
    fs.mkdirSync(icnsDir, { recursive: true });
  }
  
  iconSizes.forEach(size => {
    const outFile = path.join(icnsDir, `icon_${size}x${size}.png`);
    execSync(`convert "${sourceIcon}" -resize ${size}x${size} "${outFile}"`);
    
    // Create 2x versions for retina displays
    if (size <= 256) {
      const outFile2x = path.join(icnsDir, `icon_${size}x${size}@2x.png`);
      execSync(`convert "${sourceIcon}" -resize ${size*2}x${size*2} "${outFile2x}"`);
    }
  });
  
  // On macOS, use iconutil to create the icns file
  if (process.platform === 'darwin') {
    execSync(`iconutil -c icns "${icnsDir}" -o "${path.join(iconsDir, 'icon.icns')}"`);
    console.log('macOS icon created:', path.join(iconsDir, 'icon.icns'));
  }
  
  // For Linux, we just need PNGs which we already generated
  console.log('Linux icons created in:', icnsDir);
  
  console.log('Icon generation complete!');
} catch (error) {
  console.error('Error generating icons:', error.message);
  console.log('Make sure ImageMagick is installed or use a dedicated icon generation tool');
} 