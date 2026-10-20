import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
const toolkit = process.env.IDA_BUILDINGS_TOOLKIT || path.resolve('.cache/glb-buildings');
const pinned = '6e05c323017e13c6b993cec2d6b14bd26f5b1a7c';
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('The massing generator requires Node.js 24+.');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: toolkit, encoding: 'utf8' }).trim();
if (commit !== pinned) throw new Error(`Use the audited glb-buildings-skill commit ${pinned}; got ${commit}`);
const result = spawnSync(process.execPath, ['boxes/cli/bin/buildings.ts', 'build', '--project', 'ida'], {
  cwd: toolkit, stdio: 'inherit', env: { ...process.env, BUILDINGS_HOME: path.resolve('assets/buildings') },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
