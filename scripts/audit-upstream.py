"""Read public upstream metadata, README, license and root before adopting it."""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import sys
import urllib.request

REPOS = [
    'vitejs/vite', 'pmndrs/react-three-fiber', 'pmndrs/drei',
    'pmndrs/react-three-rapier', 'pmndrs/zustand', 'radix-ui/primitives',
    'radix-ui/colors', 'shadcn-ui/ui', 'motiondivision/motion',
    'ibelick/motion-primitives', 'Telegram-Mini-Apps/tma.js',
    'goldfire/howler.js', 'pmndrs/react-postprocessing',
    'catdad/canvas-confetti', 'shorepine/kenney',
    'KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    'series-ai/jam-ready-assets', 'Poly-Haven/polyhaven.com',
    'pmndrs/assets', 'rsms/inter', 'hec-ovi/glb-buildings-skill',
    'webxdc/tower-builder', 'pmndrs/racing-game',
    'MushroomFleet/CinematicIntros-JSX', 'fczuardi/construction-game',
    'artginzburg/stack', 'facebook/react', 'mrdoob/three.js',
    'microsoft/TypeScript', 'vitest-dev/vitest', 'vitejs/vite-plugin-react',
    'donmccurdy/glTF-Transform',
]
CACHE = pathlib.Path('/private/tmp/ida-upstream-audit')
CACHE.mkdir(exist_ok=True)

def get(url, accept=None):
    request = urllib.request.Request(url, headers={
        'User-Agent': 'Ida-Light-2027-public-source-audit',
        'Accept': accept or 'application/vnd.github+json',
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()

def audit(repo):
    result = {'repository': repo, 'url': 'https://github.com/' + repo}
    try:
        meta = json.loads(get('https://api.github.com/repos/' + repo))
        result.update(archived=meta['archived'], defaultBranch=meta['default_branch'],
                      pushedAt=meta['pushed_at'], license=(meta.get('license') or {}).get('spdx_id'))
        # GitHub embeds the current top-level tree in the public repository page.
        html = get(result['url'], 'text/html').decode()
        import re
        match = re.search(r'"tree":\{"items":(\[.*?\]),"totalCount"', html)
        entries = json.loads(match.group(1)) if match else []
        result['structure'] = [entry.get('path', entry.get('name')) for entry in entries]
        paths = result['structure']
        readme_path = next((p for p in paths if p.lower().startswith('readme')), 'README.md')
        license_path = next((p for p in paths if p.lower().startswith(('license', 'licence', 'copying'))), 'LICENSE')
        for kind, path in [('readme', readme_path), ('license', license_path)]:
            url = f"https://raw.githubusercontent.com/{repo}/{result['defaultBranch']}/{path}"
            try:
                raw = get(url, 'text/plain')
                (CACHE / (repo.replace('/', '__') + '__' + kind + '.txt')).write_bytes(raw)
                result[kind + 'File'] = path
                result[kind + 'Url'] = url
                result[kind + 'Sha256'] = hashlib.sha256(raw).hexdigest()
            except Exception as exc:
                result[kind + 'Error'] = str(exc)
        result['checkedAt'] = datetime.datetime.now(datetime.UTC).isoformat()
    except Exception as exc:
        result['error'] = str(exc)
    return result

path = pathlib.Path('docs/research/upstream-audit.json')
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(audit, sys.argv[1:] or REPOS))
if sys.argv[1:] and path.exists():
    previous = json.loads(path.read_text())
    updated = {item['repository']: item for item in previous + results}
    results = list(updated.values())
path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
for result in results:
    print(result['repository'], result.get('license'), 'archived=' + str(result.get('archived')),
          'root=' + str(len(result.get('structure', []))),
          result.get('error') or result.get('readmeError') or result.get('licenseError') or 'OK')
