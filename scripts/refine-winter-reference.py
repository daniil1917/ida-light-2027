# coding: utf-8
"""Art direction pass on the scene created by build-winter-reference.py.
Run once in Blender through MCP. Source snow shapes remain hidden and editable.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
scene=bpy.context.scene
assert scene.name.startswith('Ida • Winter reference'), scene.name

def rgba(value):
    c=[int(value.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]+[1]

def principled(material):
    return next(n for n in material.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')

def recolor(name,color,emission=None):
    material=bpy.data.materials[name];p=principled(material)
    material.diffuse_color=rgba(color);p.inputs['Base Color'].default_value=rgba(color)
    if emission is not None:
        p.inputs['Emission Color'].default_value=rgba(color)
        p.inputs['Emission Strength'].default_value=emission

recolor('Crane • satin periwinkle steel','#5969ba')
recolor('Crane • structural blue','#45539c')
recolor('Crane • cyan running light','#35d8ff',2.0)
recolor('Lantern • warm source','#ffbd71',4.0)
recolor('Interiors • warm plaster','#f1c795')
recolor('Interiors • warm ash','#d3a16a')
recolor('Windows • clear thin glass','#ffffff')
for name,color in [('amber','#ffb141'),('ruby','#ff4539'),('ice','#26ceff'),('leaf','#46e688')]:
    recolor('Garland • '+name,color,2.8)

for o in scene.objects:
    if o.type=='LIGHT':
        if 'warm room' in o.name:
            o.data.energy=220;o.data.color=rgba('#ffb668')[:3]
        elif 'pool on snow' in o.name:
            o.data.energy=30;o.data.color=rgba('#ffb565')[:3]
        elif o.name=='Studio • broad cool key':o.data.energy=950
        elif o.name=='Studio • cyan fill':o.data.energy=850
        elif o.name=='Studio • frosty rim':o.data.energy=1100
next(n for n in scene.world.node_tree.nodes if n.bl_idname=='ShaderNodeBackground').inputs['Strength'].default_value=.22

# A physical blue studio surface with a broad color gradient, not an image plane.
material=bpy.data.materials['Backdrop • calm winter blue'];nodes=material.node_tree.nodes;links=material.node_tree.links
position=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ');mapping=nodes.new('ShaderNodeMapRange')
mapping.inputs['From Min'].default_value=-9;mapping.inputs['From Max'].default_value=9
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[1].default_value=rgba('#378ce3');mix.inputs[2].default_value=rgba('#79cee8')
links.new(position.outputs['Position'],separate.inputs[0]);links.new(separate.outputs['X'],mapping.inputs['Value'])
links.new(mapping.outputs[0],mix.inputs[0]);links.new(mix.outputs[0],principled(material).inputs['Base Color'])

# Integrate subtle roof undulations into the pillow instead of layering flat disks.
snow=next(m for m in bpy.data.materials if m.name.startswith('Snow • soft') and m.users>0)
for o in list(scene.objects):
    if 'roof powder swell' in o.name or 'uneven roof drift' in o.name:
        o.hide_render=True;o.hide_set(True)
    if 'snow roof pillow' in o.name or o.name=='Site cabin • roof snow':
        sub=o.modifiers.new('Fine grid for natural snow','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=4;sub.render_levels=5
        texture=bpy.data.textures.new(o.name+' • broad powder','CLOUDS');texture.noise_scale=.55;texture.noise_depth=1
        displacement=o.modifiers.new('Gentle fresh powder','DISPLACE');displacement.texture=texture;displacement.strength=.040;displacement.mid_level=.5;displacement.texture_coords='GLOBAL'

# Continuous soft snowbanks: retain all original primitives as hidden sources.
source=[o for o in scene.objects if o.type=='MESH' and (o.name.startswith('Powder •') or 'foundation snowbank' in o.name or o.name in ('Island • fresh snow blanket','Entry • bridge snow'))]
for o in source:
    if 'soft drift' in o.name:o.scale.z*=1.7
    elif 'undulating ground' in o.name:o.scale.z*=1.5
scene.view_layers[0].update();depsgraph=bpy.context.evaluated_depsgraph_get()
vertices=[];faces=[]
for o in source:
    evaluated=o.evaluated_get(depsgraph);mesh=evaluated.to_mesh();start=len(vertices)
    vertices.extend(tuple(o.matrix_world @ v.co) for v in mesh.vertices)
    faces.extend(tuple(start+i for i in p.vertices) for p in mesh.polygons)
    evaluated.to_mesh_clear();o.hide_render=True;o.hide_set(True)
mesh=bpy.data.meshes.new('Snowfield • source union');mesh.from_pydata(vertices,[],faces);mesh.materials.append(snow)
snowfield=bpy.data.objects.new('Snowfield • continuous rounded banks',mesh);source[0].users_collection[0].objects.link(snowfield)
remesh=snowfield.modifiers.new('Union powder drifts','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.045;remesh.use_smooth_shade=True
smooth=snowfield.modifiers.new('Relax the powder surface','SMOOTH');smooth.factor=1.0;smooth.iterations=5

# Broaden each fir and give the snow tier a softly domed silhouette.
trees=[('Fir • rear left',-3.56,1.50,.91),('Fir • rear center',-1.24,2.74,.87),('Fir • right',3.41,1.94,1.10),('Fir • front right',3.01,-2.21,.73)]
for prefix,x,y,size in trees:
    for o in scene.objects:
        if not o.name.startswith(prefix) or o.type=='LIGHT':continue
        if o.type=='MESH' and ('needles' in o.name or 'fresh piled snow' in o.name):
            for j in range(14):
                t=j/13
                # Widen upper shoulders; keep the existing scalloped hem and smooth tip.
                profile=1.15*(1+.34*math.sin(math.pi*t))
                for k in range(48):
                    v=o.data.vertices[j*48+k];v.co.x=x+(v.co.x-x)*profile;v.co.y=y+(v.co.y-y)*profile
        elif 'soft snow tip' in o.name:
            o.scale=(.16*size,.16*size,.17*size);o.location.z-=.06*size
        elif o.type=='MESH' and any(label in o.name for label in ('twinkle','glass bauble')):
            o.location.x=x+(o.location.x-x)*1.15;o.location.y=y+(o.location.y-y)*1.15
        elif o.type=='CURVE':
            for spline in o.data.splines:
                for p in spline.points:p.co.x=x+(p.co.x-x)*1.15;p.co.y=y+(p.co.y-y)*1.15

# The hanger touches the snow surface without penetrating the roof.
spreader=scene.objects['Crane • module spreader'];spreader.location.z=5.605
hoist=scene.objects['Crane • steel hoist'];hoist.location.z+=.0675
hoist.scale.z=(6.63-5.605)/(6.63-5.47)
camera=scene.camera;camera.location=(13,-15,12.6)
camera.rotation_euler=(Vector((0,.1,3.25))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=12.85
glare=next(n for n in scene.compositing_node_group.nodes if n.bl_idname=='CompositorNodeGlare')
glare.inputs['Threshold'].default_value=.95;glare.inputs['Strength'].default_value=.25
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.cycles.samples=48;scene.cycles.adaptive_threshold=.04
scene.render.image_settings.color_depth='8';scene.render.filepath=str(OUT/'draft-02.png')
text=bpy.data.texts.load(str(ROOT/'scripts/refine-winter-reference.py'));text.name='README • art direction refinement.py'
scene.view_layers[0].update()
result={'scene':scene.name,'objects':len(scene.objects),'preview':scene.render.filepath,'snow_sources_preserved':len(source)}
