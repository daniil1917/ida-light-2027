"""Build deterministic material maps and atlas role lookup; no image generation."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'textures'
OUT.mkdir(parents=True, exist_ok=True)
for pack in ['city-commercial', 'holiday']:
    image = Image.open(ROOT / f'assets/sources/kenney/{pack}/Textures/colormap.png').convert('RGB').resize((128, 128), Image.Resampling.NEAREST)
    (ROOT / f'assets/sources/kenney/{pack}/palette.json').write_text(json.dumps({'width': image.width,
        'height': image.height, 'pixels': list(image.getdata())}, separators=(',', ':')))
for kind, name in [('diff', 'concrete-color'), ('nor_gl', 'concrete-normal'), ('rough', 'concrete-roughness')]:
    image = Image.open(ROOT / f'assets/sources/polyhaven/concrete_wall_006_{kind}_1k.jpg')
    if kind == 'diff':
        # The source concrete's tan pigment should not recolour the Ida palette.
        image = image.convert('L').point(lambda v: 225 + v * 0.1).convert('RGB')
    image.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / f'{name}.webp', quality=85)

# Neutral room mask with a subtle frame and soft light, 64x64 shared by all windows.
window = Image.new('RGBA', (64, 64))
for y in range(64):
    for x in range(64):
        edge = min(x, y, 63 - x, 63 - y)
        shade = max(0, min(1, edge / 5)) * (0.7 + 0.3 * (1 - y / 63))
        if 29 <= x <= 31: shade *= 0.3
        window.putpixel((x, y), (255, 255, 255, round(shade * 230)))
window.save(OUT / 'window-light.png')
