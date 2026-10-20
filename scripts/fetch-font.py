import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
headers = {'User-Agent': 'IdaLightGame2027 asset-build'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=40) as response: return response.read()
# Rebuilding must retain the audited version, rather than follow moving master.
commit = '353b61b9f4430d5f420d56605a6e7993e0941470'
records = []
for source, target in [('docs/font-files/Inter-Regular.woff2', 'assets/sources/fonts/Inter-Regular.woff2'),
    ('docs/font-files/InterVariable.ttf', 'assets/sources/fonts/InterVariable.ttf'), ('LICENSE.txt', 'licenses/Inter-OFL.txt')]:
    url = f'https://raw.githubusercontent.com/rsms/inter/{commit}/{source}'
    try: data = get(url)
    except Exception:
        if source.endswith('.woff2'): continue
        raise
    path = ROOT / target
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    records.append({'url': url, 'path': target, 'license': 'OFL-1.1', 'sha256': hashlib.sha256(data).hexdigest()})
(ROOT / 'assets/sources/fonts/provenance.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(records))
