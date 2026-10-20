# coding: utf-8
"""Final composition and studio finish. Run once after the refinement pass."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
scene=bpy.context.scene
def rgba(value):
    c=[int(value.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]+[1]
mat=bpy.data.materials['Backdrop • calm winter blue']
p=next(n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')
mix=next(n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeMixRGB')
mix.inputs[1].default_value=rgba('#489deb');mix.inputs[2].default_value=rgba('#82d4f0')
mat.node_tree.links.new(mix.outputs[0],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.55
camera=scene.camera;camera.location=(13,-15,15.2)
camera.rotation_euler=(Vector((0,.1,3.12))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=12.80
for o in scene.objects:
    if o.name.startswith('Fence •'):
        if o.type=='CURVE':
            for s in o.data.splines:
                for point in s.points:point.co.z=.525+(point.co.z-.525)*.84
        else:
            o.location.z=.525+(o.location.z-.525)*.84
            if 'upright' in o.name or 'panel' in o.name:o.scale.z*=.84
    if o.type=='LIGHT' and 'warm room' in o.name:
        o.data.color=rgba('#ffc77b')[:3];o.data.energy=250
    if o.type=='LIGHT' and 'pool on snow' in o.name:o.data.energy=50
scene.render.filepath=str(OUT/'draft-03.png')
text=bpy.data.texts.load(str(ROOT/'scripts/finish-winter-reference.py'));text.name='README • final composition.py'
scene.view_layers[0].update()
result={'preview':scene.render.filepath,'camera':tuple(camera.location)}
