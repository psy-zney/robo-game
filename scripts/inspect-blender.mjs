import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const installRoot = 'C:/Program Files/Blender Foundation';
const installed = fs.existsSync(installRoot) ? fs.readdirSync(installRoot).sort().reverse()
  .map(folder => path.join(installRoot, folder, 'blender.exe')) : [];
const executable = [process.env.BLENDER_PATH, ...installed].find(candidate => candidate && fs.existsSync(candidate));
if (!executable) throw new Error('Set BLENDER_PATH to the full path of your Blender executable.');
const output = path.join(project, 'artifacts/blender');
fs.mkdirSync(output, { recursive: true });
const result = spawnSync(executable, [
  '--background', '--factory-startup', '--python', path.join(project, 'scripts/blender-inspect.py'), '--',
  '--project', project, '--output', path.join(output, 'inspection.json'), '--scene', path.join(output, 'inspection.blend'),
], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
fs.writeFileSync(path.join(output, 'inspection.log'), `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
if (result.error || result.status !== 0 || !result.stdout?.includes('BLENDER_INSPECTION_OK:')) {
  throw result.error ?? new Error(`Blender inspection failed; see ${output}/inspection.log`);
}
const report = JSON.parse(fs.readFileSync(path.join(output, 'inspection.json'), 'utf8'));
console.log(`Blender ${report.blender_version}: inspected ${report.assets.length} assets.`);
console.log(`Report: ${output}/inspection.json`);
console.log(`Scene: ${output}/inspection.blend`);
