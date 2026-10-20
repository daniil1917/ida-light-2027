# coding: utf-8
"""Editable reference reconstruction. Run in the connected Blender via MCP.
Existing scenes remain intact. Original geometry, no generated backdrop sprite.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector

ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(37)
scene=bpy.data.scenes.new('Ida • Winter reference • studio')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
collections={}
for label in ['01 • Snow platform','02 • Architecture','03 • Crane','04 • Christmas trees','05 • Fence and lamps','06 • Props','07 • Studio']:
    c=bpy.data.collections.new(label);scene.collection.children.link(c);collections[label[:2]]=c
current=collections['01']

def link(obj):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    current.objects.link(obj)
    return obj

def rgba(hex):
    s=[int(hex.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in s]+[1]

def mat(name,color,rough=.45,metal=0,emit=0):
    m=bpy.data.materials.new(name);m.diffuse_color=rgba(color);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled');p.inputs['Base Color'].default_value=rgba(color);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emit:p.inputs['Emission Color'].default_value=rgba(color);p.inputs['Emission Strength'].default_value=emit
    return m
snow=mat('Snow • soft fresh powder','#f8fbff',.58)
p=next(n for n in snow.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled');p.inputs['Subsurface Weight'].default_value=.065;p.inputs['Subsurface Radius'].default_value=(.6,.8,1);p.inputs['Subsurface Scale'].default_value=.08
n=snow.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=90;n.inputs['Detail'].default_value=2
b=snow.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.12;b.inputs['Distance'].default_value=.012
snow.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);snow.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
blue=mat('Crane • satin periwinkle steel','#6e7bd3',.32,.32)
blueDark=mat('Crane • structural blue','#4b579b',.38,.34)
trim=mat('Architecture • frost blue frame','#b7c3e5',.37,.12)
concrete=mat('Architecture • pale mineral white','#e4e7f3',.63)
baseMat=mat('Platform • blue enamel','#4c68b2',.30,.2)
wood=mat('Interiors • warm ash','#d5aa78',.55)
cream=mat('Interiors • ivory upholstery','#f8dfb3',.72)
wall=mat('Interiors • warm plaster','#e9c6a3',.78)
green=mat('Fir • deep pine needles','#28705a',.63)
leaf=mat('Wreath • green foliage','#215f45',.7)
brown=mat('Fir • trunk','#785133',.75)
red=mat('Ribbon • festive red','#d94550',.34)
giftblue=mat('Gift • ice blue','#85b8dd',.36)
pink=mat('Gift • pearl paper','#f4e3ec',.5)
gray=mat('Fence • frost lavender','#98a8cd',.48,.12)
wire=mat('Wire • midnight green','#294139',.48)
black=mat('Snowman • hat and eyes','#263756',.48)
orange=mat('Snowman • carrot','#ed8d38',.6)
paver=mat('Paving • blush grey stone','#afb0c6',.78)
cyan=mat('Crane • cyan running light','#64e4ff',.27,.05,3)
lamplight=mat('Lantern • warm source','#ffda9b',.35,0,5)
bulbs=[mat('Garland • '+name,color,.27,0,7) for name,color in [('amber','#ffb758'),('ruby','#ff5d58'),('ice','#49d8ff'),('leaf','#68e49e')]]
glass=mat('Windows • clear thin glass','#e0f2ff',.045)
p=next(n for n in glass.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled');p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.45

# Primitives keep separate names/materials and non-destructive bevels.
def finish(obj,name,material):
    link(obj);obj.name=name
    if material:obj.data.materials.append(material)
    return obj

def cube(name,loc,dims,material,bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=finish(bpy.context.object,name,material);o.scale=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
        for f in o.data.polygons:f.use_smooth=True
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=40
    return o

def sphere(name,loc,scale,material,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=finish(bpy.context.object,name,material);o.scale=scale
    for f in o.data.polygons:f.use_smooth=True
    return o

def cyl(name,a,b,r,material,vertices=16):
    a,b=Vector(a),Vector(b);delta=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(a+b)/2)
    o=finish(bpy.context.object,name,material);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    for f in o.data.polygons:f.use_smooth=True
    bevel=o.modifiers.new('Rounded ends','BEVEL');bevel.width=min(r*.18,.012);bevel.segments=2
    return o

def curve(name,points,r,material):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12;data.bevel_depth=r;data.bevel_resolution=3
    sp=data.splines.new('POLY');sp.points.add(len(points)-1)
    for p,v in zip(sp.points,points):p.co=(*v,1)
    o=bpy.data.objects.new(name,data);current.objects.link(o);data.materials.append(material);return o

def light(name,loc,power,color,size=1,target=None,kind='AREA'):
    data=bpy.data.lights.new(name,kind);data.energy=power;data.color=rgba(color)[:3]
    if kind=='AREA':data.shape='DISK';data.size=size
    else:data.shadow_soft_size=size
    o=bpy.data.objects.new(name,data);current.objects.link(o);o.location=loc
    if target is not None:o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o

def garland(name,a,b,count=14,sag=.08):
    points=[]
    for i in range(count*3+1):
        t=i/(count*3);points.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t-sag*math.sin(math.pi*t)))
    curve(name+' • cable',points,.012,wire)
    for i in range(count):
        t=(i+.5)/count;x=a[0]*(1-t)+b[0]*t;y=a[1]*(1-t)+b[1]*t;z=a[2]*(1-t)+b[2]*t-sag*math.sin(math.pi*t)
        cyl(name+' • socket',(x,y,z),(x,y,z-.045),.026,wire,12)
        sphere(name+' • bulb',(x,y,z-.069),(.032,.032,.043),bulbs[i%4],16,8)

# Platform and a snowy entrance bridge.
cube('Island • rounded blue plinth',(0,.25,.04),(9.6,7.5,.60),baseMat,.38)
cube('Island • fresh snow blanket',(0,.25,.40),(9.57,7.48,.25),snow,.21)
cube('Entry • inset bridge',(-.30,-3.80,.17),(2.26,1.38,.35),baseMat,.14)
cube('Entry • bridge snow',(-.30,-3.82,.36),(2.28,1.40,.17),snow,.12)
for row in range(7):
    for col in range(5):
        cube('Entry • individual stone tile',(-1.25+col*.47,-4.24+row*.43,.496),(.455,.415,.036),paver,.008)
for x,y in [(-1.48,-4.1),(.93,-4.1),(-1.5,-3.0),(1.02,-3.05),(-1.0,-1.8),(2.15,-1.65),(2.0,-.7),(-.5,2.3)]:
    sphere('Powder • soft drift',(x,y,.54),(.48,.48,.16),snow,32,16)
for i in range(34):
    x=rng.uniform(-4.3,4.3);y=rng.uniform(-2.95,3.5)
    if abs(x-.65)<2 and abs(y-.35)<1.8:continue
    sphere('Powder • undulating ground',(x,y,.50),(rng.uniform(.24,.7),rng.uniform(.2,.55),rng.uniform(.025,.08)),snow)

# Three articulated house modules, independent roots for a later game export.
current=collections['02']
W=3.5;D=3.0;CX=.72;CY=.28;H=1.25

def ribbon_bow(name,x,y,z,collection,material,parent=None):
    """Folded ribbon with open loops and forked tails, in the wreath's XZ plane."""
    woven=bpy.data.materials.get('Ribbon • woven bow')
    if woven is None:
        woven=material.copy();woven.name='Ribbon • woven bow'
        p=next(n for n in woven.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')
        p.inputs['Roughness'].default_value=.52;p.inputs['Sheen Weight'].default_value=.20
    material=woven
    made=[]
    def piece(label,vertices,faces,thickness=.008):
        mesh=bpy.data.meshes.new(name+label);mesh.from_pydata(vertices,[],faces);mesh.materials.append(material)
        obj=bpy.data.objects.new(name+label,mesh);collection.objects.link(obj);obj.parent=parent
        for p in mesh.polygons:p.use_smooth=True
        solid=obj.modifiers.new('Fabric thickness','SOLIDIFY');solid.thickness=thickness
        bevel=obj.modifiers.new('Soft ribbon edges','BEVEL');bevel.width=.003;bevel.segments=3
        made.append(obj);return obj
    for sign in (-1,1):
        vertices=[];faces=[];count=96
        for i in range(count):
            t=i*math.tau/count
            u=.155+.15*math.cos(t);v=.030+.100*math.sin(t)+u*.18
            # Width narrows near the knot; the loop is hollow, not a solid petal.
            du=-.15*math.sin(t);dv=.100*math.cos(t)+du*.18
            length=math.hypot(du,dv);normal=(-dv/length,du/length)
            width=.035+.025*(.5+.5*math.cos(t))
            for edge in (-1,1):
                uu=u+edge*normal[0]*width/2;vv=v+edge*normal[1]*width/2
                vertices.append((x+sign*uu,y-.10-.030*math.sin(t)-.012*math.cos(2*t),z+vv))
        for i in range(count):
            j=(i+1)%count;faces.append((i*2,j*2,j*2+1,i*2+1))
        piece(' • folded bow loop '+str(sign),vertices,faces)
        # A V cut makes the two hanging ends read as ribbon rather than bars.
        outline=[(.015,-.028),(.095,-.028),(.15,-.14),(.23,-.29),(.157,-.265),(.119,-.33),(.055,-.18)]
        vertices=[(x+sign*u,y-.115-.016*math.sin((-v/.33)*math.pi),z+v) for u,v in outline]
        face=tuple(range(len(vertices)))
        if sign<0:face=tuple(reversed(face))
        piece(' • notched ribbon tail '+str(sign),vertices,[face],.010)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y-.14,z+.01))
    knot=bpy.context.object
    for c in list(knot.users_collection):c.objects.unlink(knot)
    collection.objects.link(knot);knot.name=name+' • fabric bow knot';knot.scale=(.090,.065,.105)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    knot.parent=parent;knot.data.materials.append(material)
    bevel=knot.modifiers.new('Gathered knot','BEVEL');bevel.width=.019;bevel.segments=5
    knot.modifiers.new('Knot normals','WEIGHTED_NORMAL')
    made.append(knot)
    return made

