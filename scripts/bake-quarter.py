# coding: utf-8
"""Bake the existing Kenney quarter with Cycles; no new source models."""
import bpy, math, pathlib, json, os
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/baked'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/raw/ida-neighborhood.glb'))
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
palette = json.loads((ROOT / 'src/scene/scenePalette.json').read_text())
brand = json.loads((ROOT / 'src/app/brand.json').read_text())['colors']
palette.update(Snow=brand['white'], Ground=brand['lightGray'], Accent=brand['blue'], Holiday=brand['white'], Foliage=brand['black'], Light='#fff6e8')
def linear(hex_color):
    srgb = [int(hex_color.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in srgb] + [1]
for obj in objects:
    for material in obj.data.materials:
        role = material.name.replace('Ida', '').split('Material')[0]
        material.use_nodes = True
        nodes = material.node_tree.nodes
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        diffuse = nodes.new('ShaderNodeBsdfDiffuse')
        diffuse.inputs['Color'].default_value = linear(palette[role])
        if obj.data.color_attributes and role not in ('Glass', 'WindowWarm', 'Bulb', 'Light'):
            vertex = nodes.new('ShaderNodeVertexColor')
            vertex.layer_name = obj.data.color_attributes[0].name
            multiply = nodes.new('ShaderNodeMixRGB')
            multiply.blend_type = 'MULTIPLY'
            multiply.inputs[0].default_value = 1
            multiply.inputs[1].default_value = linear(palette[role])
            material.node_tree.links.new(vertex.outputs['Color'], multiply.inputs[2])
            material.node_tree.links.new(multiply.outputs[0], diffuse.inputs['Color'])
        material.node_tree.links.new(diffuse.outputs[0], output.inputs['Surface'])
        if role in ('WindowWarm', 'Bulb', 'Light'):
            emission = nodes.new('ShaderNodeEmission')
            emission.inputs['Color'].default_value = linear(palette[role])
            emission.inputs['Strength'].default_value = .8
            material.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])

bpy.ops.object.select_all(action='DESELECT')
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
quarter = bpy.context.object
quarter.name = 'BakedQuarter'
# Preserve architecture; atlas changes UVs, never mesh silhouettes.
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
for layer in list(quarter.data.uv_layers): quarter.data.uv_layers.remove(layer)
quarter.data.uv_layers.new(name='BakedLight')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=.00001)
bpy.ops.uv.smart_project(angle_limit=math.radians(75), island_margin=.002, area_weight=.4)
bpy.ops.object.mode_set(mode='OBJECT')
quarter.data.uv_layers.active.active_render = True
# Give roofs/facades texel density instead of spending the atlas on 160 m terrain.
uv = quarter.data.uv_layers.active.data
parents = list(range(len(quarter.data.polygons)))
def root(i):
    while parents[i] != i:
        parents[i] = parents[parents[i]]; i = parents[i]
    return i
owners = {}
for face in quarter.data.polygons:
    for loop in face.loop_indices:
        coordinate = tuple(round(c, 6) for c in uv[loop].uv)
        if coordinate in owners: parents[root(face.index)] = root(owners[coordinate])
        else: owners[coordinate] = face.index
islands = {}
for face in quarter.data.polygons: islands.setdefault(root(face.index), []).extend(face.loop_indices)
for loops in islands.values():
    points = [quarter.data.vertices[quarter.data.loops[i].vertex_index].co for i in loops]
    extent = max(max(p[a] for p in points) - min(p[a] for p in points) for a in range(3))
    if extent <= 16: continue
    centre = sum((uv[i].uv for i in loops), Vector((0, 0))) / len(loops)
    for i in loops: uv[i].uv = centre + (uv[i].uv - centre) * (16 / extent)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.uv.pack_islands(rotate=True, margin=.002)
bpy.ops.object.mode_set(mode='OBJECT')
print('UV READY', [a.name for a in quarter.data.color_attributes], flush=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 3
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.73, .73, .78, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
sun_data = bpy.data.lights.new('Winter sun', 'SUN')
sun_data.energy = 1.45
sun_data.angle = math.radians(5)
sun = bpy.data.objects.new('Winter sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = Vector((9, 8, -14)).to_track_quat('-Z', 'Y').to_euler()
if os.environ.get('IDA_BAKE_PREVIEW') == '1':
    camera_data = bpy.data.cameras.new('Preview')
    camera = bpy.data.objects.new('Preview', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (14, -18, 14)
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'; camera_data.ortho_scale = 32
    scene.camera = camera
    scene.render.resolution_x = 640; scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(OUT / 'lighting-preview.png')
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'quarter-source.blend'))
    raise SystemExit(0)
image = bpy.data.images.new('Quarter light', width=4096, height=4096, alpha=False)
for material in quarter.data.materials:
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    material.node_tree.nodes.active = texture
scene.render.bake.margin = 32
scene.render.bake.margin_type = 'EXTEND'
bpy.context.view_layer.objects.active = quarter
bpy.ops.object.bake(type='COMBINED', pass_filter={'DIRECT', 'INDIRECT', 'DIFFUSE', 'EMIT', 'COLOR'}, margin=32, margin_type='EXTEND')
image.filepath_raw = str(OUT / 'quarter-light.png')
image.file_format = 'PNG'
image.save()
image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'quarter-lighting.blend'))
albedo = bpy.data.images.new('Quarter albedo', width=4096, height=4096, alpha=False)
for material in quarter.data.materials:
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = albedo
    material.node_tree.nodes.active = texture
scene.cycles.samples = 1
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=32, margin_type='EXTEND')
albedo.filepath_raw = str(OUT / 'quarter-albedo.png')
albedo.file_format = 'PNG'
albedo.save()

# Runtime uses one unlit material with this atlas, so lights are not applied twice.
quarter.data.materials.clear()
material = bpy.data.materials.new('BakedQuarter')
quarter.data.materials.append(material)
for polygon in quarter.data.polygons: polygon.material_index = 0
for attribute in list(quarter.data.color_attributes): quarter.data.color_attributes.remove(attribute)
bpy.ops.object.select_all(action='DESELECT')
quarter.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'ida-quarter-baked.glb'), export_format='GLB', use_selection=True)
print('BAKE COMPLETE', len(quarter.data.polygons), flush=True)
