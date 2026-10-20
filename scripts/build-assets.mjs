import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshBVH } from 'three-mesh-bvh';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/raw');
await fs.mkdir(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// GLTFExporter uses the browser FileReader interface for Blob buffers.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};

const { colors: brand } = JSON.parse(await fs.readFile(path.join(ROOT, 'src/app/brand.json'), 'utf8'));
const scenePalette = JSON.parse(await fs.readFile(path.join(ROOT, 'src/scene/scenePalette.json'), 'utf8'));
const construction = JSON.parse(await fs.readFile(path.join(ROOT, 'src/game/constructionConfig.json'), 'utf8'));
const colors = { ...scenePalette, Snow: brand.white, Light: brand.white, Ground: brand.lightGray,
  Accent: brand.blue, Foliage: brand.black, Holiday: brand.white };
const materials = Object.fromEntries(Object.entries(colors).map(([role, color]) => {
  const material = new THREE.MeshStandardMaterial({ color, roughness: role === 'Glass' ? 0.2 : 0.8,
    metalness: role === 'Glass' ? 0.5 : role === 'Metal' ? 0.6 : 0 });
  material.name = `Ida${role}Material`;
  if (role === 'Holiday') { material.vertexColors = true; material.roughness = .85; }
  if (role === 'Light') { material.emissive.set(color); material.emissiveIntensity = 0.7; }
  return [role, material];
}));

function rawGeometry(primitive) {
  const geometry = new THREE.BufferGeometry();
  const names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' };
  for (const [source, target] of Object.entries(names)) {
    const accessor = primitive.getAttribute(source);
    if (accessor) geometry.setAttribute(target, new THREE.BufferAttribute(Float32Array.from(accessor.getArray()), accessor.getElementSize()));
  }
  const indices = primitive.getIndices();
  if (indices) geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(indices.getArray()), 1));
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

const source = await io.read(path.join(ROOT, 'assets/buildings/projects/ida/build/model.glb'));
function mass(section, dimensions, center = [0, 0, 0]) {
  const node = source.getRoot().listNodes().find(node => node.getName() === section);
  if (!node?.getMesh()) throw new Error(`Missing generator section: ${section}`);
  const geometry = mergeGeometries(node.getMesh().listPrimitives().map(rawGeometry));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  geometry.translate(...box.getCenter(new THREE.Vector3()).negate().toArray());
  geometry.scale(...dimensions.map((value, i) => value / size.toArray()[i]));
  geometry.translate(...center);
  return geometry;
}

function box(size, position = [0, 0, 0], bevel = 0.018) {
  const geometry = bevel ? new RoundedBoxGeometry(...size, 1, bevel) : new THREE.BoxGeometry(...size);
  geometry.translate(...position);
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function builder() {
  const groups = {};
  return {
    add(role, geometry) { (groups[role] ??= []).push(geometry); },
    box(role, size, position, bevel) { this.add(role, box(size, position, bevel)); },
    finish(name) {
      const group = new THREE.Group(); group.name = name;
      for (const [role, geometries] of Object.entries(groups)) {
        const mesh = new THREE.Mesh(mergeGeometries(geometries), materials[role]);
        mesh.name = role === 'Facade' ? 'Structure' : role;
        group.add(mesh);
      }
      return group;
    },
  };
}

function bulb(build, position, radius = .035) {
  const geometry = new THREE.OctahedronGeometry(radius);
  geometry.translate(...position); build.add('Bulb', geometry);
}
function cylinder(build, role, radius, height, position, rotate = false) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 8).toNonIndexed();
  if (rotate) geometry.rotateX(Math.PI / 2);
  geometry.translate(...position); build.add(role, geometry);
}
function absorb(build, model) {
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (object.isMesh) build.add(object.material.name.replace(/^Ida|Material$/g, ''), object.geometry.clone().applyMatrix4(object.matrixWorld));
  });
}
function stringLights(build, a, b, spacing = .28) {
  const count = Math.ceil(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)) / spacing);
  for (let i = 0; i <= count; i++) bulb(build, a.map((value, axis) => value + (b[axis] - value) * i / count));
}

async function save(name, group) {
  bakeOcclusion(group);
  const buffer = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: false });
  await fs.writeFile(path.join(OUT, `${name}.glb`), Buffer.from(buffer));
  console.log(`${name}: ${buffer.byteLength} raw bytes`);
}