def wreath(name,x,y,z,r=.27):
    for i in range(20):
        a=i*math.tau/20
        o=sphere(name+' • foliage',(x+math.sin(a)*r,y,z+math.cos(a)*r),(.095,.065,.12),leaf)
        o.rotation_euler.y=a
    for i in range(6):
        a=i*math.tau/6+.4;sphere(name+' • berries',(x+math.sin(a)*r,y-.066,z+math.cos(a)*r),(.035,.032,.035),red,16,8)
    ribbon_bow(name,x,y,z+r,current,red)

def room_props(prefix,z):
    # Furnished corners visible through glazing: shelves, chairs, gifts and lamps.
    for x,y in [(CX-1.13,CY-.70),(CX+.45,CY-.86),(CX+1.10,CY+.55),(CX-.7,CY+.80)]:
        cube(prefix+' • ash side table',(x,y,z+.35),(.40,.37,.42),wood,.02)
        cube(prefix+' • ivory tabletop',(x,y,z+.58),(.44,.41,.06),cream,.025)
        sphere(prefix+' • small warm shade',(x,y,z+.83),(.085,.085,.12),lamplight,20,10)
        cyl(prefix+' • lamp stem',(x,y,z+.62),(x,y,z+.76),.015,wood,12)
    for x,y in [(CX-.20,CY-.8),(CX+1.1,CY-.55),(CX+.65,CY+.68)]:
        cube(prefix+' • chair seat',(x,y,z+.27),(.38,.37,.11),cream,.035)
        cube(prefix+' • chair back',(x,y+.145,z+.46),(.39,.09,.34),cream,.035)
        for dx in (-.13,.13):
            for dy in (-.12,.12):cyl(prefix+' • chair leg',(x+dx,y+dy,z+.06),(x+dx,y+dy,z+.25),.017,wood,10)
    cube(prefix+' • shelf body',(CX-.92,CY+.93,z+.47),(.68,.33,.79),wood,.024)
    for i in range(4):cube(prefix+' • books',(CX-1.15+i*.11,CY+.72,z+.66),(.085,.17,.25),[cream,red,giftblue,wall][i],.008)
    cube(prefix+' • planter',(CX+.98,CY-.07,z+.18),(.19,.19,.28),wood,.035)
    for i in range(7):
        a=i*2.399;v=(math.sin(a)*.11,math.cos(a)*.11)
        o=sphere(prefix+' • plant leaf',(CX+.98+v[0],CY-.07+v[1],z+.47),(.035,.055,.19),green,16,8);o.rotation_euler.y=math.sin(a)*.3

