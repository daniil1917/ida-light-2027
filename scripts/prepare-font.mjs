import fs from 'node:fs/promises';
import opentype from 'opentype.js';
const data = await fs.readFile('assets/sources/fonts/euclid/EuclidCircularA-Medium.otf');
const font = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
const scale = 1000 / font.unitsPerEm;
const number = value => Math.round(value * scale * 100) / 100;
const glyphs = {};
// CFF outlines in this OTF use the opposite winding to Three.FontLoader.
// Reverse each contour, preserving both cubic controls and closed edges.
function reverseContours(commands) {
  const result = [];
  let start, current, segments = [];
  const flush = () => {
    if (!start) return;
    if (current.x !== start.x || current.y !== start.y) segments.push({ type: 'L', x: start.x, y: start.y, from: current });
    result.push({ type: 'M', x: start.x, y: start.y });
    for (const segment of segments.reverse()) result.push({ ...segment, x: segment.from.x, y: segment.from.y,
      ...(segment.type === 'C' ? { x1: segment.x2, y1: segment.y2, x2: segment.x1, y2: segment.y1 } : {}) });
    result.push({ type: 'Z' });
    start = null; segments = [];
  };
  for (const command of commands) {
    if (command.type === 'M') { flush(); start = current = { x: command.x, y: command.y }; }
    else if (command.type === 'Z') flush();
    else { segments.push({ ...command, from: current }); current = { x: command.x, y: command.y }; }
  }
  flush();
  return result;
}
for (const character of '207') {
  const glyph = font.charToGlyph(character);
  const outline = reverseContours(glyph.path.commands).map(command => {
    if (command.type === 'M' || command.type === 'L') return `${command.type.toLowerCase()} ${number(command.x)} ${number(command.y)}`;
    if (command.type === 'Q') return `q ${number(command.x)} ${number(command.y)} ${number(command.x1)} ${number(command.y1)}`;
    if (command.type === 'C') return `b ${number(command.x)} ${number(command.y)} ${number(command.x1)} ${number(command.y1)} ${number(command.x2)} ${number(command.y2)}`;
    return '';
  }).join(' ');
  const bounds = glyph.getBoundingBox();
  glyphs[character] = { ha: number(glyph.advanceWidth), x_min: number(bounds.x1), x_max: number(bounds.x2), o: outline };
}
await fs.mkdir('public/fonts', { recursive: true });
await fs.writeFile('public/fonts/ida-euclid-digits.typeface.json', JSON.stringify({ familyName: 'Euclid Circular A', resolution: 1000,
  ascender: number(font.ascender), descender: number(font.descender), underlinePosition: 0,
  boundingBox: { xMin: Math.min(...Object.values(glyphs).map(g => g.x_min)), xMax: Math.max(...Object.values(glyphs).map(g => g.x_max)),
    yMax: number(font.ascender), yMin: number(font.descender) }, underlineThickness: 50, glyphs,
  original_font_information: { fullName: 'Euclid Circular A Medium', source: 'Font supplied by the user' },
  originalFont: 'Euclid Circular A, supplied by the user; subset 207 for the Ida Light game' }));

console.log('Prepared local 3D glyph subset: 2027');