// Bake local contact shading once, rather than paying for it on every phone
// frame. Screen-space AO adds shadows between separate models at runtime.
function bakeOcclusion(group) {
  group.updateMatrixWorld(true);
  const meshes = [], blockers = [];
  group.traverse(object => {
    if (!object.isMesh || /Ida(Light|Bulb)Material/.test(object.material.name)) return;
    meshes.push(object);
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    for (const attribute of Object.keys(geometry.attributes)) if (attribute !== 'position') geometry.deleteAttribute(attribute);
    blockers.push(geometry);
  });
  const geometry = mergeGeometries(blockers), bvh = new MeshBVH(geometry);
  const ray = new THREE.Ray(), normal = new THREE.Vector3(), tangent = new THREE.Vector3(), bitangent = new THREE.Vector3();
  const point = new THREE.Vector3(), axis = new THREE.Vector3(), cache = new Map();
  const radius = .6, samples = 12;
  for (const mesh of meshes) {
    if (/Ida(WindowWarm|Glass)Material/.test(mesh.material.name)) continue;
    const position = mesh.geometry.getAttribute('position'), normals = mesh.geometry.getAttribute('normal');
    const original = mesh.geometry.getAttribute('color'), colours = new Float32Array(position.count * 3);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      const key = [...point.toArray(), ...normal.toArray()].map(v => Math.round(v * 1000)).join(',');
      let shade = cache.get(key);
      if (shade === undefined) {
        axis.set(0, Math.abs(normal.y) > .9 ? 0 : 1, Math.abs(normal.y) > .9 ? 1 : 0);
        tangent.crossVectors(axis, normal).normalize(); bitangent.crossVectors(normal, tangent);
        ray.origin.copy(point).addScaledVector(normal, .006);
        let occluded = 0;
        for (let j = 0; j < samples; j++) {
          const r = Math.sqrt((j + .5) / samples), angle = j * 2.3999632297;
          ray.direction.copy(normal).multiplyScalar(Math.sqrt(1 - r * r)).addScaledVector(tangent, Math.cos(angle) * r).addScaledVector(bitangent, Math.sin(angle) * r);
          const hit = bvh.raycastFirst(ray, THREE.DoubleSide, .003, radius);
          if (hit) occluded += 1 - hit.distance / radius;
        }
        shade = 1 - .68 * occluded / samples; cache.set(key, shade);
      }
      for (let c = 0; c < 3; c++) colours[i * 3 + c] = shade * (original ? original.getComponent(i, c) : 1);
    }
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  }
  geometry.dispose(); blockers.forEach(g => g.dispose());
}

// Kenney building-skyscraper-a: one glazed storey, excluding entrance and roof.
const citySource = await io.read(path.join(ROOT, 'assets/sources/kenney/city-commercial/building-skyscraper-a.glb'));
const cityPalette = JSON.parse(await fs.readFile(path.join(ROOT, 'assets/sources/kenney/city-commercial/palette.json'), 'utf8'));
function cityRole(u, v) {
  const x = Math.min(cityPalette.width - 1, Math.max(0, Math.floor(u * cityPalette.width)));
  const y = Math.min(cityPalette.height - 1, Math.max(0, Math.floor(v * cityPalette.height)));
  const [r, g, b] = cityPalette.pixels[y * cityPalette.width + x];
  // The atlas has blue-grey masonry as well as blue glass. Only the saturated
  // blue swatches are windows; tinting masonry as glass erased its depth.
  return b > 170 && b > r * 1.3 ? 'Glass' : 'Facade';
}
const storeyArrays = { Facade: [], Glass: [] };
function clipHeight(vertices, boundary, above) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const insideA = above ? a[1] >= boundary : a[1] <= boundary;
    const insideB = above ? b[1] >= boundary : b[1] <= boundary;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (boundary - a[1]) / (b[1] - a[1]);
      result.push(a.map((value, axis) => value + (b[axis] - value) * t));
    }
  }
  return result;
}
for (const node of citySource.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  for (const primitive of node.getMesh().listPrimitives()) {
    const geometry = rawGeometry(primitive).applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i += 3) {
      const vertices = [i, i + 1, i + 2].map(j => [position.getX(j), position.getY(j), position.getZ(j), normal.getX(j), normal.getY(j), normal.getZ(j), uv.getX(j), uv.getY(j)]);
      const role = cityRole(vertices.reduce((sum, v) => sum + v[6], 0) / 3, vertices.reduce((sum, v) => sum + v[7], 0) / 3);
      const clipped = clipHeight(clipHeight(vertices, 1.146, true), 1.493, false);
      for (let j = 1; j < clipped.length - 1; j++) storeyArrays[role].push(clipped[0], clipped[j], clipped[j + 1]);
    }
    geometry.dispose();
  }
}
const storeyBounds = new THREE.Box3();
for (const vertices of Object.values(storeyArrays)) for (const vertex of vertices) storeyBounds.expandByPoint(new THREE.Vector3(...vertex.slice(0, 3)));
const storeyCenter = storeyBounds.getCenter(new THREE.Vector3()), storeySize = storeyBounds.getSize(new THREE.Vector3());
const storeyScale = new THREE.Vector3(2.88 / storeySize.x, .62 / storeySize.y, 2.53 / storeySize.z);
function storeyGeometry(role) {
  const vertices = storeyArrays[role];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(v => v.slice(0, 3)), 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(vertices.flatMap(v => v.slice(3, 6)), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(vertices.flatMap(v => v.slice(6, 8)), 2));
  geometry.translate(-storeyCenter.x, -storeyCenter.y, -storeyCenter.z);
  geometry.scale(storeyScale.x, storeyScale.y, storeyScale.z);
  return geometry;
}