def floor_module(index,z,suspended=False):
    prefix=f'Floor {index:02}'
    root=bpy.data.objects.new(prefix+' • module root',None);current.objects.link(root);root['game_role']='moving_floor' if suspended else 'placed_floor';root['game_floor_height']=H
    before=set(current.objects)
    cube(prefix+' • bottom cornice',(CX,CY,z+.04),(W+.18,D+.18,.18),concrete,.045)
    cube(prefix+' • interior floor',(CX,CY,z+.16),(W-.12,D-.12,.11),wood,.014)
    cube(prefix+' • upper fascia',(CX,CY,z+H-.03),(W+.22,D+.22,.16),trim,.045)
    cube(prefix+' • snow roof pillow',(CX,CY,z+H+.09),(W+.32,D+.32,.24),snow,.12)
    for i in range(7):
        sphere(prefix+' • roof powder swell',(CX+rng.uniform(-1.25,1.25),CY+rng.uniform(-1.0,1.0),z+H+.207),(rng.uniform(.45,.8),rng.uniform(.35,.7),.035),snow,32,16)
    # Horizontal sills plus eight corner/window mullions.
    for y in (CY-D/2,CY+D/2):
        cube(prefix+' • sill',(CX,y,z+.23),(W,.11,.12),trim,.018)
        for i in range(4):
            x=CX-W/2+i*W/3
            cube(prefix+' • facade post',(x,y,z+.67),(.105,.135,H-.25),trim,.014)
        for i in range(3):
            x=CX-W/2+(i+.5)*W/3
            cube(prefix+' • front glazing',(x,y,z+.70),(W/3-.12,.012,.94),glass,.004)
    for x in (CX-W/2,CX+W/2):
        cube(prefix+' • side sill',(x,CY,z+.23),(.11,D,.12),trim,.018)
        for i in range(1,3):
            y=CY-D/2+i*D/3
            cube(prefix+' • side mullion',(x,y,z+.67),(.135,.10,H-.25),trim,.014)
        for i in range(3):
            y=CY-D/2+(i+.5)*D/3
            cube(prefix+' • side glazing',(x,y,z+.70),(.012,D/3-.12,.94),glass,.004)
    # Shallow warm internal back panel avoids a dark empty window volume.
    cube(prefix+' • back plaster',(CX,CY+D/2-.09,z+.69),(W-.2,.035,.92),wall,.015)
    room_props(prefix,z)
    light(prefix+' • warm room',(CX,CY,z+1.02),34,'#ffc587',2.4,(CX,CY,z+.2))
    for a,b in [((CX-W/2,CY-D/2-.055,z+1.13),(CX+W/2,CY-D/2-.055,z+1.13)),((CX+W/2+.055,CY-D/2,z+1.13),(CX+W/2+.055,CY+D/2,z+1.13))]:garland(prefix+' • festive cornice',a,b,14,.07)
    if index!=2:
        cube(prefix+' • wreath backing',(CX-.32,CY-D/2-.055,z+.70),(.63,.07,.95),trim,.012)
        wreath(prefix+' • front wreath',CX-.32,CY-D/2-.125,z+.70)
    for obj in set(current.objects)-before:obj.parent=root
    return root
