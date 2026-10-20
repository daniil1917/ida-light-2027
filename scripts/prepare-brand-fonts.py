"""Prepare the user-supplied Euclid faces for local web use (FontTools + Brotli)."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
source = root / 'assets/sources/fonts/euclid'
out = root / 'public/fonts'
out.mkdir(exist_ok=True)
brand = json.loads((root / 'src/app/brand.json').read_text())
faces = [('Light', 300), ('Regular', 400), ('Medium', 500), ('Semibold', 600)]
css = []
for style, weight in faces:
    font = TTFont(source / f'EuclidCircularA-{style}.otf')
    options = subset.Options()
    options.layout_features = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(0x20, 0x100)) + list(range(0x400, 0x530)) + list(range(0x2000, 0x2070)) + [0x20BD, 0x2191, 0x2193, 0x2197, 0x21BB, 0x2713])
    sub.subset(font)
    font.flavor = 'woff2'
    filename = f'euclid-circular-a-{style.lower()}.woff2'
    font.save(out / filename)
    css.append(f"@font-face {{ font-family: 'Euclid Circular A'; font-style: normal; font-weight: {weight}; font-display: swap; src: url('/fonts/{filename}') format('woff2'); }}")
    print(filename, (out / filename).stat().st_size, 'bytes')
css.append(':root { ' + ' '.join(f'--ida-{name}: {value};' for name, value in brand['colors'].items()) + ' }')
(root / 'src/styles/brand.css').write_text('\n'.join(css) + '\n')
original = TTFont(source / 'EuclidCircularA-Regular.otf')
copyright = original['name'].getDebugName(0) or 'See original font metadata.'
(out / 'Euclid-NOTICE.txt').write_text(f'Euclid Circular A\n{copyright}\n\nFont supplied by the user in Шрифт — копия.zip for the Ida Light game.\nNot an open-source font. Original license terms remain applicable.\nWOFF2 subset: Cyrillic, Latin, punctuation and UI symbols; local runtime only.\n')
