import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds, getGLPrimitiveCount } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const report = [];
for (const file of (await fs.readdir('public/models')).filter(file => file.endsWith('.glb')).sort()) {
  const bytes = await fs.readFile(`public/models/${file}`);
  const document = await io.readBinary(bytes);
  const result = await validator.validateBytes(new Uint8Array(bytes), { uri: file, maxIssues: 30 });
  const scene = document.getRoot().getDefaultScene();
  const item = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    triangles: document.getRoot().listMeshes().reduce((total, mesh) => total + mesh.listPrimitives().reduce((sum, primitive) => sum + getGLPrimitiveCount(primitive), 0), 0),
    nodes: document.getRoot().listNodes().map(node => node.getName()), bounds: getBounds(scene),
    extensions: document.getRoot().listExtensionsUsed().map(extension => extension.extensionName),
    validation: { errors: result.issues.numErrors, warnings: result.issues.numWarnings, messages: result.issues.messages } };
  if (item.validation.errors) throw new Error(`${file}: ${JSON.stringify(item.validation)}`);
  if (file.includes('floor') && bytes.length >= 250000) throw new Error(`${file}: floor budget exceeded`);
  if (file.includes('floor')) {
    const sizes = item.bounds.max.map((value, i) => value - item.bounds.min[i]);
    for (const [i, expected] of [3, .82, 2.65].entries()) if (Math.abs(sizes[i] - expected) > .015) throw new Error(`${file}: collision dimensions differ (${sizes})`);
    for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) if (!primitive.getAttribute('TEXCOORD_0')) throw new Error(`${file}: runtime material UVs are missing`);
    const structure = getBounds(document.getRoot().listNodes().find(node => node.getName() === 'Structure'));
    const snow = getBounds(document.getRoot().listNodes().find(node => node.getName() === 'Snow'));
    if (snow.max[1] - structure.max[1] < .014) throw new Error(`${file}: coplanar roof/snow surfaces can flicker`);
  }
  if (file.includes('floor')) for (const name of ['Structure', 'Glass', 'WindowLights']) if (!item.nodes.includes(name)) throw new Error(`${file}: missing ${name}`);
  if (file.includes('crane')) {
    for (const name of ['Boom', 'Mast', 'Foot', 'Trolley']) if (!item.nodes.includes(name)) throw new Error(`${file}: missing ${name}`);
    const mast = getBounds(document.getRoot().listNodes().find(node => node.getName() === 'Mast'));
    const foot = getBounds(document.getRoot().listNodes().find(node => node.getName() === 'Foot'));
    if (Math.abs(mast.min[1]) > .005 || Math.abs(mast.max[1] - 1) > .005 || Math.abs(foot.min[1]) > .005) throw new Error(`${file}: mast or foot is not grounded`);
    if (Math.max(mast.max[2], foot.max[2]) >= -2.65 / 2 - .3) throw new Error(`${file}: crane intersects the floor travel plane`);
    for (const name of ['Rail_0', 'Rail_1', 'Rail_2']) {
      const rail = document.getRoot().listNodes().find(node => node.getName() === name);
      if (!rail) throw new Error(`${file}: missing telescope section ${name}`);
      const bounds = getBounds(rail);
      if (Math.abs(bounds.min[0]) > .01 || Math.abs(bounds.max[0] - 1) > .01) throw new Error(`${file}: telescope section is not unit length`);
    }
  }
  if (file.includes('city')) {
    const colours = document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives()).flatMap(primitive => {
      const attribute = primitive.getAttribute('COLOR_0');
      return attribute ? Array.from({ length: attribute.getCount() }, (_, i) => attribute.getElement(i, [])) : [];
    });
    if (!colours.some(([r, g, b]) => r > g * 1.5 && r > b * 1.5) || !colours.some(([r, g, b]) => g > r * 1.5 && g > b * 1.2)) throw new Error(`${file}: original red/green Holiday colours are missing`);
  }
  if (file.includes('holiday-trim')) {
    const trim = document.getRoot().listNodes().find(node => node.getName() === 'Trim');
    const roles = trim?.listChildren().flatMap(node => node.getMesh()?.listPrimitives().map(p => p.getMaterial()?.getName()) ?? []) ?? [];
    for (const role of ['IdaHolidayMaterial', 'IdaBulbMaterial']) if (!roles.includes(role)) throw new Error(`${file}: missing instanced garland material ${role}`);
  }
  if (file.includes('neighborhood')) {
    // Both rings now use Kenney architecture, with one static mesh per role.
    // Static scenery does not enter the per-frame shadow depth pass.
    if (bytes.length > 2800000 || item.triangles > 170000) throw new Error(`${file}: neighborhood budget exceeded`);
    for (const role of ['Road', 'Snow', 'Bulb', 'WindowWarm', 'Holiday']) if (!item.nodes.includes(role)) throw new Error(`${file}: missing neighborhood role ${role}`);
    if (item.bounds.min[1] < -.3 || item.bounds.max[1] > 4) throw new Error(`${file}: scenery intrudes into the upper floor path`);
  }
  if (file.includes('quarter-baked')) {
    const primitives = document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives());
    if (bytes.length > 1600000 || item.triangles > 170000 || primitives.length !== 1) throw new Error(`${file}: baked quarter budget exceeded`);
    if (!primitives[0].getAttribute('TEXCOORD_0')) throw new Error(`${file}: lightmap UVs missing`);
    if (item.bounds.min[1] < -.3 || item.bounds.max[1] > 4) throw new Error(`${file}: scenery intrudes into floor path`);
  }
  report.push(item); console.log(`${file}: ${item.bytes} bytes, ${item.triangles} triangles, ${item.validation.errors} errors, ${item.validation.warnings} warnings`);
}
await fs.writeFile('public/models/manifest.json', JSON.stringify(report, null, 2) + '\n');
await fs.writeFile('docs/research/assets-report.json', JSON.stringify(report, null, 2) + '\n');
const assets = [];
for (const folder of ['models', 'textures', 'fonts', 'environment', 'branding']) {
  for (const file of (await fs.readdir(`public/${folder}`)).sort()) {
    if (file === 'manifest.json') continue;
    const bytes = await fs.readFile(`public/${folder}/${file}`);
    assets.push({ path: `${folder}/${file}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
await fs.writeFile('public/asset-manifest.json', JSON.stringify(assets, null, 2) + '\n');