floor_module(1,.60);floor_module(2,1.90);floor_module(3,4.08,True)
# Lower entry steps lead directly to the glass door.
for i in range(3):cube('House • entrance step',(CX-.1,CY-D/2-.28-i*.21,.58-i*.075),(1.25,.45,.15),concrete,.025)
for x,y in [(CX-W/2-.1,CY-1),(CX+W/2+.1,CY-.7),(CX-.8,CY+D/2),(CX+1,CY-D/2-.2)]:
    for i in range(4):sphere('House • foundation snowbank',(x+rng.uniform(-.28,.28),y+rng.uniform(-.17,.17),.58),(rng.uniform(.3,.55),.32,rng.uniform(.13,.24)),snow,32,16)

# Static bent crane with separately named telescope segments.
current=collections['03']
MX=-2.38;MY=1.38;Z0=.53;TOP=7.52
cube('Crane • anchored footing',(MX,MY,.59),(1.05,.87,.18),blueDark,.045)
cube('Crane • footing snow',(MX,MY,.69),(1.1,.91,.08),snow,.045)
for dx in (-.26,.26):
    for dy in (-.23,.23):cube('Crane • mast chord',(MX+dx,MY+dy,(TOP+Z0)/2),(.11,.11,TOP-Z0),blue,.022)
