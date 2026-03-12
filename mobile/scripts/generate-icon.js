const fs = require('fs');
const path = require('path');

// Create a simple PNG icon (1024x1024) with a health theme
// This creates a minimal valid PNG with a solid color background

function createSimplePNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);  // width
  ihdrData.writeUInt32BE(height, 4);  // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);
  
  // Create raw image data (uncompressed for simplicity - will be large but valid)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Create a gradient effect with health theme (blue to purple)
      const centerX = width / 2;
      const centerY = height / 2;
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const ratio = distFromCenter / maxDist;
      
      // Primary color: #667eea (blue) to #764ba2 (purple)
      const red = Math.round(102 + (118 - 102) * ratio);
      const green = Math.round(126 + (75 - 126) * ratio);
      const blue = Math.round(234 + (162 - 234) * ratio);
      
      // Draw a simple heart/health symbol in center
      const isCenter = distFromCenter < maxDist * 0.4;
      
      if (isCenter) {
        // White cross for health symbol
        const crossSize = width * 0.15;
        const isHorizontalBar = Math.abs(y - centerY) < crossSize && Math.abs(x - centerX) < crossSize * 2;
        const isVerticalBar = Math.abs(x - centerX) < crossSize && Math.abs(y - centerY) < crossSize * 2;
        
        if (isHorizontalBar || isVerticalBar) {
          rawData.push(255, 255, 255); // White
        } else {
          rawData.push(red, green, blue);
        }
      } else {
        rawData.push(red, green, blue);
      }
    }
  }
  
  // Compress using zlib (deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  
  // IDAT chunk
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  
  const idat = Buffer.concat([
    idatLen,
    Buffer.from('IDAT'),
    compressed,
    idatCrc
  ]);
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    iendCrc
  ]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  
  // Build CRC table
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  // Calculate CRC
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return result;
}

// Generate icons
const assetsDir = path.join(__dirname, '..', 'assets');

const icon1024 = createSimplePNG(1024, 1024, 102, 126, 234);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon1024);
console.log('✅ Created icon.png (1024x1024)');

// Create adaptive icon (foreground)
const adaptiveIcon = createSimplePNG(1024, 1024, 102, 126, 234);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
console.log('✅ Created adaptive-icon.png (1024x1024)');

// Create favicon (48x48)
const favicon = createSimplePNG(48, 48, 102, 126, 234);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
console.log('✅ Created favicon.png (48x48)');

// Create splash (1284x2778 for typical phone)
const splash = createSimplePNG(1284, 2778, 102, 126, 234);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
console.log('✅ Created splash.png (1284x2778)');

console.log('\n🎉 All icons created successfully!');
