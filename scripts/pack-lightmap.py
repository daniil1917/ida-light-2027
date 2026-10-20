# coding: utf-8
"""Extrude UV-island colours before mipmapping; empty atlas pixels aren't shade."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
pixels = np.asarray(Image.open(root / 'assets/baked/quarter-light.png').convert('RGB')).copy()
albedo = np.asarray(Image.open(root / 'assets/baked/quarter-albedo.png').convert('RGB'), dtype=np.float32) / 255
valid = pixels.any(axis=2) | albedo.any(axis=2)
light = pixels.astype(np.float32) / 255
def linear(value):
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)
# Art-directed sky fill is baked into the texture, retaining the original hue/AO.
# Deep contact shadows stay grey instead of crushing snowy curbs to black.
# Tiny curb islands can have almost no irradiance. Keep a neutral sky floor.
light = np.maximum(np.maximum(linear(light), linear(albedo) * .45), .07)
srgb = np.where(light <= .0031308, light * 12.92, 1.055 * light ** (1 / 2.4) - .055)
pixels = np.clip(srgb * 255, 0, 255).astype(np.uint8)
pixels[~valid] = 0
del albedo, light, srgb
for _ in range(24):
    old = valid.copy()
    # Four-neighbour extrusion never changes a pixel actually produced by Cycles.
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        available = np.roll(old, (dy, dx), axis=(0, 1))
        if dy == 1: available[0] = False
        if dy == -1: available[-1] = False
        if dx == 1: available[:, 0] = False
        if dx == -1: available[:, -1] = False
        fill = available & ~valid
        pixels[fill] = np.roll(pixels, (dy, dx), axis=(0, 1))[fill]
        valid[fill] = True
# Subpixel islands/empty atlas texels must not turn snowy curbs black.
pixels = np.maximum(pixels, 75)
image = Image.fromarray(pixels).resize((2048, 2048), Image.Resampling.LANCZOS)
image.save(root / 'public/textures/quarter-light.webp', quality=94, method=6)
print('2048px RGB lightmap:', (root / 'public/textures/quarter-light.webp').stat().st_size, 'bytes')
