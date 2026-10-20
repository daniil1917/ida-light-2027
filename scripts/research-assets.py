"""Read public source metadata; save small, pinned asset catalogs for selection."""
import concurrent.futures
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'sources'
ROOT.mkdir(parents=True, exist_ok=True)

def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'IdaLightGame2027/0.3 asset-build'})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read()

def repository(repo):
    name = repo.replace('/', '__')
    meta = json.loads(get(f'https://api.github.com/repos/{repo}'))
    commit = json.loads(get(f'https://api.github.com/repos/{repo}/commits/{meta["default_branch"]}'))['sha']
    tree = json.loads(get(f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1'))
    result = {'repository': repo, 'commit': commit, 'tree': tree.get('tree', [])}
    (ROOT / f'{name}.json').write_text(json.dumps(result, indent=2))
    return {'repository': repo, 'commit': commit, 'entries': len(result['tree'])}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(repository, ['shorepine/kenney', 'hec-ovi/glb-buildings-skill', 'series-ai/jam-ready-assets']):
        print(json.dumps(result), flush=True)

for asset in ['kloppenheim_06_puresky', 'concrete_wall_006']:
    files = json.loads(get(f'https://api.polyhaven.com/files/{asset}'))
    (ROOT / f'polyhaven__{asset}.json').write_text(json.dumps(files, indent=2))
    print(json.dumps({'polyhaven': asset, 'types': list(files)}), flush=True)
