import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt, getBounds, getGLPrimitiveCount } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';

const root='assets/art-direction/winter-runtime';
const out=`${root}/lighting`;
const plan=JSON.parse(await fs.readFile(`${out}/bake-plan.json`,'utf8'));
assert.ok(plan.complete,'Lighting bake has not finished');
const geometry=JSON.parse(await fs.readFile(`${root}/manifest.json`,'utf8'));
assert.equal(createHash('sha256').update(await fs.readFile(geometry.source)).digest('hex'),geometry.sourceSha256);
// WebP reduces download size; its decoded GPU size is reported separately below.
await promisify(execFile)('/Users/god/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',['-c',`
from pathlib import Path
from PIL import Image
import json
p=Path('${out}')
for profile,scale in [('high',1),('mobile',.5)]:
 (p/profile).mkdir(exist_ok=True)
 for job in json.loads((p/'bake-plan.json').read_text())['targets']:
  im=Image.open(p/(job['label']+'-display.png')).convert('RGB')
  assert im.size==(job['size'],job['size'])
  if scale<1:im=im.resize((int(im.width*scale),int(im.height*scale)),Image.Resampling.LANCZOS)
  im.save(p/profile/(job['label']+'.webp'),quality=97,method=6)
`]);
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const reports=[];
for(const profile of ['high','mobile']) {
  const directory=`public/winter/${profile}`;await fs.mkdir(directory,{recursive:true});
  for(const asset of geometry.assets) {
    const baked=asset.file!=='winter-crane.glb';
    const document=await io.read(`${baked?`${out}/raw`:`${root}/raw`}/${asset.file}`);
    const before=getBounds(document.getRoot().getDefaultScene());
    const job=plan.targets.find(j=>asset.nodes.includes(j.root));
    if(baked) {
      assert.ok(job);
      const material=document.getRoot().listMaterials().find(m=>m.getName()===`WinterBaked_${job.label}`);
      assert.ok(material,`${asset.file}: missing baked material`);
      // Blender exports its emission-only shader as PBR emission. Convert that
      // known atlas to the glTF unlit material so browsers skip lighting work.
      const texture=material.getBaseColorTexture()??material.getEmissiveTexture();assert.ok(texture);
      material.setBaseColorTexture(texture).setBaseColorFactor([1,1,1,1]).setEmissiveTexture(null).setEmissiveFactor([0,0,0]);
      material.setExtension('KHR_materials_unlit',document.createExtension(KHRMaterialsUnlit).createUnlit());
      texture.setImage(await fs.readFile(`${out}/${profile}/${job.label}.webp`)).setMimeType('image/webp').setURI(`${job.label}.webp`);
      document.createExtension(EXTTextureWebP).setRequired(true);
      const uv=document.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>p.getMaterial()===material);
      assert.equal(uv.length,1,'Baked atlas should need only one draw primitive');
      assert.ok(uv[0].getAttribute('TEXCOORD_0'));
    }
    await document.transform(weld(),dedup(),prune({keepLeaves:true,keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeTexcoord:16}));
    const path=`${directory}/${asset.file}`;await io.write(path,document);
    const bytes=await fs.readFile(path),loaded=await io.readBinary(bytes);
    const bounds=getBounds(loaded.getRoot().getDefaultScene());
    for(const side of ['min','max']) for(let i=0;i<3;i++) {
      assert.ok(Math.abs(bounds[side][i]-before[side][i])<.002,`${asset.file}: quantization changed shape`);
      assert.ok(Math.abs(bounds[side][i]-asset.bounds[side][i])<.002,`${asset.file}: pivot/shape changed during bake`);
    }
    assert.equal(loaded.getRoot().listScenes().length,1);
    assert.deepEqual(loaded.getRoot().getDefaultScene().listChildren().map(n=>n.getName()).sort(),[...asset.nodes].sort());
    const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:asset.file,maxIssues:60});
    assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
    const primitives=loaded.getRoot().listMeshes().flatMap(m=>m.listPrimitives());
    const record={profile,file:asset.file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
      triangles:primitives.reduce((sum,p)=>sum+getGLPrimitiveCount(p),0),primitives:primitives.length,
      atlasSize:job?job.size*(profile==='mobile'?.5:1):0,
      validation:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,messages:validation.issues.messages}};
    reports.push(record);console.log(profile,asset.file,record.bytes,'bytes;',record.primitives,'primitives');
  }
}
const audit=JSON.parse(await fs.readFile(`${root}/source-audit.json`,'utf8')).objects;
const colors={'amber':'#ffb141','ruby':'#ff4539','ice':'#26ceff','leaf':'#46e688'};
const glow={site:[],floor:[]};
for(const obj of audit) {
  if(obj.hidden||obj.type!=='MESH')continue;
  const bulb=obj.materials?.find(m=>m.startsWith('Garland •'));
  const lamp=obj.materials?.some(m=>m.startsWith('Lantern • warm source'));
  if(!bulb&&!lamp)continue;
  if(obj.name.startsWith('Floor ')&&!obj.name.startsWith('Floor 01 •'))continue;
  const floor=obj.name.startsWith('Floor 01 •');
  const origin=floor?[.72,.28,.55+geometry.floor.height/2]:geometry.sourceOrigin;
  const [x,y,z]=obj.position.map((v,i)=>v-origin[i]);
  const color=bulb?colors[bulb.split(' • ')[1].replace(/\.\d+$/,'')]:'#ffb45d';assert.ok(color);
  glow[floor?'floor':'site'].push({position:[x,z,-y],color,radius:lamp?.22:.10});
}
const summaries=Object.fromEntries(['high','mobile'].map(profile=>[profile,{
  bytes:reports.filter(r=>r.profile===profile).reduce((s,r)=>s+r.bytes,0),
  atlasGpuBytesWithMipmaps:plan.targets.reduce((s,j)=>s+(j.size*(profile==='mobile'?.5:1))**2*4*4/3,0),
}]));
const manifest={stage:2,lightingBaked:true,geometry,glow,profiles:summaries,
  materialRules:{bakedPrefix:'WinterBaked_',bakedToneMapped:false,glass:{opacity:.075,roughness:.12,depthWrite:false,transmission:0},emissionScale:.55,haloOpacity:.20},
  lightingPolicy:'Fixed foundation shadows in site atlas; only module self lighting in repeated floor atlases. No moving-floor silhouettes baked into the site.',
  camera:geometry.camera,checked:true};
await fs.writeFile('public/winter/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(`${out}/validation.json`,JSON.stringify({complete:true,sourceUnchanged:true,checksPassed:true,profiles:summaries,assets:reports},null,2)+'\n');
console.log('Lighting profiles:',JSON.stringify(summaries));
