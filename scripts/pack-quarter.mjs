import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
for (const [source, output] of [
  ...['a', 'b', 'c', 'special'].map(type => [`assets/raw/ida-floor-${type}.glb`, `public/models/ida-floor-${type}.glb`]),
  ['assets/baked/ida-quarter-baked.glb', 'public/models/ida-quarter-baked.glb'],
]) {
  const document = await io.read(source);
  if (source.includes('quarter')) for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    // Baked illumination needs positions and UVs; per-frame normals are unused.
    primitive.setAttribute('NORMAL', null);
    primitive.setAttribute('TANGENT', null);
  }
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium',
    ...(source.includes('quarter') ? { quantizePosition: 16, quantizeTexcoord: 16 } : {}) }));
  await io.write(output, document);
  console.log(output, (await fs.stat(output)).size);
}
// Keep the prior runtime assets recoverable, but don't distribute unused copies.
await fs.mkdir('.cache/legacy-quarter', { recursive: true });
for (const [source, backup] of [['public/models/ida-neighborhood.glb', '.cache/legacy-quarter/ida-neighborhood.glb'],
  ['public/textures/quarter-shadows.svg', '.cache/legacy-quarter/quarter-shadows.svg']]) {
  try { await fs.copyFile(source, backup); await fs.unlink(source); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
