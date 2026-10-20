# coding: utf-8
"""Save the Cycles master and start the full render in the connected Blender."""
import bpy
from pathlib import Path
ROOT=Path('/Users/god/Documents/ChatGPT/Игра Ида Лайт')
OUT=ROOT/'assets/art-direction/winter-reference'
scene=bpy.context.scene
scene.name='Ida Lite • Winter construction'
scene.cycles.samples=256;scene.cycles.use_denoising=True;scene.cycles.adaptive_threshold=.012
scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8;scene.cycles.transparent_max_bounces=8
scene.render.resolution_x=3072;scene.render.resolution_y=3072;scene.render.resolution_percentage=100
scene.render.use_border=False;scene.render.use_crop_to_border=False
scene.render.image_settings.color_depth='16';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'winter-reference-master.png')
scene['art_direction']='Cool blue isometric winter diorama, warm furnished glass modules, fresh snow and festive practical lights.'
scene['render_master']='3072 square, Cycles Metal GPU, 256 adaptive sample cap, denoising, 16-bit PNG'
scene['export_status']='Rendering master; runtime optimization and light baking not performed.'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False;area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'winter-reference-master.blend'))
bpy.ops.render.render('INVOKE_DEFAULT',write_still=True)
result={'started':scene.render.filepath,'blend':bpy.data.filepath}