for level in range(10):
    z=Z0+level*.68
    for dy in (-.23,.23):
        cube('Crane • mast crossbar',(MX,MY+dy,z),(.60,.10,.10),blue,.018)
        cyl('Crane • mast diagonal',(MX-.24,MY+dy,z+.08),(MX+.24,MY+dy,z+.59),.046,blueDark)
    for dx in (-.26,.26):
        cube('Crane • side crossbar',(MX+dx,MY,z),(.1,.55,.10),blue,.014)
        cyl('Crane • side diagonal',(MX+dx,MY-.21,z+.08),(MX+dx,MY+.21,z+.59),.042,blue)
BOOM=6.92;BY=.28
cube('Crane • stationary dogleg',(MX,(MY+BY)/2,BOOM),(.34,MY-BY+.55,.28),blue,.035)
cube('Crane • crosshead',(MX,BY,BOOM),(.67,.44,.38),blueDark,.038)
# Front jib stretches over the whole house; perpendicular rear counterjib remains visible.
cube('Crane • rear jib',(MX,MY+1.05,BOOM),(.29,2.0,.29),blue,.038)
for i,y in enumerate([MY+1.8,MY+1.46]):cube('Crane • counterweight',(MX,y,BOOM-.22),(.59,.40,.48),blueDark,.032)
cyl('Crane • rear tension',(MX,MY,TOP),(MX,MY+1.96,BOOM+.17),.022,blueDark)
cyl('Crane • front tension',(MX,MY,TOP),(MX,BY,BOOM+.2),.020,blueDark)
for i,(start,end,width) in enumerate([(MX-.5,-.85,.32),(-.85,1.5,.27),(1.5,3.6,.23)]):
    cube(f'Crane • telescopic section {i+1}',((start+end)/2,BY,BOOM),(end-start,width,.25-i*.03),blue,.028)
    cube(f'Crane • jib top rail {i+1}',((start+end)/2,BY-.015,BOOM+.14),(end-start,.065,.045),trim,.012)
    cube(f'Crane • telescopic sleeve {i+1}',(end-.04,BY,BOOM),(.14,width+.065,.32-i*.025),blueDark,.025)
cube('Crane • luminous blue strip',(-1.38,BY-.173,BOOM-.045),(1.15,.045,.15),cyan,.018)
cube('Crane • jib end cap',(3.62,BY,BOOM),(.17,.32,.25),blue,.025)
cube('Crane • end recess',(3.713,BY,BOOM),(.005,.12,.11),blueDark,.005)
cube('Crane • trolley',(CX,BY,BOOM-.20),(.38,.37,.18),blueDark,.026)
cyl('Crane • steel hoist',(CX,BY,BOOM-.29),(CX,BY,5.47),.021,blueDark)
cube('Crane • module spreader',(CX,BY,5.47),(.7,.11,.085),blue,.018)

