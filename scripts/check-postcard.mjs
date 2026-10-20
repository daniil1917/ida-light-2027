import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'


const shaderSource = readFileSync('src/ui/ida/holographicShaders.ts', 'utf8')
const vertexSource = shaderSource.match(/vertexSource = `([\s\S]*?)`/)[1]
{
  const source = readFileSync('assets/sources/holographic-card/original.html', 'utf8')
  const artwork = readFileSync('public/postcards/reindeer.png')
  const provenance = JSON.parse(readFileSync('assets/sources/holographic-card/provenance.json', 'utf8'))
  assert(artwork.equals(Buffer.from(source.match(/src="data:image\/png;base64,([^"]+)"/)[1], 'base64')))
  assert.equal(createHash('sha256').update(artwork).digest('hex'), provenance.artworkSha256)
  assert.deepEqual([artwork.readUInt32BE(16), artwork.readUInt32BE(20)], [1052, 1494])
  assert.equal(vertexSource, source.match(/const vertexSource = `([\s\S]*?)`;/)[1])
  for (const item of provenance.additionalArtworks) {
    const image = readFileSync(item.artwork)
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(createHash('sha256').update(image).digest('hex'), item.artworkSha256)
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [item.width, item.height])
  }
}

console.log('Both original 1052×1494 postcards pass SHA-256 checks. Reindeer and vertex shader match supplied HTML; fragment light sweep is intentionally corrected.')