const lightGeometry = new THREE.PlaneGeometry(1, 1);
const layouts = {};
for (const variant of ['a', 'b', 'c', 'special']) {
  const build = builder();
  const special = variant === 'special';
  const slabHeight = special ? 0.14 : 0.1;
  build.box('Facade', [3, slabHeight, 2.65], [0, -(0.41 - slabHeight / 2), 0], 0.022);
  // Snow owns the top .018 m; two coplanar surfaces flicker while moving.
  build.box('Facade', [3, slabHeight - .018, 2.65], [0, .401 - slabHeight / 2, 0], 0.022);
  build.add('Facade', storeyGeometry('Facade'));
  build.add('Glass', storeyGeometry('Glass'));
  // Thin snow rests within the floor's original collision envelope.
  build.box('Snow', [2.96, .018, 2.61], [0, .401, 0], .008);
  const front = [-1.44, -0.48, 0.48, 1.44];
  const side = [-1.265, -0.42, 0.42, 1.265];
  for (const x of front) build.box('Facade', [.045, .62, .025], [x * .99, 0, 1.276], 0);
  for (const z of side) build.box('Facade', [.025, .62, .045], [1.45, 0, z * .99], 0);
  if (variant === 'c') build.box('Accent', [0.07, 0.62, 0.025], [-1.40, 0, 1.278], 0);
  if (variant === 'b') {
    for (const z of [-1.30, 1.30]) build.box('Metal', [2.84, 0.026, 0.025], [0, -0.1, z], 0);
    for (const x of [-1.47, 1.47]) build.box('Metal', [0.025, 0.026, 2.48], [x, -0.1, 0], 0);
  }
  if (special) {
    for (const z of [-1.313, 1.313]) build.box('Accent', [2.98, 0.032, 0.018], [0, -0.285, z], 0);
    for (const x of [-1.489, 1.489]) build.box('Accent', [0.018, 0.032, 2.61], [x, -0.285, 0], 0);
  }
  const floor = build.finish(`Floor_${variant}`);
  const lights = new THREE.Group(); lights.name = 'WindowLights';
  const panes = [];
  for (let i = 0; i < front.length - 1; i++) panes.push({ position: [(front[i] + front[i + 1]) / 2, -.05, 1.273], rotation: [0, 0, 0], scale: [0.7, 0.4, 1] });
  for (let i = 0; i < side.length - 1; i++) panes.push({ position: [1.463, -.05, (side[i] + side[i + 1]) / 2], rotation: [0, Math.PI / 2, 0], scale: [0.6, 0.4, 1] });
  panes.forEach((pane, i) => {
    const light = new THREE.Mesh(lightGeometry, materials.Light); light.name = `Window_${i}`;
    light.position.fromArray(pane.position); light.rotation.fromArray(pane.rotation); light.scale.fromArray(pane.scale);
    lights.add(light);
  });
  floor.add(lights); layouts[variant] = panes;
  await save(`ida-floor-${variant}`, floor);
}
await fs.writeFile(path.join(ROOT, 'src/assets/floor-layouts.json'), JSON.stringify(layouts, null, 2) + '\n');
if (process.env.IDA_BUILD_FLOORS_ONLY === '1') process.exit(0);

const base = builder();
base.add('Facade', mass('ground', [3.2, 0.72, 2.85], [0, 0.36, 0]));
base.box('Facade', [3.35, 0.105, 3], [0, 0.665, 0], 0.03);
base.box('Glass', [2.55, 0.43, 0.025], [0, 0.335, 1.433], 0);
base.box('Glass', [0.025, 0.43, 2.24], [1.608, 0.335, 0], 0);
for (const x of [-1.31, -0.5, 0.5, 1.31]) base.box('Metal', [0.035, 0.43, 0.035], [x, 0.335, 1.448], 0);
for (const x of [-.90, 0, .90]) base.add('Light', new THREE.PlaneGeometry(.70, .36).scale(1, 1, 1).translate(x, .335, 1.453).toNonIndexed());
for (const z of [-.7, .05, .8]) base.add('Light', new THREE.PlaneGeometry(.62, .36).rotateY(Math.PI / 2).translate(1.625, .335, z).toNonIndexed());
base.box('Accent', [2.66, 0.028, 0.024], [0, 0.565, 1.447], 0);
for (let i = 0; i < 3; i++) base.box('Facade', [1.15, 0.04, 0.27], [0, 0.10 - i * 0.035, 1.52 + i * 0.25], 0.006);
await save('ida-base', base.finish('Base'));