# Organic tiered fir meshes, snow caps with scalloped edges and round ornaments.
current=collections['04']
def fir_surface(name,x,y,z,r,h,material,snow_layer=False):
    verts=[];faces=[];segments=48;rings=14
    for j in range(rings):
        t=j/(rings-1)
        radius=r*((1-t)**.72)*(1-.13*math.sin(math.pi*t))+.015
        if j==0:radius*=.89
        if j==1:radius*=1.05
        for k in range(segments):
            a=k*math.tau/segments
            scallop=math.sin(7*a+.4)*.045*(1-t)**2
            zz=z+t*h+scallop+(0.015*math.sin(a*3+t*9) if snow_layer else 0)
            rr=radius*(1+.018*math.sin(9*a+t*4))
            verts.append((x+rr*math.cos(a),y+rr*math.sin(a),zz))
    for j in range(rings-1):
        for k in range(segments):
            a=j*segments+k;b=j*segments+(k+1)%segments;c=(j+1)*segments+(k+1)%segments;d=(j+1)*segments+k;faces.append((a,b,c,d))
    faces.append(tuple(reversed(range(segments))));faces.append(tuple((rings-1)*segments+k for k in range(segments)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material)
    o=bpy.data.objects.new(name,mesh);current.objects.link(o)
    for f in mesh.polygons:f.use_smooth=True
    mod=o.modifiers.new('Smooth snow silhouette','SUBSURF');mod.levels=1;mod.render_levels=2
    return o

def tree(name,x,y,size):
    cyl(name+' • trunk',(x,y,.51),(x,y,.78),.18*size,brown)
    for tier in range(4):
        r=(.71-.145*tier)*size;h=.65*size;z=.66+tier*.40*size
        fir_surface(name+' • needles',x,y,z,r,h,green)
        fir_surface(name+' • fresh piled snow',x,y,z+.105*size,r*.94,h*.87,snow,True)
        points=[]
        for k in range(81):
            a=k*math.tau/80;points.append((x+math.cos(a)*r*.88,y+math.sin(a)*r*.88,z+.14*size+math.sin(a*2)*.016))
        curve(name+' • ornament wire',points,.012,wire)
        for k in range(13):
            a=k*math.tau/13;sphere(name+' • twinkle',(x+math.cos(a)*r*.89,y+math.sin(a)*r*.89,z+.15*size),(.024,.024,.024),bulbs[k%4],12,8)
        for k in range(5):
            a=k*math.tau/5+.4;sphere(name+' • glass bauble',(x+math.cos(a)*r*.91,y+math.sin(a)*r*.91,z+.17*size),(.044,.044,.048),red,16,8)
    sphere(name+' • soft snow tip',(x,y,.66+3*.4*size+.61*size),(.13*size,.13*size,.19*size),snow)
    light(name+' • warm glow',(x,y-.3,.95),8,'#ffbf6b',.55,kind='POINT')
for args in [('Fir • rear center',-1.24,2.74,.87),('Fir • right',3.41,1.94,1.10),('Fir • front right',3.01,-2.21,.73)]:tree(*args)

# Fence, lights and snow crests. Front leaves an actual opening for the gate.
current=collections['05']
FY=-3.22;BX=4.38;RY=3.60
post_positions=[]
lamp_stations=[(-BX,FY),(-1.4,FY),(.8,FY),(BX,FY),(-BX,RY),(BX,RY)]
def fence(name,a,b):
    dist=(Vector(b)-Vector(a)).length;count=round(dist/.9)
    for i in range(count+1):
        t=i/count;x=a[0]*(1-t)+b[0]*t;y=a[1]*(1-t)+b[1]*t
        key=(round(x,6),round(y,6))
        if key not in post_positions and key not in lamp_stations:
            cube(name+' • upright',(x,y,.98),(.15,.15,.94),gray,.025)
            cube(name+' • snowy cap',(x,y,1.48),(.21,.21,.13),snow,.045)
        post_positions.append(key)
    midpoint=(Vector(a)+Vector(b))/2
    dims=(abs(b[0]-a[0])+.035,abs(b[1]-a[1])+.035,.56)
    dims=(max(dims[0],.075),max(dims[1],.075),dims[2])
    cube(name+' • panel',(midpoint.x,midpoint.y,.88),dims,gray,.014)
    points=[]
    for i in range(count*6+1):
        t=i/(count*6);x=a[0]*(1-t)+b[0]*t;y=a[1]*(1-t)+b[1]*t
        sphere(name+' • snow crest',(x,y,1.20),(.070,.080,.045),snow,16,8)
    # Lights face outward on foreground, inward on back.
    offset= -.057 if a[1]==b[1] and a[1]<0 else .057
    aa=(a[0]+(offset if a[0]==b[0] else 0),a[1]+(offset if a[1]==b[1] else 0),1.18)
    bb=(b[0]+(offset if a[0]==b[0] else 0),b[1]+(offset if a[1]==b[1] else 0),1.18)
    garland(name+' • garland',aa,bb,max(3,int(dist*5)),.025)
fence('Fence • front left',(-BX,FY,0),(-1.40,FY,0));fence('Fence • front right',(.80,FY,0),(BX,FY,0));fence('Fence • right',(BX,FY,0),(BX,RY,0));fence('Fence • back',(-BX,RY,0),(BX,RY,0));fence('Fence • left',(-BX,FY,0),(-BX,RY,0))
for x,y in lamp_stations:
    cube('Lantern • fluted post',(x,y,1.15),(.18,.18,1.17),gray,.025)
    for dx in (-.052,.052):cube('Lantern • post flute',(x+dx,y-.105,1.05),(.022,.025,.8),trim,.01)
    cube('Lantern • glowing glass',(x,y,1.91),(.27,.27,.31),lamplight,.018)
    for dx in (-.145,.145):
        for dy in (-.145,.145):cube('Lantern • frame',(x+dx,y+dy,1.91),(.025,.025,.35),wood,.008)
    cube('Lantern • copper roof',(x,y,2.1),(.39,.39,.07),wood,.025)
    cube('Lantern • snowy lid',(x,y,2.14),(.40,.40,.055),snow,.025)
    cube('Lantern • base',(x,y,1.73),(.33,.33,.055),wood,.015)
    light('Lantern • pool on snow',(x,y,1.91),12,'#ffc779',.20,kind='POINT')
# Barrier across the entrance, red/white sections with a hinge.
for x in (-1.29,.70):
    cube('Gate • control pillar',(x,FY+.02,.91),(.20,.22,.79),gray,.03)
    sphere('Gate • amber beacon',(x,FY+.02,1.36),(.065,.065,.075),bulbs[0],16,8)
    sphere('Gate • hinge',(x,FY-.13,1.15),(.049,.025,.049),concrete)
for i in range(12):cube('Gate • striped arm',(-1.2+i*.159,FY-.05,1.24),(.157,.085,.09),red if i%2 else concrete,.008)

# Corrugated builder's cabin, snowman and parcel group.
current=collections['06']
SX=-2.60;SY=-.43
cube('Site cabin • body',(SX,SY,1.09),(1.19,1.34,1.07),trim,.034)
cube('Site cabin • roof',(SX,SY,1.68),(1.31,1.44,.12),gray,.035)
cube('Site cabin • roof snow',(SX,SY,1.80),(1.4,1.52,.21),snow,.095)
for i in range(12):cube('Site cabin • corrugation',(SX+.606,SY-.6+i*.11,1.12),(.035,.026,.99),gray,.006)
cube('Site cabin • blue door',(SX,SY-.685,1.1),(.64,.058,.96),blue,.02)
cube('Site cabin • door casing',(SX,SY-.72,1.10),(.78,.04,1.06),gray,.016)
cube('Site cabin • door leaf',(SX,SY-.75,1.10),(.65,.03,.96),blue,.015)
sphere('Site cabin • brass knob',(SX+.23,SY-.785,1.11),(.024,.024,.025),wood)
for i in range(10):sphere('Site cabin • uneven roof drift',(SX+rng.uniform(-.6,.6),SY+rng.uniform(-.7,.7),1.88),(.22,.19,.065),snow)
NX=-2.76;NY=-2.05
sphere('Snowman • body',(NX,NY,.82),(.25,.235,.31),snow,32,16)
sphere('Snowman • torso',(NX,NY,1.12),(.205,.197,.245),snow,32,16)
sphere('Snowman • head',(NX,NY,1.40),(.167,.16,.18),snow,32,16)
cyl('Snowman • hat crown',(NX,NY,1.56),(NX,NY,1.75),.132,black,32)
cyl('Snowman • hat brim',(NX,NY,1.56),(NX,NY,1.60),.185,black,32)
for dx in (-.06,.06):sphere('Snowman • eye',(NX+dx,NY-.151,1.44),(.018,.015,.019),black,16,8)
cyl('Snowman • carrot',(NX,NY-.15,1.38),(NX+.025,NY-.29,1.365),.028,orange)
cyl('Snowman • scarf',(NX,NY,1.21),(NX,NY,1.275),.208,blue,32)
cube('Snowman • scarf tail',(NX+.09,NY-.198,1.12),(.075,.05,.26),blue,.02)
for z in (.98,1.10):sphere('Snowman • coal button',(NX,NY-.205,z),(.024,.018,.024),black,16,8)
for sign in (-1,1):
    a=(NX+sign*.17,NY,1.17);b=(NX+sign*.45,NY-.035,1.37)
    cyl('Snowman • twig arm',a,b,.021,brown,12)
    cyl('Snowman • twig finger',(b[0]-sign*.10,b[1],b[2]-.08),(b[0]-sign*.085,b[1]-.02,b[2]+.07),.013,brown,10)
def gift(name,x,y,w,h,color):
    cube(name+' • box',(x,y,.54+h/2),(w,w,h),color,.035)
    cube(name+' • ribbon one',(x,y,.54+h/2),(.085,w+.012,h+.012),red,.014)
    cube(name+' • ribbon two',(x,y,.54+h/2),(w+.012,.085,h+.012),red,.014)
    for sign in (-1,1):
        o=sphere(name+' • bow',(x+sign*.10,y,.55+h),(.13,.058,.06),red);o.rotation_euler.y=sign*.3
    sphere(name+' • knot',(x,y,.57+h),(.048,.054,.052),red)
gift('Parcel • blue',3.66,.49,.54,.52,giftblue);gift('Parcel • pearl',3.87,1.12,.54,.79,pink);gift('Parcel • small',3.19,.75,.36,.44,cream)

# Studio: blue seamless floor, large area lights, orthographic reference camera.
current=collections['07']
studio=mat('Backdrop • calm winter blue','#4897df',.28,.10)
cube('Studio • seamless blue ground',(0,0,-.35),(200,200,.08),studio,.0)
world=bpy.data.worlds.new('Studio • winter ambient');world.use_nodes=True;scene.world=world
next(n for n in world.node_tree.nodes if n.bl_idname=='ShaderNodeBackground').inputs['Color'].default_value=(.28,.43,.72,1);next(n for n in world.node_tree.nodes if n.bl_idname=='ShaderNodeBackground').inputs['Strength'].default_value=.32
light('Studio • broad cool key',(-4,-6,11),1550,'#eef3ff',7,(0,0,1.5))
light('Studio • cyan fill',(7,1,9),1300,'#bdeeff',8,(0,0,2))
light('Studio • frosty rim',(-3,7,10),1650,'#c7dcff',6,(0,0,2.5))
camdata=bpy.data.cameras.new('Camera • reference composition');cam=bpy.data.objects.new('Camera • reference composition',camdata);current.objects.link(cam)
cam.location=(11,-16,12.6);cam.rotation_euler=(Vector((0,.1,3.25))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=12.7;camdata.lens=50;scene.camera=cam
ref=Path('/Users/god/Downloads/зимняя_стройка_с_новогодним_домом.png')
if ref.exists():
    image=bpy.data.images.load(str(ref),check_existing=True);image.name='Reference • user supplied';image.pack()
    bg=camdata.background_images.new();bg.image=image;bg.alpha=.25;bg.display_depth='FRONT';camdata.show_background_images=False
scene.render.engine='CYCLES';scene.cycles.device='GPU'
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.refresh_devices()
for device in prefs.devices:device.use=device.type=='METAL'
scene.cycles.samples=256;scene.cycles.use_denoising=True;scene.cycles.adaptive_threshold=.012
scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8;scene.cycles.transparent_max_bounces=8
scene.cycles.seed=37
scene.render.resolution_x=3072;scene.render.resolution_y=3072;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='16'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
scene.render.filepath=str(OUT/'winter-reference-master.png')
# Blender 5.2 stores compositor nodes as a reusable scene node group.
comp=bpy.data.node_groups.new('Winter • restrained bloom','CompositorNodeTree')
comp.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rl=comp.nodes.new('CompositorNodeRLayers');rl.scene=scene
bloom=comp.nodes.new('CompositorNodeGlare');bloom.inputs['Type'].default_value='Fog Glow';bloom.inputs['Quality'].default_value='High'
if 'Threshold' in bloom.inputs:bloom.inputs['Threshold'].default_value=1.8
if 'Size' in bloom.inputs:bloom.inputs['Size'].default_value=.18
if 'Strength' in bloom.inputs:bloom.inputs['Strength'].default_value=.18
output=comp.nodes.new('NodeGroupOutput');comp.links.new(rl.outputs['Image'],bloom.inputs['Image']);comp.links.new(bloom.outputs['Image'],output.inputs['Image']);scene.compositing_node_group=comp
# Keep a rebuild source inside the blend alongside the packed reference.
text=bpy.data.texts.load(str(ROOT/'scripts/build-winter-reference.py'));text.name='README • reproducible scene builder.py'
scene['purpose']='Reference study before game integration; separate editable modules, not yet a realtime scene.'
scene['reference']='User supplied winter construction image, 2026-10-11'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-reference-master.blend'))
result={'scene':scene.name,'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),'lights':sum(o.type=='LIGHT' for o in scene.objects),'render':[3072,3072,256],'blend':str(OUT/'winter-reference-master.blend'),'reference_packed':ref.exists(),'preserved_scenes':[s.name for s in bpy.data.scenes if s!=scene]}
