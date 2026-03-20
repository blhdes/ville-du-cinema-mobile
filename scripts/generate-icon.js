const opentype = require('opentype.js')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const FONT_PATH = path.join(
  __dirname,
  '../node_modules/@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'
)
const OUTPUT_PATH = path.join(__dirname, '../assets/icon.png')
const SIZE = 1024
const BG_COLOR = '#F5F0EB' // warm off-white matching the original

async function main() {
  // Load font and get the V glyph path
  const font = opentype.loadSync(FONT_PATH)
  const fontSize = 620

  // Get the V glyph path centered in a 1024x1024 canvas
  // opentype.js y-axis is flipped (0 = baseline, positive = up)
  const glyphPath = font.getPath('V', 0, 0, fontSize)
  const bbox = glyphPath.getBoundingBox()

  const glyphW = bbox.x2 - bbox.x1
  const glyphH = bbox.y2 - bbox.y1

  // The colored offsets extend to the bottom-right, so the total visual group
  // is the glyph + the maximum offset. We need to center the WHOLE group,
  // not just the black V.
  const OFFSET_R = 38 // red — furthest offset
  const OFFSET_B = 25 // blue — middle offset
  const OFFSET_Y = 13 // yellow — smallest offset

  // Total visual bounding box including offsets
  const totalW = glyphW + OFFSET_R
  const totalH = glyphH + OFFSET_R

  // Position so the visual center of (glyph + offsets) sits at canvas center
  // The black V's top-left needs to be at:
  const originX = (SIZE - totalW) / 2 - bbox.x1
  const originY = (SIZE - totalH) / 2 - bbox.y1

  // Helper: get SVG path string for V at a given offset
  function vPath(dx, dy) {
    const p = font.getPath('V', originX + dx, originY + dy, fontSize)
    return p.toSVG()
  }

  // Extract just the 'd' attribute from each path
  function pathD(dx, dy) {
    const svgStr = vPath(dx, dy)
    const match = svgStr.match(/d="([^"]+)"/)
    return match ? match[1] : ''
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG_COLOR}"/>
  <!-- Red V (furthest offset — bottom-right) -->
  <path d="${pathD(OFFSET_R, OFFSET_R)}" fill="#E63946"/>
  <!-- Blue V (middle offset) -->
  <path d="${pathD(OFFSET_B, OFFSET_B)}" fill="#2E86AB"/>
  <!-- Yellow V (smallest offset) -->
  <path d="${pathD(OFFSET_Y, OFFSET_Y)}" fill="#FFD600"/>
  <!-- Black V (foreground, no offset) -->
  <path d="${pathD(0, 0)}" fill="#1C1C1E"/>
</svg>`

  // Save intermediate SVG for reference
  const svgPath = path.join(__dirname, '../assets/icon.svg')
  fs.writeFileSync(svgPath, svg)
  console.log('SVG saved to', svgPath)

  // Convert to 1024x1024 PNG
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(OUTPUT_PATH)

  console.log('Icon saved to', OUTPUT_PATH)
}

main().catch(console.error)