const roof = builder();
roof.add('Facade', mass('crown', [3, 0.19, 2.65], [0, 0.095, 0]));
roof.box('Metal', [2.77, 0.045, 2.42], [0, 0.205, 0], 0.015);
roof.box('Snow', [2.66, 0.027, 2.31], [0, 0.239, 0], 0.013);
roof.box('Accent', [2.92, 0.025, 0.025], [0, 0.155, 1.32], 0);
roof.box('Metal', [0.78, 0.16, 0.54], [-0.74, 0.32, -0.65], 0.035);
roof.box('Snow', [0.8, 0.035, 0.56], [-0.74, 0.42, -0.65], 0.014);
await save('ida-roof', roof.finish('Roof'));

const crane = builder();
const boomY = 5.03;
const { craneMastX: mastX, craneMastZ: mastZ } = construction;
// A rigid cross-member connects the rear mast to the rail over the floor.
crane.box('Metal', [.45, .12, Math.abs(mastZ) + .25], [mastX, boomY, mastZ / 2], .008);
crane.box('Metal', [.2, .04, Math.abs(mastZ) + .2], [mastX, boomY + .32, mastZ / 2], 0);
for (let i = 0; i < 5; i++) {
  const diagonal = box([.045, .47, .018], [0, 0, 0], 0);
  diagonal.rotateX(i % 2 ? .98 : -.98); diagonal.translate(mastX, boomY + .16, mastZ + (i + .5) * Math.abs(mastZ) / 5);
  crane.add('Metal', diagonal);
}
crane.box('Glass', [0.45, 0.38, 0.42], [mastX, boomY - 0.33, mastZ], 0.03);
crane.box('Metal', [0.78, 0.17, 0.36], [mastX, boomY + 0.07, mastZ], 0.015);
crane.box('Metal', [1.3, .12, .35], [mastX, boomY, 0], .008);
const craneModel = new THREE.Group(); craneModel.name = 'Crane';
const boom = crane.finish('Boom'); craneModel.add(boom);
// Three nested tube profiles per side. Runtime changes only their X extent;
// the rear mast, cross-member, cabin and cable retain their real proportions.
for (let i = 0; i < 3; i++) {
  const rail = builder();
  const width = .34 - i * .065;
  rail.box('Accent', [1, .11, width], [.5, boomY, 0], 0);
  rail.box('Metal', [1, .055, width * .8], [.5, boomY + .27 - i * .025, 0], 0);
  rail.box('Metal', [.025, .32 - i * .025, width], [.985, boomY + .11, 0], 0);
  craneModel.add(rail.finish(`Rail_${i}`));
}

const mast = builder();
for (const x of [mastX - .2, mastX + .2]) for (const z of [mastZ - .2, mastZ + .2]) mast.box('Metal', [.065, 1, .065], [x, .5, z], 0);
for (const y of [.025, .975]) {
  for (const z of [mastZ - .2, mastZ + .2]) mast.box('Metal', [.465, .05, .065], [mastX, y, z], 0);
  for (const x of [mastX - .2, mastX + .2]) mast.box('Metal', [.065, .05, .465], [x, y, mastZ], 0);
}
for (const z of [mastZ - .2, mastZ + .2]) {
  const brace = box([.035, 1.04, .035], [0, 0, 0], 0);
  brace.rotateZ(.4); brace.translate(mastX, .5, z); mast.add('Metal', brace);
}
craneModel.add(mast.finish('Mast'));
const foot = builder();
foot.box('Metal', [1.05, .18, 1.05], [mastX, .09, mastZ], .015);
foot.box('Accent', [.62, .08, .62], [mastX, .22, mastZ], .008);
craneModel.add(foot.finish('Foot'));
const trolley = builder();
trolley.box('Metal', [0.33, 0.15, 0.3], [0, boomY - 0.1, 0], 0.015);
trolley.box('Metal', [0.014, 1.28, 0.014], [0, 4.3, 0], 0);
trolley.box('Metal', [0.76, 0.055, 0.07], [0, 3.79, 0], 0.005);
boom.add(trolley.finish('Trolley'));
await save('ida-crane', craneModel);

