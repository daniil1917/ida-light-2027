# coding: utf-8
"""Prepare independent atlas UVs and bake targets on the verified export copy."""
import bpy, math, json, hashlib
from pathlib import Path

ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-runtime/lighting'
OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
assert scene.name=='Ida Lite • Export assembly check'
geometry=json.loads((OUT.parent/'manifest.json').read_text())
assert hashlib.sha256(Path(geometry['source']).read_bytes()).hexdigest()==geometry['sourceSha256']
targets=[]
for label,root_name,size in [('site','Site',4096),('floor','FloorBody',2048),('snow','SnowCap',1024),('wreath','Wreath',1024)]:
    root=scene.objects[root_name]
    objects=[o for o in root.children_recursive if o.type=='MESH' and not any(s in o.name for s in ('Garland •','Lantern • warm source','Windows •'))]
    assert objects
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.data=obj.data.copy();obj.select_set(True)
        # Bake nodes/images belong only to this target, even for shared colours.
        for i,material in enumerate(obj.data.materials):obj.data.materials[i]=material.copy()
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    target=bpy.context.object;target.name='Baked_'+label
    for uv in list(target.data.uv_layers):target.data.uv_layers.remove(uv)
    target.data.uv_layers.new(name='LightingAtlas')
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.002,area_weight=.5,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new('Winter • '+label+' • radiance',width=size,height=size,alpha=False,float_buffer=True)
    for material in target.data.materials:
        tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        material.node_tree.nodes.active=tex
    target.data.calc_loop_triangles()
    targets.append({'label':label,'root':root_name,'object':target.name,'image':image.name,'size':size,
                    'triangles':len(target.data.loop_triangles),'materials':len(target.data.materials)})
    print('UV prepared:',label,size,len(target.data.polygons),flush=True)
scene.cycles.device='GPU';scene.cycles.samples=32;scene.cycles.max_bounces=8
scene.cycles.transmission_bounces=6;scene.cycles.transparent_max_bounces=6
scene.render.bake.margin=12;scene.render.bake.margin_type='EXTEND'
scene['stage']='Lighting atlas preparation; not yet baked.'
plan={'stage':2,'complete':False,'targets':targets,'sourceSha256':geometry['sourceSha256'],
      'colorManagement':{'view':'AgX','look':'AgX - Medium High Contrast','runtimeToneMapping':'disabled on baked atlas materials'},
      'samples':32,'fixedFoundationOnlyInSiteBake':True,'movingFloorsCastNoFrozenShadows':True}
(OUT/'bake-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-lighting-source.blend'))
result={'targets':targets,'prepared':True,'file':str(OUT/'winter-lighting-source.blend')}
