# coding: utf-8
"""Round-trip the exported modules into a separate, reviewable Blender scene.

This renders a geometry check with the original studio lights. It is not a
preview of browser lighting; no baked light textures are included yet.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-runtime'
manifest=json.loads((OUT/'manifest.json').read_text())
source=bpy.context.scene
assert source.name=='Ida Lite • Winter construction'
origin=Vector(manifest['sourceOrigin'])
scene=bpy.data.scenes.new('Ida Lite • Export assembly check')
bpy.context.window.scene=scene
scene.world=source.world
roots={}
for asset in manifest['assets']:
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/'raw'/asset['file']))
    imported=set(scene.objects)-before
    assert all(o.type not in {'LIGHT','CAMERA'} for o in imported)
    for name in asset['nodes']:
        root=next(o for o in imported if o.name==name)
        roots[name]=root

def duplicate(root,label):
    def copy(obj,parent=None):
        new=obj.copy();scene.collection.objects.link(new)
        new.parent=parent;new.matrix_local=obj.matrix_local.copy()
        for child in obj.children:copy(child,new)
        return new
    new=copy(root);new.name=label
    return new

poses=[Vector((x,-z,y)) for x,y,z in manifest['floor']['sourcePoses']]
for name in ('FloorBody','SnowCap'):
    instances=[roots[name]]+[duplicate(roots[name],f'{name} • floor {i}') for i in (2,3)]
    for obj,pose in zip(instances,poses):obj.location=pose
roots['Wreath'].location=poses[0]
duplicate(roots['Wreath'],'Wreath • suspended floor').location=poses[2]

mast_anchor=Vector((-2.38,1.38,.53))-origin
mast_instances=[roots['MastSection']]+[duplicate(roots['MastSection'],f'Mast • section {i}') for i in range(1,11)]
for i,obj in enumerate(mast_instances):
    obj.location=mast_anchor+Vector((0,0,i*.68))
    obj.scale.z=min(.68,6.99-i*.68)/.68
roots['Boom'].location=Vector((-2.38,1.38,6.92))-origin
for i,x in enumerate(manifest['crane']['railStarts']):roots[f'Rail_{i}'].location=Vector((x,.28,6.92))-origin
audit=json.loads((OUT/'source-audit.json').read_text())['objects']
for label,source_name in [('Trolley','Crane • trolley'),('Hoist','Crane • steel hoist'),('Spreader','Crane • module spreader')]:
    position=next(o['position'] for o in audit if o['name']==source_name)
    roots[label].location=Vector(position)-origin

for obj in source.objects:
    if obj.type!='LIGHT' and obj.name!='Studio • seamless blue ground':continue
    new=obj.copy();scene.collection.objects.link(new);new.parent=None
    new.matrix_world=Matrix.Translation(-origin) @ obj.matrix_world
camera=source.camera.copy();scene.collection.objects.link(camera);camera.parent=None
camera.matrix_world=Matrix.Translation(-origin) @ source.camera.matrix_world
scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.device='CPU'
scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.cycles.max_bounces=6
scene.cycles.transmission_bounces=6;scene.cycles.transparent_max_bounces=6
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8';scene.render.filepath=str(OUT/'geometry-check.png')
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene['stage']='Geometry round-trip check; original offline lighting, not browser quality.'
source_file=OUT/'winter-export-review.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source_file))
bpy.ops.render.render(write_still=True)
result={'review_blend':str(source_file),'preview':scene.render.filepath,'objects':len(scene.objects),'round_trip_imported_assets':len(manifest['assets'])}