// City uses neutral roles. Holiday retains the exact atlas samples as linear
// vertex colours, so the pack's red/green/wood colours survive mesh merging.
const importCache = new Map();
async function imported(pack, file, height, offset, name) {
  const key = `${pack}/${file}/${height}`;
  if (importCache.has(key)) { const clone = importCache.get(key).clone(true); clone.name = name; clone.position.fromArray(offset); return clone; }
  const document = await io.read(path.join(ROOT, `assets/sources/kenney/${pack}/${file}`));
  const palette = JSON.parse(await fs.readFile(path.join(ROOT, `assets/sources/kenney/${pack}/palette.json`), 'utf8'));
  const build = builder();
  const all = [];
  for (const node of document.getRoot().listNodes()) {
    if (!node.getMesh()) continue;
    for (const primitive of node.getMesh().listPrimitives()) {
      const geometry = rawGeometry(primitive).applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
      all.push(geometry);
      const uv = geometry.getAttribute('uv'); const groups = {};
      for (let i = 0; i < geometry.getAttribute('position').count; i += 3) {
        const u = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
        const v = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3;
        const x = Math.min(palette.width - 1, Math.max(0, Math.floor(u * palette.width)));
        const y = Math.min(palette.height - 1, Math.max(0, Math.floor(v * palette.height)));
        const [r, g, b] = palette.pixels[y * palette.width + x];
        const brightness = (r + g + b) / 3;
        const glass = b > 170 && b > r * 1.3;
        const normal = geometry.getAttribute('normal');
        const horizontal = Math.abs((normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3) > .7;
        const role = pack === 'city-commercial' ? (glass ? 'WindowWarm' : brightness < 70 ? horizontal ? 'Ground' : 'Metal' : 'Backdrop') : 'Holiday';
        if (pack === 'holiday') {
          if (!geometry.getAttribute('color')) geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
          const colour = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
          for (let j = i; j < i + 3; j++) geometry.getAttribute('color').setXYZ(j, colour.r, colour.g, colour.b);
        }
        (groups[role] ??= []).push(i, i + 1, i + 2);
      }
      for (const [role, ids] of Object.entries(groups)) {
        const split = new THREE.BufferGeometry();
        for (const attribute of pack === 'holiday' ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv']) {
          const source = geometry.getAttribute(attribute);
          split.setAttribute(attribute, new THREE.BufferAttribute(Float32Array.from(ids.flatMap(id => Array.from(source.array.slice(id * source.itemSize, (id + 1) * source.itemSize)))), source.itemSize));
        }
        build.add(role, split);
      }
    }
  }
  const bounds = new THREE.Box3(); all.forEach(geometry => { geometry.computeBoundingBox(); bounds.union(geometry.boundingBox); });
  const center = bounds.getCenter(new THREE.Vector3()); const size = bounds.getSize(new THREE.Vector3());
  const model = build.finish(name);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.translate(-center.x, -bounds.min.y, -center.z);
    object.geometry.scale(height / size.y, height / size.y, height / size.y);
  });
  importCache.set(key, model);
  const clone = model.clone(true); clone.position.fromArray(offset);
  return clone;
}

const trim = builder();
for (const [name, position, rotation, width] of [
  ['Garland_Front', [0, .18, 1.35], 0, 2.72],
  ['Garland_Side', [1.52, .18, 0], Math.PI / 2, 2.35],
]) {
  const garland = await imported('holiday', 'lights-colored.glb', .18, position, name);
  garland.scale.x = width / new THREE.Box3().setFromObject(garland).getSize(new THREE.Vector3()).x;
  garland.rotation.y = rotation; garland.updateMatrixWorld(true);
  garland.traverse(object => { if (object.isMesh) trim.add('Holiday', object.geometry.clone().applyMatrix4(object.matrixWorld)); });
}
stringLights(trim, [-1.4, .22, 1.37], [1.4, .22, 1.37], .23);
stringLights(trim, [1.53, .22, -1.25], [1.53, .22, 1.25], .23);
const decor = new THREE.Group(); decor.name = 'HolidayDecor'; decor.add(trim.finish('Trim'));
decor.add(await imported('holiday', 'wreath.glb', .32, [0, -.19, 1.39], 'Wreath'));
await save('ida-holiday-trim', decor);

