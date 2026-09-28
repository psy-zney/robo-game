import fs from 'node:fs';

for (const name of ['Robot', 'Husky', 'Rat', 'home']) {
  const buffer = fs.readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
  console.log(JSON.stringify({
    name,
    animations: gltf.animations?.map(animation => ({
      name: animation.name,
      targets: [...new Set(animation.channels.map(channel =>
        `${gltf.nodes[channel.target.node]?.name ?? channel.target.node}.${channel.target.path}`))].slice(0, 12),
    })) ?? [],
    nodes: gltf.nodes?.map(node => node.name).filter(Boolean).slice(0, 35),
    skins: gltf.skins?.map(skin => ({ name: skin.name, joints: skin.joints.length })) ?? [],
  }, null, 2));
}
