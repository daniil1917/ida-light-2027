# coding: utf-8
"""Requested revision: fabric bows, corner lanterns, removal of the cabin tree.
Run in the connected Blender after build/refine/finish/polish, before rendering.
"""
import bpy, math, ast, json
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
scene=bpy.context.scene
assert scene.name.startswith('Ida'),scene.name
assert scene.get('detail_revision',0)<2,'Detail revision is already applied; use a fresh build to replay it.'
assert not bpy.app.is_job_running('RENDER')
assert bpy.context.mode=='OBJECT'

# Reuse the same bow constructor as a fresh scene build, without rebuilding the scene.
source=ast.parse((ROOT/'scripts/build-winter-reference.py').read_text())
definition=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='ribbon_bow')
exec(compile(ast.Module(body=[definition],type_ignores=[]),'ribbon_bow','exec'))
old_bows=[o for o in scene.objects if 'front wreath' in o.name and any(n in o.name for n in ('bow loop','ribbon tail','bow knot'))]
centers=[]
for o in old_bows:
    if 'bow knot' in o.name:
        # Both original and revised knots supply the same local attachment point.
        knot=Vector(o.location)
        if 'fabric bow knot' in o.name:centers.append((o.name.split(' • fabric bow knot')[0],knot.x,knot.y+.14,knot.z-.01,o.parent,o.users_collection[0]))
        else:centers.append((o.name.split(' • bow knot')[0],knot.x,knot.y+.10,knot.z,o.parent,o.users_collection[0]))
assert len(centers)==2,centers
for o in old_bows:bpy.data.objects.remove(o,do_unlink=True)
new_bows=[]
for name,x,y,z,parent,collection in centers:
    new_bows.extend(ribbon_bow(name,x,y,z,collection,bpy.data.materials['Ribbon • festive red'],parent))

# All twelve parts of each lantern, including its light, move as one assembly.
parts=[o for o in scene.objects if o.name.startswith('Lantern •') and o.type!='EMPTY']
posts=[o for o in parts if 'fluted post' in o.name]
assert len(posts)==6,len(posts)
stations=[(-4.38,-3.22),(-1.4,-3.22),(.8,-3.22),(4.38,-3.22),(-4.38,3.6),(4.38,3.6)]
assemblies=[]
for index,post in enumerate(posts):
    old=(post.location.x,post.location.y)
    group=[o for o in parts if math.hypot(o.location.x-old[0],o.location.y-old[1])<.30]
    assert len(group)==12,(post.name,len(group))
    target=(old[0],3.6) if old[1]>0 else old
    root=bpy.data.objects.new(f'Lantern assembly • {index+1:02}',None)
    post.users_collection[0].objects.link(root);root.location=(old[0],old[1],0)
    scene.view_layers[0].update()
    for child in group:
        matrix=child.matrix_world.copy();child.parent=root;child.matrix_world=matrix
    root.location.x=target[0];root.location.y=target[1];assemblies.append(root)

# A lantern's own fluted pillar replaces the fence pillar at that station.
# Coincident corner posts caused the black seams visible in the earlier render.
removed_posts=[]
for o in list(scene.objects):
    if o.name.startswith('Fence •') and any(n in o.name for n in ('upright','snowy cap')):
        if any(math.hypot(o.location.x-x,o.location.y-y)<.001 for x,y in stations):
            removed_posts.append(o.name);bpy.data.objects.remove(o,do_unlink=True)

# Remove the complete rear-left fir: needles, snow, decorations, trunk and light.
tree=[o for o in scene.objects if o.name.startswith('Fir • rear left')]
for o in tree:bpy.data.objects.remove(o,do_unlink=True)
scene.view_layers[0].update()
lamp_locations=[tuple(r.location[:2]) for r in assemblies]
assert all(any(math.hypot(x-a,y-b)<.001 for a,b in stations) for x,y in lamp_locations)
assert len(set((round(x,3),round(y,3)) for x,y in lamp_locations))==6
assert not any(o.name.startswith('Fir • rear left') for o in scene.objects)
assert len(new_bows)==10
scene['detail_revision']=2
report={'revision':2,'bow_objects':[o.name for o in new_bows],'lantern_stations':lamp_locations,'lantern_assemblies':6,'removed_tree_objects':len(tree),'removed_overlap_posts':removed_posts,'objects':len(scene.objects),'lights':sum(o.type=='LIGHT' for o in scene.objects),'checks_passed':True}
(OUT/'DETAIL_REVISION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
for file in ('build-winter-reference.py','revise-winter-details.py'):
    label='README • reproducible scene builder.py' if file=='build-winter-reference.py' else 'README • '+file
    text=bpy.data.texts.get(label)
    if text is None:text=bpy.data.texts.new(label)
    text.clear();text.write((ROOT/'scripts'/file).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-reference-master.blend'))
result=report
