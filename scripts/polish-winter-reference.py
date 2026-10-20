# coding: utf-8
"""Reference staging: offset hanging floor, warmer practical light, soft bloom."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
scene=bpy.context.scene
scene.objects['Floor 03 • module root'].location=(1.05,.15,0)
for name in ('Crane • trolley','Crane • steel hoist','Crane • module spreader'):
    scene.objects[name].location.x+=1.05;scene.objects[name].location.y+=.15
def rgba(value):
    c=[int(value.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]+[1]
mat=bpy.data.materials['Lantern • warm source']
p=next(n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')
p.inputs['Emission Color'].default_value=rgba('#ffb45d');p.inputs['Emission Strength'].default_value=12
for mat in bpy.data.materials:
    if mat.name.startswith('Garland •'):
        p=next(n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')
        p.inputs['Emission Strength'].default_value=6
for o in scene.objects:
    if o.type=='MESH' and 'Garland •' in (o.active_material.name if o.active_material else ''):
        if any(name in o.name for name in ('bulb','twinkle')):o.scale*=1.18
data=bpy.data.lights.new('House • warm spill under suspended floor','AREA')
data.energy=90;data.color=rgba('#ffb46d')[:3];data.shape='DISK';data.size=2.0
light=bpy.data.objects.new(data.name,data)
scene.objects['Floor 03 • module root'].users_collection[0].objects.link(light)
light.location=(1.37,.38,3.94);light.rotation_euler=(Vector((.9,.2,3.27))-light.location).to_track_quat('-Z','Y').to_euler()
glare=next(n for n in scene.compositing_node_group.nodes if n.bl_idname=='CompositorNodeGlare')
glare.inputs['Threshold'].default_value=2.5;glare.inputs['Strength'].default_value=.65;glare.inputs['Size'].default_value=.22
scene.render.filepath=str(OUT/'draft-04.png')
text=bpy.data.texts.load(str(ROOT/'scripts/polish-winter-reference.py'));text.name='README • practical light and staging.py'
scene.view_layers[0].update()
result={'preview':scene.render.filepath,'objects':len(scene.objects),'lights':sum(o.type=='LIGHT' for o in scene.objects)}
