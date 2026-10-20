"""Preserve omitted npm license files from their upstream repositories (build-time only)."""
import base64
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

sources = {
    '@react-three/fiber': 'pmndrs/react-three-fiber',
    '@react-three/rapier': 'pmndrs/react-three-rapier',
    '@dimforge/rapier3d-compat': 'dimforge/rapier.js',
    'maath': 'pmndrs/maath',
    'react-remove-scroll-bar': 'theKashey/react-remove-scroll-bar',
}

def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'Ida-Light-License-Audit', 'Accept': 'application/vnd.github+json'}), timeout=15) as response:
        return json.load(response)

records = []
for package, repository in sources.items():
    api = f'https://api.github.com/repos/{repository}'
    metadata = get(api)
    readme = get(f'{api}/readme')
    license_data = get(f'{api}/license')
    content = base64.b64decode(license_data['content'])
    name = package.replace('/', '-').replace('@', '')
    Path(f'licenses/runtime-{name}.txt').write_bytes(content)
    records.append({'package': package, 'repository': repository, 'archived': metadata['archived'], 'defaultBranch': metadata['default_branch'], 'readmeSHA': readme['sha'], 'licensePath': license_data['path'], 'licenseSource': license_data['html_url'], 'licenseBlobSHA': license_data['sha'], 'licenseSHA256': hashlib.sha256(content).hexdigest(), 'usage': 'Unmodified distribution notice; dependency implementation is unchanged'})
    print(package, license_data['license']['spdx_id'], len(content), 'bytes')
Path('docs/research/runtime-upstream-notices.json').write_text(json.dumps(records, indent=2) + '\n')
