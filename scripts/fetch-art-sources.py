"""Download only selected, pinned CC0 geometry and texture sources."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'sources'
RECORDS = []

def download(url, target, license, page):
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        subprocess.run(['curl', '--fail', '--location', '--retry', '3', '--http1.1', '--max-time', '90', '--silent', '--show-error', url, '--output', str(target)], check=True)
    data = target.read_bytes()
    if data.startswith(b'version https://git-lfs'): raise RuntimeError('LFS pointer, not an asset')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {'path': str(target.relative_to(ROOT)), 'url': url, 'license': license, 'licenseSource': page,
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

kenney = json.loads((SOURCE / 'shorepine__kenney.json').read_text())
series = json.loads((SOURCE / 'series-ai__jam-ready-assets.json').read_text())
requests = []
for pack, names, page in [
    ('city-commercial', ['building-a.glb', 'building-c.glb', 'building-f.glb', 'building-h.glb', 'Textures/colormap.png'], 'https://kenney.nl/assets/city-kit-commercial'),
    ('holiday', ['tree-decorated-snow.glb', 'present-a-cube.glb', 'present-b-rectangle.glb', 'bench.glb', 'Textures/colormap.png'], 'https://kenney.nl/assets/holiday-kit'),
]:
    for name in names:
        path = f'3d/{pack}/{name}'
        if not any(item['path'] == path for item in kenney['tree']): raise RuntimeError(path)
        requests.append((f'https://raw.githubusercontent.com/shorepine/kenney/{kenney["commit"]}/{path}', SOURCE / 'kenney' / pack / name, 'CC0-1.0', page))

for path, name in [('kenney-city-kit-commercial/3D/city/License.txt', 'Kenney-City-Commercial.txt'),
    ('kenney-holiday-kit/3D/seasonal-holiday/License.txt', 'Kenney-Holiday.txt')]:
    requests.append((f'https://raw.githubusercontent.com/series-ai/jam-ready-assets/{series["commit"]}/{path}', ROOT / 'licenses' / name, 'CC0-1.0', f'https://github.com/series-ai/jam-ready-assets/blob/{series["commit"]}/{path}'))

for asset, maps in [('kloppenheim_06_puresky', [('hdri', 'hdr')]), ('concrete_wall_006', [('Diffuse', 'jpg'), ('nor_gl', 'jpg'), ('Rough', 'jpg')])]:
    files = json.loads((SOURCE / f'polyhaven__{asset}.json').read_text())
    for kind, format in maps:
        url = files[kind]['1k'][format]['url']
        requests.append((url, SOURCE / 'polyhaven' / url.rsplit('/', 1)[-1], 'CC0-1.0', f'https://polyhaven.com/a/{asset}'))

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for record in pool.map(lambda args: download(*args), requests):
        RECORDS.append(record)
        print(f'{record["path"]}: {record["bytes"]} bytes', flush=True)
(SOURCE / 'provenance.json').write_text(json.dumps(RECORDS, indent=2) + '\n')

# Keep selected entries, not two entire 54,000-entry catalogs in the project.
for source, names in [(kenney, {f'3d/{p}/{n}' for p, ns, _ in [
    ('city-commercial', ['building-a.glb', 'building-c.glb', 'building-f.glb', 'building-h.glb', 'Textures/colormap.png'], ''),
    ('holiday', ['tree-decorated-snow.glb', 'present-a-cube.glb', 'present-b-rectangle.glb', 'bench.glb', 'Textures/colormap.png'], '')] for n in ns}),
    (series, {'kenney-city-kit-commercial/3D/city/License.txt', 'kenney-holiday-kit/3D/seasonal-holiday/License.txt'})]:
    source['tree'] = [entry for entry in source['tree'] if entry['path'] in names]
    (SOURCE / f'{source["repository"].replace("/", "__")}.json').write_text(json.dumps(source, indent=2) + '\n')
