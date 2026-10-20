import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await fs.mkdir('public/models', { recursive: true });
for (const file of (await fs.readdir('assets/raw')).filter(file => file.endsWith('.glb')).sort()) {
  const document = await io.read(`assets/raw/${file}`);
  // UVs are used by the shared runtime PBR materials, applied after GLB loading.
  await document.transform(weld(), dedup(), prune({ keepLeaves: true, keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`public/models/${file}`, document);
  console.log(`${file}: ${(await fs.stat(`assets/raw/${file}`)).size} → ${(await fs.stat(`public/models/${file}`)).size} bytes`);
}
