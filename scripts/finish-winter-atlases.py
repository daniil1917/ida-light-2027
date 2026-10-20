# coding: utf-8
"""Cold diffuse fill for occluded snow in the camera-independent bake.

Closed snow shells have black undersides in a diffuse-only bake. Near their
thin scalloped rims this becomes dirty-looking snow. Match the reference's
soft scattered sky fill, using an albedo mask so other materials stay intact.
HDR source radiance is preserved; display atlases are derived from it.
"""
import bpy, numpy as np, json, hashlib
from pathlib import Path
ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-runtime/lighting'
s=bpy.context.scene
mask_path=OUT/'site-albedo-mask.png'
assert mask_path.exists(),'Run the site albedo diagnostic from the prepared lighting source first'
mask=bpy.data.images.load(str(mask_path),check_existing=False)
albedo=np.asarray(mask.pixels[:],dtype=np.float32).reshape(4096,4096,4)
snow=(albedo[:,:,:3].min(axis=2)>.90)&(albedo[:,:,3]>.5)
image=bpy.data.images.load(str(OUT/'site-radiance.exr'),check_existing=False)
pixels=np.asarray(image.pixels[:],dtype=np.float32).reshape(4096,4096,4)
assert np.isfinite(pixels).all()
floor=np.array([.09,.13,.19],dtype=np.float32)
before=pixels[snow,:3].copy()
pixels[snow,:3]=np.maximum(before,albedo[snow,:3]*floor)
image.pixels.foreach_set(pixels.reshape(-1));image.update()
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
s.render.image_settings.file_format='PNG';s.render.image_settings.color_depth='16';s.render.image_settings.color_mode='RGB'
path=OUT/'site-display.png';image.save_render(str(path),scene=s)
updated=0
for im in list(bpy.data.images):
    if Path(bpy.path.abspath(im.filepath)).name=='site-display.png':
        if im.packed_file:im.unpack(method='REMOVE')
        im.reload();im.pack();updated+=1
assert updated
root=s.objects['Site']
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for obj in root.children_recursive:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'raw/winter-site.glb'),export_format='GLB',use_selection=True,use_active_scene=True,
    export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-lighting-baked.blend'))
record={'policy':'Albedo-masked diffuse sky fill for enclosed snow shells; original HDR is unchanged.',
    'minimumLinearSkyFill':floor.tolist(),'snowPixels':int(snow.sum()),
    'changedPixels':int(np.any(pixels[snow,:3]!=before,axis=1).sum()),
    'displaySha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(OUT/'snow-fill.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
result=record