const city = new THREE.Group(); city.name = 'City';
for (const [i, [file, height, position]] of [
  ['tree-snow-a.glb', 1.9, [-3.1, 0, -3.6]],
  ['tree-decorated-snow.glb', 2.05, [1.9, 0, -3.35]],
  ['tree-snow-a.glb', 1.55, [-.35, 0, -3.85]],
].entries()) {
  city.add(await imported('holiday', file, height, position, `RearTree_${i}`));
}
city.add(await imported('holiday', 'tree-decorated-snow.glb', 2.05, [3.15, 0, 1.1], 'HolidayTree'));
city.add(await imported('holiday', 'tree-snow-a.glb', 1.1, [-3.9, 0, -1.35], 'WinterTree'));
city.add(await imported('holiday', 'present-a-cube.glb', .35, [2.55, 0, 2.0], 'Gift_A'));
city.add(await imported('holiday', 'present-b-rectangle.glb', .26, [3.1, 0, 2.25], 'Gift_B'));
city.add(await imported('holiday', 'present-b-cube.glb', .3, [2.72, 0, 2.52], 'Gift_C'));
city.add(await imported('holiday', 'snowman-hat.glb', .95, [-2.8, 0, 2.0], 'Snowman'));
city.add(await imported('holiday', 'candy-cane-red.glb', 1.2, [1.95, 0, 2.35], 'CandyCane'));
city.add(await imported('holiday', 'wreath.glb', .5, [0, .38, 1.48], 'Wreath'));
city.add(await imported('holiday', 'bench.glb', .45, [-2.9, 0, 1.25], 'Bench'));
city.add(await imported('holiday', 'lantern.glb', .72, [-3.3, 0, 2.15], 'Lantern'));
const sled = await imported('holiday', 'sled.glb', .28, [-2.25, 0, 2.8], 'HolidaySled');
sled.rotation.y = -.35; city.add(sled);
city.add(await imported('holiday', 'present-a-cube.glb', .42, [2.45, 0, -2.55], 'RearGift_A'));
city.add(await imported('holiday', 'present-a-round.glb', .32, [3, 0, -2.55], 'RearGift_B'));
city.add(await imported('holiday', 'candy-cane-green.glb', .85, [-3.9, 0, .4], 'CandyCaneGreen'));
city.add(await imported('holiday', 'lantern.glb', .65, [-3.7, 0, -2.45], 'RearLantern'));
for (const [i, position] of [[1.65, 0, .6], [-1.8, 0, -.5], [.65, 0, -1.55], [-1.3, 0, 1.8], [3.8, 0, 2.15], [-3.7, 0, 1.0]].entries()) {
  const drift = await imported('holiday', 'snow-pile.glb', i < 4 ? .23 : .16, position, `Snowbank_${i}`);
  drift.scale.set(1.45, 1, 1.15); city.add(drift);
}
const garland = await imported('holiday', 'lights-colored.glb', .28, [0, .55, 1.49], 'Garland');
garland.scale.x = 2; city.add(garland);
const landscape = builder();
landscape.box('Ground', [9.6, .14, 8.8], [0, -.15, -.3], .06);
landscape.box('Snow', [9.5, .06, 8.7], [0, -.05, -.3], .04);
landscape.box('Snow', [9.36, 0.035, 0.25], [0, -0.038, -4.25], 0.014);
landscape.box('Snow', [0.24, 0.035, 7.5], [-4.52, -0.038, -0.5], 0.014);
landscape.box('Snow', [0.24, 0.035, 7.5], [4.52, -0.038, -0.5], 0.014);
for (let i = 0; i < 8; i++) landscape.box('Facade', [0.65, 0.02, 0.025], [-3.6 + i * 1.02, -0.008, 2.72], 0);
landscape.box('Ground', [3.65, 0.035, 3.65], [0, -0.003, 0.1], 0.04);
city.add(landscape.finish('Landscape'));
// One mesh per material for static props; no render call per gift/tree.
const foreground = builder(); absorb(foreground, city);
await save('ida-city', foreground.finish('City'));

// A real neighborhood around the playable lot, generated from the existing
// Kenney buildings plus roads/curbs/props. It has no physics bodies.
const neighborhood = builder();
neighborhood.box('Snow', [160, .12, 160], [0, -.22, 0], 0);
const roadCenters = [-17, -6, 6, 17];
for (const center of roadCenters) {
  neighborhood.box('Road', [2.4, .025, 120], [center, -.147, 0], 0);
  neighborhood.box('Road', [120, .027, 2.4], [0, -.145, center], 0);
  for (const side of [-1, 1]) {
    neighborhood.box('Snow', [.16, .095, 120], [center + side * 1.28, -.105, 0], .025);
    neighborhood.box('Snow', [120, .095, .16], [0, -.105, center + side * 1.28], .025);
  }
  for (let p = -57; p <= 57; p += 1.6) {
    if (roadCenters.some(c => Math.abs(p - c) < 1.8)) continue;
    neighborhood.box('Snow', [.07, .015, .8], [center, -.124, p], 0);
    neighborhood.box('Snow', [.8, .015, .07], [p, -.117, center], 0);
  }
}
// Every visible house uses the same Kenney architecture and roof details.
// Static meshes are still merged by material; distance never turns them into boxes.
const houseShadows = [];
let outerIndex = 16;
for (const x of [-22, -11, 0, 11, 22]) for (const z of [-22, -11, 0, 11, 22]) {
  if (Math.abs(x) < 22 && Math.abs(z) < 22) continue;
  await neighborhoodHouse(outerIndex++, x, z);
}
for (const x of [-6, 6]) for (const z of [-6, 6]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
  neighborhood.box('Snow', [.27, .016, .78], [x - .86 + i * .43, -.115, z + side * 1.78], 0);
  neighborhood.box('Snow', [.78, .016, .27], [x + side * 1.78, -.115, z - .86 + i * .43], 0);
}

