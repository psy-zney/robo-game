"""Inspect source GLBs in isolated Blender scenes without changing game assets."""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def vector(value):
    return [round(component, 6) for component in value]


def mesh_bounds(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    vertices = []
    for obj in objects:
        if obj.type == 'MESH':
            evaluated = obj.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh()
            vertices.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
            evaluated.to_mesh_clear()
    if not vertices:
        return None
    minimum = Vector(tuple(min(point[axis] for point in vertices) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in vertices) for axis in range(3)))
    return {'min': vector(minimum), 'max': vector(maximum), 'size': vector(maximum - minimum)}


def inspect_asset(project, name):
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    bpy.ops.import_scene.gltf(filepath=str(project / 'public' / 'models' / f'{name}.glb'))
    objects = list(scene.objects)
    scene.frame_set(1)
    report = {
        'asset': name,
        'up_axis': 'Z (Blender; glTF imported from Y-up)',
        'bounds': mesh_bounds(objects),
        'objects': [{'name': obj.name, 'type': obj.type, 'parent': obj.parent.name if obj.parent else None,
                     'scale': vector(obj.scale)} for obj in objects],
        'meshes': [{'name': obj.name, 'vertices': len(obj.data.vertices), 'polygons': len(obj.data.polygons),
                    'materials': [material.name for material in obj.data.materials if material]}
                   for obj in objects if obj.type == 'MESH'],
        'armatures': [],
    }
    for armature in [obj for obj in objects if obj.type == 'ARMATURE']:
        rig = {
            'name': armature.name,
            'bones': [{'name': bone.name, 'parent': bone.parent.name if bone.parent else None,
                       'head': vector(armature.matrix_world @ bone.head_local),
                       'tail': vector(armature.matrix_world @ bone.tail_local)}
                      for bone in armature.data.bones],
            'clips': [],
        }
        animation = armature.animation_data
        if animation:
            original_action = animation.action
            original_slot = animation.action_slot
            tracks = list(animation.nla_tracks)
            original_mutes = [track.mute for track in tracks]
            for track in tracks:
                track.mute = True
            for track in tracks:
                for strip in track.strips:
                    if not strip.action:
                        continue
                    animation.action = strip.action
                    animation.action_slot = strip.action_slot
                    start, end = strip.action.frame_range
                    samples = []
                    for frame in [start, start + (end - start) * 0.25, (start + end) / 2,
                                  start + (end - start) * 0.75, end]:
                        scene.frame_set(int(frame), subframe=frame % 1)
                        bpy.context.view_layer.update()
                        pose = armature.evaluated_get(bpy.context.evaluated_depsgraph_get()).pose
                        contacts = [bone for bone in pose.bones if any(token in bone.name.lower()
                                    for token in ['foot', 'lowerleg', 'lowleg'])]
                        root = pose.bones.get('Body') or pose.bones[0]
                        samples.append({
                            'frame': round(frame, 3),
                            'root': vector(armature.matrix_world @ root.head),
                            'bounds': mesh_bounds(objects),
                            'feet': [{'bone': bone.name, 'head': vector(armature.matrix_world @ bone.head),
                                      'tail': vector(armature.matrix_world @ bone.tail)} for bone in contacts],
                        })
                    rig['clips'].append({'name': strip.action.name, 'frames': [start, end], 'samples': samples})
            animation.action = original_action
            if original_action:
                animation.action_slot = original_slot
            for track, muted in zip(tracks, original_mutes):
                track.mute = muted
        report['armatures'].append(rig)
    scene.frame_set(1)
    return report


parser = argparse.ArgumentParser()
parser.add_argument('--project', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--scene')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
project = Path(args.project).resolve()
output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
report = {'blender_version': bpy.app.version_string,
          'assets': [inspect_asset(project, name) for name in ['Robot', 'Husky', 'Rat', 'home']]}
output.write_text(json.dumps(report, indent=2), encoding='utf-8')
if args.scene:
    scene_path = Path(args.scene).resolve()
    scene_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.window.scene = bpy.data.scenes['Husky']
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
print(f'BLENDER_INSPECTION_OK: {output}')
