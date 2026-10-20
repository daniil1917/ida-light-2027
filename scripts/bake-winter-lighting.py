# coding: utf-8
"""Bake approved colours/lighting, export texture-driven browser materials.

Run in background Blender against winter-lighting-source.blend. The detailed
master and geometry preparation remain unchanged. Stage 2, not game migration.
"""
import bpy, json, time, hashlib
from pathlib import Path

ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-runtime/lighting'
RAW=OUT/'raw';RAW.mkdir(exist_ok=True)
scene=bpy.context.scene
plan=json.loads((OUT/'bake-plan.json').read_text())
assert scene.name=='Ida Lite • Export assembly check'
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='METAL';prefs.refresh_devices()
for device in prefs.devices:device.use=device.type=='METAL'
assert any(d.use and d.type=='METAL' for d in prefs.devices),'Metal GPU unavailable'
scene.cycles.device='GPU';scene.render.engine='CYCLES'
initial_visibility={o:o.hide_render for o in scene.objects}
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
started=time.time();records=[]
def children(root_name):
    root=scene.objects[root_name]
    return {root,*root.children_recursive}
module=children('FloorBody')|children('SnowCap')|children('Wreath')
site=children('Site')
for job in plan['targets']:
    # Only the permanent foundation contributes shadows to the static site.
    allowed=site|module if job['label']=='site' else module
    for o in scene.objects:
        if o.type=='MESH':o.hide_render=o not in allowed and not o.name.startswith('Studio • seamless')
        if o.type=='LIGHT':
            o.hide_render=not (o.name.startswith('Studio •') or
                (job['label']=='site' and ('Lantern • pool' in o.name or 'Fir •' in o.name)) or
                o.name.startswith('Floor 01 • warm room'))
    # The generic floor has no wreath silhouette painted into its glazing/frame.
    if job['label']=='floor':
        for o in children('Wreath'):o.hide_render=True
    target=scene.objects[job['object']];target.hide_render=False
    bpy.ops.object.select_all(action='DESELECT');target.select_set(True)
    bpy.context.view_layer.objects.active=target
    image=bpy.data.images[job['image']]
    for material in target.data.materials:
        node=next(n for n in material.node_tree.nodes if n.bl_idname=='ShaderNodeTexImage' and n.image==image)
        material.node_tree.nodes.active=node
    scene.view_layers[0].update()
    print('BAKE START',job['label'],job['size'],flush=True)
    tick=time.time()
    bpy.ops.object.bake(type='COMBINED',pass_filter={'DIRECT','INDIRECT','DIFFUSE','EMIT','COLOR'},
                        margin=12,margin_type='EXTEND',uv_layer='LightingAtlas')
    # Preserve HDR offline. Display atlas applies AgX once, not again in Three.js.
    scene.render.image_settings.file_format='OPEN_EXR';scene.render.image_settings.color_depth='32'
    image.save_render(str(OUT/(job['label']+'-radiance.exr')),scene=scene)
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_depth='16'
    scene.render.image_settings.color_mode='RGB'
    path=OUT/(job['label']+'-display.png');image.save_render(str(path),scene=scene)
    record={**job,'seconds':round(time.time()-tick,2),'display':path.name,
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if job['label']=='site':
        # Separate albedo identifies snow, never guessing from the lit RGB value.
        albedo=bpy.data.images.new('Site albedo mask',width=job['size'],height=job['size'],alpha=True)
        for material in target.data.materials:
            node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=albedo
            material.node_tree.nodes.active=node
        scene.cycles.samples=1
        bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=12,margin_type='EXTEND',uv_layer='LightingAtlas')
        albedo.filepath_raw=str(OUT/'site-albedo-mask.png');albedo.file_format='PNG';albedo.save()
        scene.cycles.samples=plan['samples']
    records.append(record)
    print('BAKE DONE',job['label'],record['seconds'],flush=True)
    (OUT/'bake-progress.json').write_text(json.dumps({'complete':False,'finished':records},ensure_ascii=False,indent=2)+'\n')

for obj,hidden in initial_visibility.items():obj.hide_render=hidden
# Restore visibility before saving the complete review assembly.
for job in plan['targets']:
    target=scene.objects[job['object']]
    image=bpy.data.images.load(str(OUT/(job['label']+'-display.png')),check_existing=True)
    image.colorspace_settings.name='sRGB';image.pack()
    material=bpy.data.materials.new('WinterBaked_'+job['label']);material.use_nodes=True
    nodes=material.node_tree.nodes;nodes.clear()
    texture=nodes.new('ShaderNodeTexImage');texture.image=image
    emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
    output=nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(texture.outputs['Color'],emission.inputs['Color'])
    material.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
    target.data.materials.clear();target.data.materials.append(material)
    for polygon in target.data.polygons:polygon.material_index=0
    target['lighting_baked']=True;target['runtime_tone_mapped']=False
    root=scene.objects[job['root']];pose=root.location.copy();root.location=(0,0,0)
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for obj in root.children_recursive:obj.select_set(True)
    # Only selected roots of the active scene; no unrelated default Blender scenes.
    bpy.ops.export_scene.gltf(filepath=str(RAW/('winter-'+{'floor':'floor','snow':'snow-cap','site':'site','wreath':'wreath'}[job['label']]+'.glb')),
        export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,
        export_cameras=False,export_lights=False,export_extras=True)
    root.location=pose
scene['stage']='Baked browser atlas materials; runtime tone mapping must be disabled for WinterBaked materials.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-lighting-baked.blend'))
plan.update(complete=True,results=records,durationSeconds=round(time.time()-started,2),
            gpu=[d.name for d in prefs.devices if d.use],texturesHaveAgXApplied=True)
(OUT/'bake-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
(OUT/'bake-progress.json').write_text(json.dumps({'complete':True,'finished':records},ensure_ascii=False,indent=2)+'\n')
print('ALL LIGHTING BAKED',plan['durationSeconds'],flush=True)