function roundTree(x, z, height = 1.8) {
  const ground = Math.abs(x) < 4.7 && Math.abs(z) < 4.7 ? -.02 : -.16;
  cylinder(neighborhood, 'Wood', .065, height * .58, [x, ground + height * .29, z]);
  const crowns = [[0, .73, 0, .32], [-.21, .62, .02, .23], [.22, .67, .03, .24], [.02, .64, .21, .24]];
  for (const [dx, dy, dz, r] of crowns) {
    const geometry = new THREE.SphereGeometry(height * r, 10, 8).toNonIndexed();
    geometry.translate(x + dx * height, ground + dy * height, z + dz * height); neighborhood.add('Snow', geometry);
  }
  const mound = new THREE.SphereGeometry(.4, 10, 6).toNonIndexed();
  mound.scale(1, .2, .85); mound.translate(x, ground + .025, z); neighborhood.add('Snow', mound);
}
function streetLamp(x, z) {
  const ground = Math.abs(x) < 4.7 && Math.abs(z) < 4.7 ? -.02 : -.16;
  cylinder(neighborhood, 'Metal', .035, 1.45, [x, ground + .725, z]);
  neighborhood.box('Metal', [.15, .08, .15], [x, ground + .04, z], .018);
  neighborhood.box('Bulb', [.115, .19, .115], [x, ground + 1.48, z], .016);
  neighborhood.box('Metal', [.19, .045, .19], [x, ground + 1.60, z], .018);
}
async function neighborhoodHouse(i, x, z) {
  const height = [2.2, 2.7, 3.2, 2.4][i % 4];
  const house = await imported('city-commercial', ['building-a.glb', 'building-c.glb', 'building-h.glb', 'building-f.glb'][i % 4], height, [x, -.16, z], `House_${i}`);
  const bounds = new THREE.Box3().setFromObject(house).getSize(new THREE.Vector3());
  house.scale.x = 3 / bounds.x; house.scale.z = 2.75 / bounds.z;
  absorb(neighborhood, house);
  neighborhood.box('Snow', [3.08, .10, 2.83], [x, height - .14, z], .035);
  stringLights(neighborhood, [x - 1.5, height - .33, z + 1.42], [x + 1.5, height - .33, z + 1.42], .3);
  stringLights(neighborhood, [x + 1.55, height - .33, z - 1.35], [x + 1.55, height - .33, z + 1.35], .3);
  // A recessed roof well and snowy parapet catch different planes of light.
  neighborhood.box('Snow', [2.44, .035, 2.20], [x, height - .07, z], .015);
  for (const side of [-1, 1]) {
    neighborhood.box('Snow', [3.08, .11, .12], [x, height - .02, z + side * 1.35], .025);
    neighborhood.box('Snow', [.12, .11, 2.6], [x + side * 1.48, height - .02, z], .025);
  }
  neighborhood.box('Metal', [.46, .2, .38], [x - .68, height + .03, z - .55], .022);
  neighborhood.box('Snow', [.48, .04, .4], [x - .68, height + .15, z - .55], .012);
  const tree = await imported('holiday', 'tree-decorated-snow.glb', 1.35, [x - 1.2, -.16, z + 2.25], `Tree_${i}`);
  absorb(neighborhood, tree);
  // Tiny emissive dots spiral around the original Christmas tree model.
  for (let n = 0; n < 20; n++) {
    const y = .24 + n / 20 * 1.02, radius = .42 * (1 - y / 1.4), angle = n * 1.1;
    bulb(neighborhood, [x - 1.2 + Math.cos(angle) * radius, y - .16, z + 2.25 + Math.sin(angle) * radius], .026);
  }
  const wreath = await imported('holiday', 'wreath.glb', .32, [x, height * .5, z + 1.44], `HouseWreath_${i}`);
  absorb(neighborhood, wreath);
  houseShadows.push({ x, z, height });
}
let houseIndex = 0;
for (const cx of [-11, 0, 11]) for (const cz of [-11, 0, 11]) {
  if (cx === 0 && cz === 0) continue;
  for (const offset of [-2.05, 2.05]) {
    const i = houseIndex++, x = cx + offset, z = cz + (i % 2 ? 1.35 : -1.35);
    await neighborhoodHouse(i, x, z);
  }
  roundTree(cx + 3.4, cz + 2.8, 1.6);
  roundTree(cx - 3.5, cz - 2.8, 1.85);
}
for (const x of [-4.48, 4.48]) for (const z of [-9, -3, 3, 9]) streetLamp(x, z);
for (const z of [-4.48, 4.48]) for (const x of [-10, 0, 10]) streetLamp(x, z);
roundTree(-4.2, 3.4, 1.4); roundTree(4.05, -3.5, 1.65);

