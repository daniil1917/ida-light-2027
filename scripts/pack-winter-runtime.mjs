import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, getBounds, getGLPrimitiveCount } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import validator from 'gltf-validator';

const directory = 'assets/art-direction/winter-runtime';
const manifest = JSON.parse(await fs.readFile(`${directory}/manifest.json`, 'utf8'));
assert.equal(manifest.stage, 'geometry-preparation');
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
await fs.mkdir(`${directory}/packed`, { recursive: true });
const report = [];
for (const asset of manifest.assets) {
  const document = await io.read(`${directory}/raw/${asset.file}`);
  const before = getBounds(document.getRoot().getDefaultScene());
  // Existing runtime already decodes meshopt. Keep 16-bit positions for roof edges.
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeTexcoord: 16 }));
  const path = `${directory}/packed/${asset.file}`;
  await io.write(path, document);
  const bytes = await fs.readFile(path);
  const packed = await io.readBinary(bytes);
  const scene = packed.getRoot().getDefaultScene();
  const after = getBounds(scene);
  for (const side of ['min', 'max']) for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(after[side][i] - before[side][i]) < .002, `${asset.file}: geometry bounds changed`);
    assert.ok(Math.abs(before[side][i] - asset.bounds[side][i]) < .002, `${asset.file}: export axes differ from manifest`);
  }
  const nodes = packed.getRoot().listNodes();
  assert.equal(packed.getRoot().listScenes().length, 1, `${asset.file}: unrelated Blender scene was exported`);
  assert.deepEqual(scene.listChildren().map(n => n.getName()).sort(), [...asset.nodes].sort(), `${asset.file}: unexpected root nodes`);
  for (const name of asset.nodes) assert.ok(nodes.some(n => n.getName() === name), `${asset.file}: missing animation root ${name}`);
  assert.equal(packed.getRoot().listCameras().length, 0);
  assert.ok(!packed.getRoot().listExtensionsUsed().some(e => e.extensionName === 'KHR_lights_punctual'));
  const validation = await validator.validateBytes(new Uint8Array(bytes), { uri: asset.file, maxIssues: 60 });
  assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages));
  const primitives = packed.getRoot().listMeshes().flatMap(m => m.listPrimitives());
  assert.ok(primitives.every(p => p.getAttribute('NORMAL')), `${asset.file}: smooth normals are missing`);
  const triangles = primitives.reduce((sum, p) => sum + getGLPrimitiveCount(p), 0);
  assert.ok(triangles < asset.triangles * 1.01 + 1, `${asset.file}: mesh optimisation increased triangles`);
  if (asset.file === 'winter-floor.glb') {
    const size = after.max.map((v, i) => v - after.min[i]);
    assert.ok(Math.abs(size[0] - manifest.floor.width) < .002);
    assert.ok(Math.abs(size[1] - manifest.floor.height) < .002);
    assert.ok(Math.abs(size[2] - manifest.floor.depth) < .002);
    assert.ok(Math.abs((after.min[1] + after.max[1]) / 2) < .002, 'Floor collider pivot is not centred');
  }
  const record = { file: asset.file, rawBytes: asset.bytes, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), triangles, primitives: primitives.length,
    nodes: asset.nodes, bounds: after, validation: { errors: validation.issues.numErrors,
      warnings: validation.issues.numWarnings, messages: validation.issues.messages } };
  report.push(record);
  console.log(`${asset.file}: ${record.rawBytes} → ${record.bytes} bytes; ${triangles} triangles; ${record.primitives} primitives; validation ${record.validation.errors} errors`);
}
assert.equal(manifest.checks.lanterns, 6);
assert.equal(manifest.checks.bowLoops, 2);
assert.equal(manifest.checks.removedTreeRemaining, 0);
const source = await fs.readFile(manifest.source);
assert.equal(createHash('sha256').update(source).digest('hex'), manifest.sourceSha256, 'Approved source was overwritten');
const totals = report.reduce((sum, r) => ({ bytes: sum.bytes + r.bytes, triangles: sum.triangles + r.triangles,
  primitives: sum.primitives + r.primitives }), { bytes: 0, triangles: 0, primitives: 0 });
await fs.writeFile(`${directory}/validation.json`, JSON.stringify({ stage: manifest.stage, lightingBaked: false,
  sourceUnchanged: true, checksPassed: true, totals, assets: report }, null, 2) + '\n');
console.log('Total:', JSON.stringify(totals));
