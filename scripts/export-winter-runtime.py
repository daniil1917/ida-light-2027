# coding: utf-8
"""Step 1: reusable browser geometry from the approved Blender master.

Run via Blender MCP's background-file tool. Never saves over the source file.
Lighting/texture baking is a separate pass; these are geometry-stage assets.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT = ROOT / 'assets/art-direction/winter-runtime'
RAW = OUT / 'raw'
RAW.mkdir(parents=True, exist_ok=True)
source = bpy.context.scene
assert source.name == 'Ida Lite • Winter construction'
assert source.get('detail_revision') == 2
source_path = Path(bpy.data.filepath)
source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
source_objects = list(source.objects)
visible = [o for o in source_objects if o.type in {'MESH', 'CURVE'} and not o.hide_render]
assert not any(o.name.startswith('Fir • rear left') for o in visible)
lamp_roots = [o for o in source_objects if o.name.startswith('Lantern assembly')]
assert len(lamp_roots) == 6
ORIGIN = Vector((.72, .28, .55))
FLOOR_PITCH = 1.35  # Structural cornice bottom .55 to upper fascia top 1.90.

def yup(point):
    return [round(point[0], 6), round(point[2], 6), round(-point[1], 6)]

camera_matrix = Matrix.Rotation(-math.pi / 2, 4, 'X') @ source.camera.matrix_world
camera_matrix.translation = Vector(yup(source.camera.matrix_world.translation - ORIGIN))
source_camera = {'matrix': [v for column in zip(*camera_matrix) for v in column],
                 'orthoScale': source.camera.data.ortho_scale}

# Adapt only copies. A reduced subdivision grid still retains the snow displacement.
material_copies = {}
def runtime_material(material):
    if material not in material_copies:
        m = material.copy()
        m.name = 'WinterRuntime • ' + material.name
        p = next(n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
        for socket in ('Base Color', 'Normal', 'Emission Color'):
            for link in list(p.inputs[socket].links): m.node_tree.links.remove(link)
        p.inputs['Subsurface Weight'].default_value = 0
        p.inputs['Sheen Weight'].default_value = 0
        material_copies[material] = m
    return material_copies[material]

runtime = bpy.data.scenes.new('Ida Lite • Runtime preparation')
runtime.unit_settings.system = 'METRIC'
work = bpy.data.collections.new('Winter • prepared modules')
runtime.collection.children.link(work)
assets = []
prepared = []

def copy_mesh(obj, origin, depsgraph, chord_height=None):
    # Evaluate in the source scene, including weighted normals and existing bevels.
    saved = []
    for mod in obj.modifiers:
        if mod.type == 'SUBSURF' and 'snow roof' in obj.name:
            saved.append((mod, mod.levels)); mod.levels = min(mod.levels, 2)
        elif mod.type == 'SUBSURF' and obj.name == 'Site cabin • roof snow':
            saved.append((mod, mod.levels)); mod.levels = min(mod.levels, 2)
    if saved: source.view_layers[0].update()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    for mod, level in saved: mod.levels = level
    if saved: source.view_layers[0].update()
    clone = bpy.data.objects.new('Prepared • ' + obj.name, mesh)
    work.objects.link(clone)
    clone.matrix_world = Matrix.Translation(-origin) @ obj.matrix_world
    for i, material in enumerate(mesh.materials): mesh.materials[i] = runtime_material(material)
    if chord_height is not None:
        # Continuous source chords become one reusable .68m mast section.
        zmin = min(v.co.z for v in mesh.vertices)
        zmax = max(v.co.z for v in mesh.vertices)
        for v in mesh.vertices: v.co.z = (v.co.z - zmin) * chord_height / (zmax - zmin)
        clone.location.z = 0
    mesh.calc_loop_triangles()
    ratio = 1
    if obj.name == 'Snowfield • continuous rounded banks': ratio = .22
    elif any(s in obj.name for s in ('foliage', 'berries', 'bauble', 'twinkle', 'bulb', 'snow crest')): ratio = .40
    elif 'Fir •' in obj.name and any(s in obj.name for s in ('needles', 'fresh piled snow')): ratio = .55
    clone['density'] = ratio
    return clone

def merge_by_material(objects, parent, density_pass=False):
    groups = {}
    for obj in objects:
        assert len(obj.data.materials) == 1, obj.name
        key = (obj.data.materials[0], obj.get('density', 1) if density_pass else 1)
        groups.setdefault(key, []).append(obj)
    merged = []
    for (material, ratio), members in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in members: obj.select_set(True)
        bpy.context.view_layer.objects.active = members[0]
        if len(members) > 1: bpy.ops.object.join()
        obj = bpy.context.object
        # Bake the joined object's transform into its geometry; every part shares its pivot.
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if ratio < 1:
            dec = obj.modifiers.new('Runtime density', 'DECIMATE'); dec.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=dec.name)
        obj.name = parent.name + ' • ' + material.name.replace('WinterRuntime • ', '')
        obj.parent = parent
        obj.data.calc_loop_triangles()
        merged.append(obj)
    return merged

def node(name, objects, origin, chord=False):
    root = bpy.data.objects.new(name, None); work.objects.link(root)
    bpy.context.window.scene = source
    source.view_layers[0].update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    copies = [copy_mesh(o, origin, depsgraph, .68 if chord and 'mast chord' in o.name else None) for o in objects]
    bpy.context.window.scene = runtime
    # Batch density groups; switching scenes/applying modifiers per bulb is slow.
    density_groups = merge_by_material(copies, root, density_pass=True)
    prepared.extend(merge_by_material(density_groups, root))
    root['role'] = name
    return root

def bounds(objects):
    points = [o.matrix_world @ Vector(p) for o in objects for p in o.bound_box]
    assert points
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    return {'min': yup((lo[0], hi[1], lo[2])), 'max': yup((hi[0], lo[1], hi[2]))}

def export(name, roots):
    bpy.ops.object.select_all(action='DESELECT')
    objects = []
    for root in roots:
        root.select_set(True)
        for obj in root.children_recursive:
            obj.select_set(True)
            if obj.type == 'MESH': objects.append(obj)
    file = RAW / (name + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(file), export_format='GLB', use_selection=True, use_active_scene=True,
        export_animations=False, export_cameras=False, export_lights=False,
        export_yup=True, export_extras=True, export_materials='EXPORT')
    assets.append({'file': file.name, 'nodes': [r.name for r in roots],
        'meshes': len(objects), 'triangles': sum(len(o.data.loop_triangles) for o in objects),
        'bounds': bounds(objects), 'bytes': file.stat().st_size})

floor_objects = [o for o in visible if o.name.startswith('Floor 01 •')]
floor_origin = Vector((.72, .28, .55 + FLOOR_PITCH / 2))
roof = [o for o in floor_objects if 'snow roof pillow' in o.name]
wreath = [o for o in floor_objects if 'front wreath' in o.name or 'wreath backing' in o.name]
body = [o for o in floor_objects if o not in roof and o not in wreath]
assert len(roof) == 1 and len(wreath) == 32
export('winter-floor', [node('FloorBody', body, floor_origin)])
export('winter-snow-cap', [node('SnowCap', roof, floor_origin)])
export('winter-wreath', [node('Wreath', wreath, floor_origin)])

environment = [o for o in visible if not o.name.startswith(('Floor ', 'Crane •', 'Studio •'))]
export('winter-site', [node('Site', environment, ORIGIN)])

crane = [o for o in visible if o.name.startswith('Crane •')]
foot = [o for o in crane if 'footing' in o.name]
mast = [o for o in crane if any(s in o.name for s in ('mast chord', 'mast crossbar', 'mast diagonal', 'side crossbar', 'side diagonal'))]
first_mast = [o for o in mast if 'mast chord' in o.name or o.matrix_world.translation.z < 1.1]
moving = [o for o in crane if any(s in o.name for s in ('trolley', 'steel hoist', 'module spreader'))]
sections = [[o for o in crane if o.name in [f'Crane • telescopic section {i}', f'Crane • jib top rail {i}', f'Crane • telescopic sleeve {i}'] or (i==1 and 'luminous blue strip' in o.name) or (i==3 and o.name in ['Crane • jib end cap','Crane • end recess'])] for i in (1,2,3)]
fixed = [o for o in crane if o not in foot + mast + moving + sum(sections, [])]
assert len(first_mast) == 12 and len(moving) == 3 and all(sections)
crane_roots = [node('Foot', foot, ORIGIN), node('MastSection', first_mast, Vector((-2.38,1.38,.53)), True),
               node('Boom', fixed, Vector((-2.38,1.38,6.92)))]
rail_starts = [-2.88, -.85, 1.5]
for i, (objects, x) in enumerate(zip(sections, rail_starts)):
    crane_roots.append(node(f'Rail_{i}', objects, Vector((x,.28,6.92))))
for label in ('trolley', 'steel hoist', 'module spreader'):
    obj = next(o for o in moving if label in o.name)
    crane_roots.append(node({'trolley':'Trolley','steel hoist':'Hoist','module spreader':'Spreader'}[label], [obj], obj.matrix_world.translation.copy()))
export('winter-crane', crane_roots)

source_lights = [{'name':o.name, 'position':yup(o.matrix_world.translation - ORIGIN),
    'energy':o.data.energy, 'color':list(o.data.color), 'type':o.data.type} for o in source_objects if o.type=='LIGHT']
manifest = {'stage':'geometry-preparation', 'lightingBaked':False, 'source':str(source_path),
    'sourceSha256':source_hash, 'sourceDetailRevision':2, 'coordinates':'glTF Y-up; 1 unit = 1 metre',
    'sourceOrigin':list(ORIGIN), 'camera':source_camera, 'floor':{
        'pivot':'centre of structural collider', 'width':3.72, 'depth':3.22, 'height':FLOOR_PITCH,
        'supportFootprint':[3.68,3.18],
        'bottom':-FLOOR_PITCH/2, 'top':FLOOR_PITCH/2,
        'snowCapPolicy':'Separate visual geometry; do not use snow as the physics support surface.',
        'sourcePoses':[[0,.675,0],[0,1.975,0],[1.05,4.155,-.15]],
        'gameDimensionsUnchanged':[3,2.65,.82]},
    'crane':{'mastSectionHeight':.68, 'mastAnchor':yup(Vector((-2.38,1.38,.53))-ORIGIN),
        'boomAnchor':yup(Vector((-2.38,1.38,6.92))-ORIGIN),
        'railStarts':[-2.88,-.85,1.5], 'railLengths':[2.03,2.35,2.10],
        'railAttachmentOffset':yup(Vector((0,-1.10,0))),
        'hangingSourcePosition':yup(Vector((1.77,.43,0))-Vector((.72,.28,0)))},
    'lanternStations':[yup(o.matrix_world.translation-ORIGIN) for o in lamp_roots],
    'sourceLights':source_lights, 'assets':assets,
    'checks':{'lanterns':6,'removedTreeRemaining':0,'bowLoops':sum('folded bow loop' in o.name for o in wreath),
        'noLightsOrCameraInGeometry':True,'hiddenSourceMeshesExcluded':True,'sourceNotOverwritten':True}}
runtime['stage']='Geometry preparation; lighting not baked. Not the production game scene.'
runtime['source_master']=str(source_path)
runtime['floor_pitch']=FLOOR_PITCH
text=bpy.data.texts.load(str(ROOT/'scripts/export-winter-runtime.py'))
text.name='README • runtime export.py'
bpy.context.window.scene=runtime
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-runtime-prepared.blend'))
assert hashlib.sha256(source_path.read_bytes()).hexdigest()==source_hash
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
result={'assets':assets,'source_unchanged':True,'prepared_blend':str(OUT/'winter-runtime-prepared.blend')}