// Low fence keeps the moving floor readable, with an open entrance at front.
for (const z of [-4.35, 3.85]) for (let x = -4.6; x < 4.6; x += .6) {
  if (z > 0 && Math.abs(x) < 1.3) continue;
  neighborhood.box('Facade', [.56, .46, .05], [x + .28, .23, z], .006);
  neighborhood.box('Metal', [.035, .62, .035], [x, .31, z], 0);
  stringLights(neighborhood, [x, .53, z + .035], [x + .56, .53, z + .035], .18);
}
for (const x of [-4.62, 4.62]) for (let z = -4.35; z < 3.6; z += .6) {
  neighborhood.box('Facade', [.05, .46, .56], [x, .23, z + .28], .006);
  neighborhood.box('Metal', [.035, .62, .035], [x, .31, z], 0);
  stringLights(neighborhood, [x + .035, .53, z], [x + .035, .53, z + .56], .18);
}
// Simple construction props are authored here; vehicles await an extra pack.
neighborhood.box('Facade', [.85, .78, 1.7], [-3.3, .39, -.45], .015);
neighborhood.box('Accent', [.68, .65, .035], [-3.3, .33, .42], 0);
neighborhood.box('Snow', [.89, .045, 1.74], [-3.3, .805, -.45], .012);
for (let z = -1.2; z < .35; z += .12) neighborhood.box('Ground', [.025, .7, .024], [-2.862, .39, z], 0);
for (const [x, z] of [[2.65, -1.7], [-2.7, 2.95], [3.7, 2.9]]) {
  neighborhood.box('Ground', [.42, .035, .62], [x, .04, z], 0);
  neighborhood.box('Facade', [.4, .36, .5], [x, .23, z], .01);
  for (const dx of [-.16, .16]) neighborhood.box('Ground', [.025, .3, .03], [x + dx, .24, z + .258], 0);
}
for (const [x, z] of [[2.75, -.65], [-2.7, 1.95]]) {
  neighborhood.box('Wood', [.65, .07, .9], [x, .035, z], 0);
  for (let i = 0; i < 4; i++) cylinder(neighborhood, 'Metal', .047, 1.05, [x - .21 + i * .14, .14, z], true);
  for (let i = 0; i < 3; i++) cylinder(neighborhood, 'Metal', .047, 1.05, [x - .14 + i * .14, .22, z], true);
}
// Compact service vans establish scale and carry the Ida blue into the streets.
for (const [x, z, turn] of [[6, .5, 0], [-6, -2, Math.PI], [11, 6, Math.PI / 2]]) {
  const van = builder();
  van.box('Accent', [.83, .42, 1.40], [0, .31, 0], .07);
  van.box('Accent', [.80, .40, .92], [0, .64, -.20], .05);
  van.box('Snow', [.77, .04, .87], [0, .86, -.20], .025);
  van.box('Glass', [.66, .25, .025], [0, .64, .272], .005);
  for (const side of [-1, 1]) {
    van.box('Glass', [.018, .25, .34], [side * .409, .64, .08], .005);
    van.box('Metal', [.055, .012, .09], [side * .427, .43, -.12], 0);
    van.box('Bulb', [.15, .09, .018], [side * .24, .34, .708], .01);
    for (const wheelZ of [-.44, .44]) {
      const tyre = new THREE.CylinderGeometry(.155, .155, .095, 12).toNonIndexed();
      tyre.rotateZ(Math.PI / 2); tyre.translate(side * .422, .15, wheelZ); van.add('Metal', tyre);
      const hub = new THREE.CylinderGeometry(.067, .067, .102, 10).toNonIndexed();
      hub.rotateZ(Math.PI / 2); hub.translate(side * .424, .15, wheelZ); van.add('Facade', hub);
    }
  }
  van.box('Metal', [.71, .08, .04], [0, .19, .72], .015);
  const model = van.finish('ServiceVan'); model.position.set(x, -.12, z); model.rotation.y = turn;
  absorb(neighborhood, model);
}
await save('ida-neighborhood', neighborhood.finish('Neighborhood'));

const shadowShapes = houseShadows.map(({ x, z, height }) => {
  const corners = [[x-1.55,z-1.42],[x+1.55,z-1.42],[x+1.55,z+1.42],[x-1.55,z+1.42]];
  const points = [...corners, ...corners.map(([a,b]) => [a + height*.64,b-height*.57])].sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const hull = [];
  for (const point of points) { while(hull.length>1 && cross(hull.at(-2),hull.at(-1),point)<=0) hull.pop(); hull.push(point); }
  const lower = hull.length;
  for (const point of points.slice(0,-1).reverse()) { while(hull.length>lower && cross(hull.at(-2),hull.at(-1),point)<=0) hull.pop(); hull.push(point); }
  hull.pop();
  return `<polygon points="${hull.map(([a,b])=>`${(a+28).toFixed(3)},${(b+28).toFixed(3)}`).join(' ')}"/>`;
});
await fs.writeFile(path.join(ROOT, 'public/textures/quarter-shadows.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 56 56"><defs><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".11"/></filter></defs><g fill="#686775" opacity=".24" filter="url(#soft)">${shadowShapes.join('')}</g></svg>\n`);
